/**
 * Persisted COMPASS recommendation history.
 * Display reads this snapshot. It does not call a recommendation engine.
 * A missing original card list stays missing.
 */
import { isApproxCibilScoreBand, getApproxCibilScoreLabel } from "@/constants/cibil-score-master";
import { normalizeEcmEmploymentTypeId } from "@/constants/enterprise-contact-master";
import { validatedRequestedAmountRupees } from "@/lib/compass-customer-gateway/public-programme-commercials";
import {
  readCompassSelectedLender,
  readCompassSelectedLenders,
  type CompassSelectedLender,
} from "@/lib/compass-customer-gateway/borrower-lender-selection";
import {
  parseHomeLoanEntryAge,
  parseHomeLoanResidency,
  resolveCityMasterIdentity,
} from "@/lib/compass-customer-gateway/public-programme-match";
import { resolveContextCustomerFamily } from "@/lib/context-aware-data-collection";
import {
  CANONICAL_CONSTRUCTION_STATUSES,
  CANONICAL_PROPERTY_CATEGORIES,
} from "@/lib/lead-information/canonical-recommendation-facts";
import {
  buildCanonicalAssessmentSnapshot,
  evaluateCanonicalAssessmentSnapshot,
  type CanonicalAssessmentSources,
} from "@server/services/opportunity-assessment/canonical-snapshot";
import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";

export const COMPASS_RECOMMENDATION_VERSIONS_KEY = "compassRecommendationVersions";

const ORIGINAL_NOTE =
  "The original COMPASS lender list was not stored with this Opportunity. It cannot be reconstructed.";

export type CompassRecommendationHistoryCard = {
  lenderRef: string;
  displayName: string;
  rank: number;
  interestRateLabel: string | null;
  estimatedEmiLabel: string | null;
  tenureLabel: string | null;
  processingTimeLabel: string | null;
  tentativeOfferLabel: string | null;
  requestedAmountLabel: string | null;
  matchScore: number | null;
  programmeId: string | null;
  programmeVersion: number | null;
  explanation: string | null;
  customerSelected: boolean;
  /** Customer preference order. Recommendation rank stays on `rank`. */
  customerPreference: number | null;
};

export type CompassRecommendationSelectedLender = {
  lenderRef: string;
  lenderName: string;
  programmeRef: string;
  programmeVersion: number | null;
  interestRateLabel: string | null;
  estimatedEmiLabel: string | null;
  tenureLabel: string | null;
  processingTimeLabel: string | null;
  tentativeOfferLabel: string | null;
};

export type CompassRecommendationHistoryVersion = {
  versionNumber: number;
  title: string;
  kind: "compass_original" | "chanakya_recalculation";
  recordedAt: string | null;
  actorUserId: string | null;
  /** Directory name when the user registry can resolve the employee. */
  actorName: string | null;
  journeyVersion: number | null;
  recommendationBinding: string | null;
  assessment: Array<{ label: string; value: string }>;
  selectedLender: CompassRecommendationSelectedLender | null;
  /** Customer selection sequence. Preference 1 is also `selectedLender`. */
  selectedLenders: CompassRecommendationSelectedLender[];
  cards: CompassRecommendationHistoryCard[];
  note: string | null;
};

export type CompassRecommendationPrefill = {
  key: string;
  value: string;
  state?: string | null;
};

export type CompassRecommendationHistoryDto = {
  compassOrigin: boolean;
  originalListPersisted: boolean;
  versions: CompassRecommendationHistoryVersion[];
  prefill: CompassRecommendationPrefill[];
  missingFactKeys: string[];
};

type StoredSelection = CompassRecommendationSelectedLender & { selectedAt?: string | null };

type StoredVersion = {
  versionNumber: number;
  kind: "compass_original" | "chanakya_recalculation";
  recordedAt: string;
  actorUserId: string | null;
  journeyVersion: number | null;
  recommendationBinding: string | null;
  assessment: Array<{ label: string; value: string }>;
  customerSelectedLender: StoredSelection | null;
  customerSelectedLenders: StoredSelection[] | null;
  cards: Omit<CompassRecommendationHistoryCard, "customerSelected" | "customerPreference">[];
  note: string | null;
};

const ANSWER_LINES: ReadonlyArray<{ keys: readonly string[]; label: string }> = [
  { keys: ["incomeType", "employmentTypeCode"], label: "Employment" },
  { keys: ["loanAmount", "requestedAmountLabel"], label: "Requested amount" },
  { keys: ["monthlyIncome", "monthlyIncomeLabel"], label: "Monthly income" },
  { keys: ["existingEmi", "existingEmiLabel"], label: "Existing monthly obligations" },
  { keys: ["propertyValue", "propertyValueLabel"], label: "Property value" },
  { keys: ["propertyCity", "city"], label: "Property city" },
  { keys: ["propertyType"], label: "Property type" },
  { keys: ["propertyUsage"], label: "Property use" },
  { keys: ["loanPurpose"], label: "Purpose" },
  { keys: ["propertyCategory"], label: "Property category" },
  { keys: ["constructionStatus"], label: "Construction status" },
  { keys: ["residency", "assessment:borrower.residency"], label: "Residency" },
  { keys: ["ageYears", "assessment:borrower.ageYears"], label: "Age" },
  { keys: ["approxCibilScore"], label: "CIBIL" },
  { keys: ["tenureMonths", "requestedTenure", "tenure"], label: "Requested tenure" },
  { keys: ["currentLender", "currentLendingInstitution"], label: "Current lender" },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const raw = text(value);
  return raw || null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rupees(value: unknown): number | null {
  return validatedRequestedAmountRupees(value);
}

function obligationRupees(value: unknown): number | null {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (digits === "0") return 0;
  return rupees(value);
}

function inr(value: number | null): string | null {
  if (value == null) return null;
  return `₹${value.toLocaleString("en-IN")}`;
}

function answerRecord(snapshot: Record<string, unknown>): Record<string, unknown> {
  const answers = asRecord(snapshot.compassAnswers) ?? {};
  const borrower = asRecord(snapshot.compassBorrowerFields) ?? {};
  const product = asRecord(snapshot.compassProductFields) ?? {};
  return { ...borrower, ...product, ...answers };
}

function displayValue(label: string, raw: string): string {
  if (label === "Property city") {
    const city = resolveCityMasterIdentity(raw);
    return city ? `${city.city}, ${city.state}` : raw;
  }
  if (label === "CIBIL" && isApproxCibilScoreBand(raw)) return getApproxCibilScoreLabel(raw);
  if (raw.includes("@")) return "";
  return raw;
}

export function assessmentLinesFromAnswers(
  answers: { [key: string]: unknown } | null,
): Array<{ label: string; value: string }> {
  if (!answers) return [];
  const lines: Array<{ label: string; value: string }> = [];
  for (const row of ANSWER_LINES) {
    const raw = row.keys.map((key) => text(answers[key])).find(Boolean);
    if (!raw) continue;
    const value = displayValue(row.label, raw);
    if (!value) continue;
    lines.push({ label: row.label, value });
  }
  return lines;
}

function firstAnswer(answers: Record<string, unknown>, keys: readonly string[]): string {
  return keys.map((key) => text(answers[key])).find(Boolean) ?? "";
}

function member(values: readonly string[], raw: string): string | null {
  const value = raw.trim();
  return values.includes(value) ? value : null;
}

export function isCompassOriginSnapshot(snapshot: unknown): boolean {
  const row = asRecord(snapshot);
  if (!row) return false;
  if (asRecord(row.compassAnswers)) return true;
  if (asRecord(row.compassSelectedLender)) return true;
  if (text(row.compassChannel)) return true;
  if (text(row.compassProductCode)) return true;
  return Array.isArray(row[COMPASS_RECOMMENDATION_VERSIONS_KEY]) && row[COMPASS_RECOMMENDATION_VERSIONS_KEY].length > 0;
}

function readStored(snapshot: Record<string, unknown>): StoredVersion[] {
  const raw = snapshot[COMPASS_RECOMMENDATION_VERSIONS_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const row = asRecord(item);
    if (!row) return [];
    const kind = row.kind === "compass_original" || row.kind === "chanakya_recalculation" ? row.kind : null;
    const versionNumber = integer(row.versionNumber);
    if (!kind || versionNumber == null || versionNumber < 1) return [];
    return [{
      versionNumber,
      kind,
      recordedAt: text(row.recordedAt),
      actorUserId: nullableText(row.actorUserId),
      journeyVersion: integer(row.journeyVersion),
      recommendationBinding: nullableText(row.recommendationBinding),
      assessment: assessmentArray(row.assessment),
      customerSelectedLender: selectionRecord(row.customerSelectedLender),
      customerSelectedLenders: selectionList(row.customerSelectedLenders),
      cards: cardArray(row.cards),
      note: nullableText(row.note),
    }];
  });
}

function assessmentArray(value: unknown): Array<{ label: string; value: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = asRecord(item);
    const label = row ? text(row.label) : "";
    const line = row ? text(row.value) : "";
    return label && line ? [{ label, value: line }] : [];
  });
}

function selectionRecord(value: unknown): StoredSelection | null {
  const row = asRecord(value);
  if (!row) return null;
  const lenderRef = text(row.lenderRef);
  const lenderName = text(row.lenderName);
  const programmeRef = text(row.programmeRef);
  if (!lenderRef || !lenderName || !programmeRef) return null;
  return {
    lenderRef,
    lenderName,
    programmeRef,
    programmeVersion: integer(row.programmeVersion),
    interestRateLabel: nullableText(row.interestRateLabel),
    estimatedEmiLabel: nullableText(row.estimatedEmiLabel),
    tenureLabel: nullableText(row.tenureLabel),
    processingTimeLabel: nullableText(row.processingTimeLabel),
    tentativeOfferLabel: nullableText(row.tentativeOfferLabel),
    selectedAt: nullableText(row.selectedAt),
  };
}

function selectionList(value: unknown): StoredSelection[] | null {
  if (!Array.isArray(value)) return null;
  const lenders: StoredSelection[] = [];
  for (const item of value) {
    const lender = selectionRecord(item);
    if (!lender) continue;
    lenders.push(lender);
    if (lenders.length === 3) break;
  }
  return lenders;
}

function cardArray(value: unknown): StoredVersion["cards"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const card = publicCard(item);
    return card ? [card] : [];
  });
}

function publicCard(value: unknown): StoredVersion["cards"][number] | null {
  const row = asRecord(value);
  if (!row) return null;
  const displayName = text(row.displayName);
  const rank = integer(row.rank);
  if (!displayName || rank == null || rank < 1) return null;
  return {
    lenderRef: text(row.lenderRef),
    displayName,
    rank,
    interestRateLabel: nullableText(row.interestRateLabel),
    estimatedEmiLabel: nullableText(row.estimatedEmiLabel),
    tenureLabel: nullableText(row.tenureLabel),
    processingTimeLabel: nullableText(row.processingTimeLabel),
    tentativeOfferLabel: nullableText(row.tentativeOfferLabel),
    requestedAmountLabel: nullableText(row.requestedAmountLabel),
    matchScore: finiteNumber(row.matchScore),
    programmeId: nullableText(row.programmeId),
    programmeVersion: integer(row.programmeVersion),
    explanation: nullableText(row.whyThisRecommendation) ?? nullableText(row.explanation) ?? firstReason(row.reasons),
  };
}

function firstReason(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const reason = value.map((item) => text(item)).find(Boolean);
  return reason ?? null;
}

function selectionFrom(lender: CompassSelectedLender, selectedAt: string): StoredSelection {
  return {
    lenderRef: lender.lenderRef,
    lenderName: lender.lenderName,
    programmeRef: lender.programmeRef,
    programmeVersion: lender.programmeVersion,
    interestRateLabel: nullableText(lender.interestRateLabel),
    estimatedEmiLabel: nullableText(lender.estimatedEmiLabel),
    tenureLabel: nullableText(lender.tenureLabel),
    processingTimeLabel: nullableText(lender.processingTimeLabel),
    tentativeOfferLabel: nullableText(lender.tentativeOfferLabel),
    selectedAt,
  };
}

function blank(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim() === "");
}

export function compassRecalculatePatch(
  snapshot: unknown,
  sources: CanonicalAssessmentSources,
): { columns: Record<string, string | number>; lending: Record<string, string> } {
  const row = asRecord(snapshot);
  const columns: Record<string, string | number> = {};
  const lending: Record<string, string> = {};
  if (!row) return { columns, lending };
  const answers = answerRecord(row);
  const employment = blank(sources.employmentTypeCode)
    ? normalizeEcmEmploymentTypeId(firstAnswer(answers, ["employmentTypeCode", "incomeType"]))
    : null;
  if (employment) columns.employmentTypeCode = employment;
  const family = resolveContextCustomerFamily(employment ?? sources.employmentTypeCode);
  if (family === "salaried" && blank(sources.monthlyIncomeRupees)) {
    const income = rupees(firstAnswer(answers, ["monthlyIncome", "monthlyIncomeLabel"]));
    if (income != null) columns.monthlyIncomeRupees = income;
  }
  if (sources.existingMonthlyObligationsRupees == null) {
    const obligations = obligationRupees(firstAnswer(answers, ["existingEmi", "existingEmiLabel"]));
    if (obligations != null) columns.existingMonthlyObligationsRupees = obligations;
  }
  if (blank(sources.propertyValueRupees)) {
    const propertyValue = rupees(firstAnswer(answers, ["propertyValue", "propertyValueLabel"]));
    if (propertyValue != null) columns.propertyValueRupees = propertyValue;
  }
  if (blank(sources.requestedAmount)) {
    const requested = rupees(firstAnswer(answers, ["loanAmount", "requestedAmountLabel"]));
    if (requested != null) columns.requestedAmount = requested;
  }
  if (blank(sources.propertyCategory)) {
    const category = member(CANONICAL_PROPERTY_CATEGORIES, firstAnswer(answers, ["propertyCategory"]));
    if (category) columns.propertyCategory = category;
  }
  if (blank(sources.constructionStatus)) {
    const status = member(CANONICAL_CONSTRUCTION_STATUSES, firstAnswer(answers, ["constructionStatus"]));
    if (status) columns.constructionStatus = status;
  }
  if (blank(sources.residency)) {
    const residency = parseHomeLoanResidency(firstAnswer(answers, ["residency", "assessment:borrower.residency"]));
    if (residency) columns.residency = residency;
  }
  if (sources.borrowerAgeYears == null) {
    const age = parseHomeLoanEntryAge(firstAnswer(answers, ["ageYears", "assessment:borrower.ageYears"]));
    if (age != null) columns.borrowerAgeYears = age;
  }
  if (blank(sources.cityLabel)) {
    const city = resolveCityMasterIdentity(firstAnswer(answers, ["propertyCity", "city"]));
    if (city) {
      columns.cityLabel = city.city;
      if (blank(sources.stateLabel)) columns.stateLabel = city.state;
    }
  }
  if (blank(sources.approxCibilScore)) {
    const cibil = firstAnswer(answers, ["approxCibilScore"]);
    if (isApproxCibilScoreBand(cibil)) lending.approxCibilScore = cibil;
  }
  return { columns, lending };
}

function overlaidSources(snapshot: unknown, sources: CanonicalAssessmentSources): CanonicalAssessmentSources {
  const patch = compassRecalculatePatch(snapshot, sources);
  const columns = patch.columns;
  return {
    ...sources,
    employmentTypeCode: typeof columns.employmentTypeCode === "string" ? columns.employmentTypeCode : sources.employmentTypeCode,
    monthlyIncomeRupees: columns.monthlyIncomeRupees ?? sources.monthlyIncomeRupees,
    existingMonthlyObligationsRupees: columns.existingMonthlyObligationsRupees ?? sources.existingMonthlyObligationsRupees,
    propertyValueRupees: columns.propertyValueRupees ?? sources.propertyValueRupees,
    requestedAmount: columns.requestedAmount ?? sources.requestedAmount,
    propertyCategory: typeof columns.propertyCategory === "string" ? columns.propertyCategory : sources.propertyCategory,
    constructionStatus: typeof columns.constructionStatus === "string" ? columns.constructionStatus : sources.constructionStatus,
    residency: typeof columns.residency === "string" ? columns.residency : sources.residency,
    borrowerAgeYears: typeof columns.borrowerAgeYears === "number" ? columns.borrowerAgeYears : sources.borrowerAgeYears,
    cityLabel: typeof columns.cityLabel === "string" ? columns.cityLabel : sources.cityLabel,
    stateLabel: typeof columns.stateLabel === "string" ? columns.stateLabel : sources.stateLabel,
    approxCibilScore: sources.approxCibilScore ?? patch.lending.approxCibilScore ?? null,
  };
}

function prefillFrom(snapshot: unknown, sources: CanonicalAssessmentSources): CompassRecommendationPrefill[] {
  const overlaid = overlaidSources(snapshot, sources);
  const rows: CompassRecommendationPrefill[] = [];
  const add = (key: string, value: string | number | null | undefined, state?: string | null) => {
    if (value == null || value === "") return;
    rows.push({ key, value: String(value), ...(state ? { state } : {}) });
  };
  add("borrower.employmentFamily", overlaid.employmentTypeCode);
  add("incomeAndObligations.monthlyIncome", blank(overlaid.monthlyIncomeRupees) ? null : String(overlaid.monthlyIncomeRupees));
  if (overlaid.existingMonthlyObligationsRupees != null) {
    add("incomeAndObligations.existingMonthlyObligations", String(overlaid.existingMonthlyObligationsRupees));
  }
  add("property.propertyValue", blank(overlaid.propertyValueRupees) ? null : String(overlaid.propertyValueRupees));
  add("loanRequirement.requestedAmount", blank(overlaid.requestedAmount) ? null : String(overlaid.requestedAmount));
  add("property.propertyCategory", overlaid.propertyCategory);
  add("property.constructionStatus", overlaid.constructionStatus);
  add("borrower.residency", overlaid.residency);
  add("borrower.ageYears", overlaid.borrowerAgeYears);
  add("cibil.kind", overlaid.approxCibilScore);
  if (overlaid.cityLabel) add("property.propertyCity", overlaid.cityLabel, overlaid.stateLabel);
  return rows;
}

function missingKeys(snapshot: unknown, sources: CanonicalAssessmentSources): string[] {
  const overlaid = overlaidSources(snapshot, sources);
  const evaluation = evaluateCanonicalAssessmentSnapshot(
    buildCanonicalAssessmentSnapshot(overlaid),
    overlaid,
  );
  return evaluation.missingFactKeys;
}

function displaySelection(source: StoredSelection): CompassRecommendationSelectedLender {
  return {
    lenderRef: source.lenderRef,
    lenderName: source.lenderName,
    programmeRef: source.programmeRef,
    programmeVersion: source.programmeVersion,
    interestRateLabel: source.interestRateLabel,
    estimatedEmiLabel: source.estimatedEmiLabel,
    tenureLabel: source.tenureLabel,
    processingTimeLabel: source.processingTimeLabel,
    tentativeOfferLabel: source.tentativeOfferLabel,
  };
}

function presentSelections(
  snapshot: Record<string, unknown>,
  stored: StoredSelection | null,
  storedList: StoredSelection[] | null,
): CompassRecommendationSelectedLender[] {
  if (storedList) return storedList.map(displaySelection);
  if (stored) return [displaySelection(stored)];
  return readCompassSelectedLenders(snapshot).map((lender) => displaySelection({
    ...lender,
    interestRateLabel: lender.interestRateLabel ?? null,
    estimatedEmiLabel: lender.estimatedEmiLabel ?? null,
    tenureLabel: lender.tenureLabel ?? null,
    processingTimeLabel: lender.processingTimeLabel ?? null,
    tentativeOfferLabel: lender.tentativeOfferLabel ?? null,
  }));
}

function cardMatchesSelection(
  card: StoredVersion["cards"][number],
  selected: CompassRecommendationSelectedLender,
): boolean {
  return (card.lenderRef !== "" && card.lenderRef === selected.lenderRef && (card.programmeId == null || card.programmeId === selected.programmeRef))
    || (card.lenderRef === "" && card.displayName === selected.lenderName);
}

function cardsWithSelection(
  cards: StoredVersion["cards"],
  selected: readonly CompassRecommendationSelectedLender[],
): CompassRecommendationHistoryCard[] {
  return cards.map((card) => {
    const preference = selected.findIndex((item) => cardMatchesSelection(card, item));
    return {
      ...card,
      customerSelected: preference >= 0,
      customerPreference: preference >= 0 ? preference + 1 : null,
    };
  });
}

function toDisplay(version: StoredVersion, selected: readonly CompassRecommendationSelectedLender[]): CompassRecommendationHistoryVersion {
  const title = version.kind === "compass_original"
    ? "Recommendation 1 — Original COMPASS"
    : `Recommendation ${version.versionNumber} — CHANAKYA Recalculation`;
  const preferences = version.kind === "compass_original" ? selected : [];
  return {
    versionNumber: version.versionNumber,
    title,
    kind: version.kind,
    recordedAt: version.recordedAt || null,
    actorUserId: version.actorUserId,
    actorName: null,
    journeyVersion: version.journeyVersion,
    recommendationBinding: version.recommendationBinding,
    assessment: version.assessment,
    selectedLender: preferences[0] ?? null,
    selectedLenders: [...preferences],
    cards: cardsWithSelection(version.cards, preferences),
    note: version.note,
  };
}

export function projectCompassRecommendationHistory(
  snapshot: unknown,
  sources: CanonicalAssessmentSources | null = null,
): CompassRecommendationHistoryDto {
  const empty: CompassRecommendationHistoryDto = {
    compassOrigin: false,
    originalListPersisted: false,
    versions: [],
    prefill: [],
    missingFactKeys: [],
  };
  const row = asRecord(snapshot);
  if (!row || !isCompassOriginSnapshot(row)) return empty;
  const stored = readStored(row);
  const original = stored.find((version) => version.kind === "compass_original") ?? null;
  const selected = presentSelections(
    row,
    original?.customerSelectedLender ?? null,
    original?.customerSelectedLenders ?? null,
  );
  const versions: CompassRecommendationHistoryVersion[] = [];
  if (original) {
    versions.push(toDisplay(original, selected));
  } else {
    versions.push({
      versionNumber: 1,
      title: "Recommendation 1 — Original COMPASS",
      kind: "compass_original",
      recordedAt: nullableText(row.compassUpdatedAt),
      actorUserId: null,
      actorName: null,
      journeyVersion: integer(row.compassJourneyVersion),
      recommendationBinding: null,
      assessment: assessmentLinesFromAnswers(answerRecord(row)),
      selectedLender: selected[0] ?? null,
      selectedLenders: selected,
      cards: [],
      note: ORIGINAL_NOTE,
    });
  }
  for (const version of stored.filter((item) => item.kind === "chanakya_recalculation")) {
    versions.push(toDisplay(version, []));
  }
  versions.sort((a, b) => a.versionNumber - b.versionNumber);
  return {
    compassOrigin: true,
    originalListPersisted: original != null,
    versions,
    prefill: sources ? prefillFrom(row, sources) : [],
    missingFactKeys: sources ? missingKeys(row, sources) : [],
  };
}

export function rememberOriginalCompassRecommendation(
  snapshot: unknown,
  input: {
    recordedAt: string;
    journeyVersion: number | null;
    recommendationBinding: string | null;
    cards: readonly unknown[];
    answers: { [key: string]: string | number | boolean | null | undefined } | null;
    status: string;
  },
): { snapshot: Record<string, unknown>; changed: boolean } {
  const row = asRecord(snapshot) ?? {};
  if (input.status !== "ready") return { snapshot: row, changed: false };
  if (readStored(row).some((version) => version.kind === "compass_original")) {
    return { snapshot: row, changed: false };
  }
  const cards = input.cards.flatMap((card) => {
    const stored = publicCard(card);
    return stored ? [stored] : [];
  });
  if (input.cards.length > 0 && cards.length === 0) return { snapshot: row, changed: false };
  const version: StoredVersion = {
    versionNumber: 1,
    kind: "compass_original",
    recordedAt: input.recordedAt,
    actorUserId: null,
    journeyVersion: input.journeyVersion,
    recommendationBinding: nullableText(input.recommendationBinding),
    assessment: assessmentLinesFromAnswers(input.answers),
    customerSelectedLender: selectionRecord(readCompassSelectedLender(row)),
    customerSelectedLenders: selectionList(readCompassSelectedLenders(row)),
    cards,
    note: null,
  };
  return {
    snapshot: { ...row, [COMPASS_RECOMMENDATION_VERSIONS_KEY]: [...readStored(row), version] },
    changed: true,
  };
}

export function stampCompassCustomerSelection(
  snapshot: Record<string, unknown>,
  lender: CompassSelectedLender | readonly CompassSelectedLender[] | null,
  selectedAt: string,
): Record<string, unknown> {
  const lenders = lender == null ? [] : Array.isArray(lender) ? [...lender] : [lender];
  const versions = readStored(snapshot);
  const index = versions.findIndex((version) => version.kind === "compass_original");
  if (index < 0) return snapshot;
  const existing = versions[index];
  if (!existing) return snapshot;
  const currentList = existing.customerSelectedLenders
    ?? (existing.customerSelectedLender ? [existing.customerSelectedLender] : []);
  const unchanged = currentList.length === lenders.length && currentList.every((item, itemIndex) => {
    const next = lenders[itemIndex];
    return Boolean(
      next
      && item.lenderRef === next.lenderRef
      && item.programmeRef === next.programmeRef
      && item.lenderName === next.lenderName,
    );
  });
  if (unchanged) return snapshot;
  const stored = lenders.map((item) => selectionFrom(item, selectedAt));
  const next = versions.slice();
  next[index] = {
    ...existing,
    customerSelectedLender: stored[0] ?? null,
    customerSelectedLenders: stored,
  };
  return { ...snapshot, [COMPASS_RECOMMENDATION_VERSIONS_KEY]: next };
}

export function appendChanakyaRecalculation(
  snapshot: unknown,
  input: {
    recordedAt: string;
    actorUserId: string;
    assessment: Array<{ label: string; value: string }>;
    cards: readonly unknown[];
    note: string | null;
  },
): { snapshot: Record<string, unknown>; changed: boolean } {
  const row = asRecord(snapshot) ?? {};
  const versions = readStored(row);
  const versionNumber = versions.reduce((max, version) => Math.max(max, version.versionNumber), 1) + 1;
  const version: StoredVersion = {
    versionNumber,
    kind: "chanakya_recalculation",
    recordedAt: input.recordedAt,
    actorUserId: input.actorUserId,
    journeyVersion: null,
    recommendationBinding: "governed_chanakya",
    assessment: input.assessment.filter((line) => line.label.trim() && line.value.trim()),
    customerSelectedLender: null,
    customerSelectedLenders: null,
    cards: input.cards.flatMap((card) => {
      const stored = publicCard(card);
      return stored ? [stored] : [];
    }),
    note: nullableText(input.note),
  };
  return {
    snapshot: { ...row, [COMPASS_RECOMMENDATION_VERSIONS_KEY]: [...versions, version] },
    changed: true,
  };
}

export function cardsFromGovernedResult(result: CanonicalLenderRecommendationResult | null): StoredVersion["cards"] {
  if (!result || result.status !== "ready") return [];
  return result.recommendations.flatMap((card, index) => {
    const rank = card.matchRank ?? index + 1;
    if (!card.lenderName || rank < 1) return [];
    return [{
      lenderRef: card.lenderId ? `lender:${card.lenderId}` : "",
      displayName: card.lenderName,
      rank,
      interestRateLabel: card.applicableRoiPercent != null ? `${card.applicableRoiPercent}%` : null,
      estimatedEmiLabel: inr(card.indicativeEmiRupees),
      tenureLabel: card.tenureMonths != null ? `${card.tenureMonths} months` : null,
      processingTimeLabel: null,
      tentativeOfferLabel: inr(card.tentativeOfferRupees),
      requestedAmountLabel: inr(card.requiredAmountRupees),
      matchScore: card.matchPercent,
      programmeId: card.policyId || null,
      programmeVersion: card.policyVersionNumber,
      explanation: card.customerExplanation || null,
    }];
  });
}

export function linesFromCanonicalSources(sources: CanonicalAssessmentSources): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = [];
  const add = (label: string, value: string | null) => {
    if (value) lines.push({ label, value });
  };
  add("Employment", nullableText(sources.employmentTypeCode));
  add("Requested amount", inr(rupees(sources.requestedAmount)));
  add("Monthly income", inr(rupees(sources.monthlyIncomeRupees)));
  if (sources.existingMonthlyObligationsRupees != null) {
    const obligations = obligationRupees(sources.existingMonthlyObligationsRupees);
    if (obligations != null) add("Existing monthly obligations", obligations === 0 ? "0" : inr(obligations) ?? "");
  }
  add("Property value", inr(rupees(sources.propertyValueRupees)));
  add("Property city", sources.cityLabel ? [sources.cityLabel, sources.stateLabel].filter(Boolean).join(", ") : null);
  add("Property category", nullableText(sources.propertyCategory));
  add("Construction status", nullableText(sources.constructionStatus));
  add("Residency", nullableText(sources.residency));
  add("Age", sources.borrowerAgeYears != null ? String(sources.borrowerAgeYears) : null);
  add("CIBIL", sources.approxCibilScore && isApproxCibilScoreBand(sources.approxCibilScore)
    ? getApproxCibilScoreLabel(sources.approxCibilScore)
    : null);
  return lines;
}
