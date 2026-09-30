/**
 * System Assessment snapshot from persisted Opportunity / Contact facts.
 * Does not read browser drafts, FCM values, or localStorage.
 */

import { isHlbtCanonicalFactJourney } from "@/lib/lead-information/canonical-recommendation-facts";
import { resolveContextCustomerFamily } from "@/lib/context-aware-data-collection";
import { emptyOpportunityAssessmentFacts } from "@/lib/opportunity-assessment/empty-facts";
import { parseExactMoney, parseExactPercent } from "@/lib/product-programme-operations/money";
import { canonicalizeRecommendationProductCode } from "@/lib/product-recommendation/product-code";
import { bootstrapProductJourneyFields } from "@/constants/product-journey/bootstrap";
import { mandatoryRecommendationFields } from "@/lib/product-journey/applicability";
import {
  assessmentPathForJourneyField,
  journeyFieldIsSatisfied,
  missingJourneyFieldLabels,
} from "@/lib/product-journey/readiness-fields";
import {
  ASSESSMENT_EXPECTED_CIBIL_BANDS,
  type AssessmentExpectedCibilBand,
  type AssessmentFact,
  type OpportunityAssessmentFactsV1,
} from "@/types/opportunity-assessment";
import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";
import { OpportunityAssessmentError } from "./errors";
import { mapFinalizedAssessmentFactsToCanonical } from "./map-to-canonical";
import { deriveOpportunityAssessmentReadiness } from "./readiness";

export type CanonicalAssessmentSources = {
  opportunityId: string;
  productCode?: string | null;
  transactionType?: string | null;
  employmentTypeCode?: string | null;
  requestedAmount?: number | string | null;
  requestedTenureMonths?: number | null;
  monthlyIncomeRupees?: number | string | null;
  existingMonthlyObligationsRupees?: number | string | null;
  propertyValueRupees?: number | string | null;
  propertyCategory?: string | null;
  constructionStatus?: string | null;
  residency?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  dateOfBirth?: string | null;
  contactId?: string | null;
  approxCibilScore?: string | null;
  btAmount?: number | string | null;
  btInstitutionId?: string | null;
  btInstitutionName?: string | null;
  currentRoiPercent?: number | string | null;
  currentHomeLoanEmiRupees?: number | string | null;
  remainingTenureMonths?: number | null;
  loanStartDate?: string | null;
  repaymentTrack?: string | null;
  delayedEmiCount?: number | null;
  rowVersion?: number | null;
};

export type CanonicalSnapshotPanel =
  | "information_required"
  | "unsupported"
  | "blocked"
  | "complete";

export type CanonicalSnapshotEvaluation = {
  facts: OpportunityAssessmentFactsV1;
  journeyFields: ProductJourneyFieldRow[];
  readinessStatus: ReturnType<typeof deriveOpportunityAssessmentReadiness>["readinessStatus"];
  unsupportedReasonCode: string | null;
  failureCode: string | null;
  missingFactKeys: string[];
  missingLabels: string[];
  executable: boolean;
  revisionKind: "SAVED" | "FINALIZED";
  panel: CanonicalSnapshotPanel;
};

function known<T>(
  value: T,
  entityType: string,
  entityId: string | null,
  fieldKey: string,
  extra: Partial<AssessmentFact<T>> = {},
): AssessmentFact<T> {
  return {
    value,
    state: extra.state ?? "known",
    sourceChannel: extra.sourceChannel ?? "OPPORTUNITY",
    sourceEntityType: entityType,
    sourceEntityId: entityId,
    sourceFieldKey: fieldKey,
    sourceUpdatedAt: null,
    capturedByUserId: null,
    capturedAt: null,
    effectiveAt: null,
    confirmedByUserId: null,
    confirmedAt: null,
    certainty: extra.certainty ?? "exact",
    knownZeroDeclared: extra.knownZeroDeclared,
    evidenceRef: null,
  };
}

function money(value: number | string | null | undefined, field: string, allowZero: boolean): string | null {
  if (value == null || value === "") return null;
  const text =
    typeof value === "number"
      ? Number.isInteger(value)
        ? String(value)
        : value.toFixed(2)
      : String(value).trim();
  try {
    const parsed = parseExactMoney(text, field);
    if (!parsed || parsed.startsWith("-")) return null;
    if (!allowZero && parsed === "0.00") return null;
    return parsed;
  } catch {
    return null;
  }
}

function percent(value: number | string | null | undefined): string | null {
  if (value == null || value === "") return null;
  const text = typeof value === "number" ? value.toFixed(4) : String(value).trim();
  try {
    const parsed = parseExactPercent(text, "currentRoiPercent");
    if (!parsed || parsed.startsWith("-") || parsed === "0.000000") return null;
    return parsed;
  } catch {
    return null;
  }
}

function calendarDate(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const [year, month, day] = match[1].split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return null;
  }
  return match[1];
}

function isBand(value: string): value is AssessmentExpectedCibilBand {
  return (ASSESSMENT_EXPECTED_CIBIL_BANDS as readonly string[]).includes(value);
}

function assessmentProduct(code: string | null | undefined): "HOME_LOAN" | "HOME_LOAN_BT" | null {
  const canonical = canonicalizeRecommendationProductCode(code);
  if (canonical === "HOME_LOAN" || canonical === "HOME_LOAN_BT") return canonical;
  return null;
}

export function canonicalSnapshotSignature(facts: OpportunityAssessmentFactsV1): string {
  const walk = (section: object) =>
    Object.entries(section).map(([key, fact]) => {
      const row = fact as AssessmentFact<unknown>;
      return `${key}:${row.state}:${row.value ?? ""}:${row.knownZeroDeclared === true ? "z" : ""}`;
    });
  return [
    ...walk(facts.borrower),
    ...walk(facts.incomeAndObligations),
    ...walk(facts.loanRequirement),
    ...walk(facts.property),
    ...walk(facts.cibil),
    ...walk(facts.balanceTransfer),
  ].join("|");
}

export function buildCanonicalAssessmentSnapshot(
  sources: CanonicalAssessmentSources,
): OpportunityAssessmentFactsV1 {
  const facts = emptyOpportunityAssessmentFacts();
  const opportunityId = sources.opportunityId;
  const product = assessmentProduct(sources.productCode);
  const family = resolveContextCustomerFamily(sources.employmentTypeCode);
  const hlbt = isHlbtCanonicalFactJourney(product, sources.transactionType);

  if (product) {
    facts.loanRequirement.productCode = known(
      product,
      "EnterpriseOpportunity",
      opportunityId,
      "productCode",
    );
  }
  if (product === "HOME_LOAN_BT" || (product === "HOME_LOAN" && sources.transactionType === "balance_transfer")) {
    facts.loanRequirement.transactionType = known(
      "balance_transfer",
      "EnterpriseOpportunity",
      opportunityId,
      "transactionType",
    );
  }

  const amount = money(sources.requestedAmount, "requestedAmount", false);
  if (amount) {
    facts.loanRequirement.requestedAmount = known(amount, "EnterpriseOpportunity", opportunityId, "requestedAmount");
  }

  if (sources.employmentTypeCode?.trim() && (family === "salaried" || family === "self_employed")) {
    facts.borrower.employmentFamily = known(family, "EnterpriseOpportunity", opportunityId, "employmentTypeCode");
    facts.borrower.employmentTypeCode = known(
      sources.employmentTypeCode.trim(),
      "EnterpriseOpportunity",
      opportunityId,
      "employmentTypeCode",
    );
  }

  if (family === "salaried") {
    const income = money(sources.monthlyIncomeRupees, "monthlyIncomeRupees", false);
    if (income) {
      facts.incomeAndObligations.monthlyIncome = known(
        income,
        "EnterpriseOpportunity",
        opportunityId,
        "monthlyIncomeRupees",
      );
    }
  }

  if (sources.existingMonthlyObligationsRupees != null && sources.existingMonthlyObligationsRupees !== "") {
    const obligations = money(sources.existingMonthlyObligationsRupees, "existingMonthlyObligationsRupees", true);
    if (obligations) {
      facts.incomeAndObligations.existingMonthlyObligations = known(
        obligations,
        "EnterpriseOpportunity",
        opportunityId,
        "existingMonthlyObligationsRupees",
        { knownZeroDeclared: obligations === "0.00" },
      );
    }
  }

  if (sources.requestedTenureMonths != null && sources.requestedTenureMonths > 0) {
    facts.incomeAndObligations.requestedTenureMonths = known(
      sources.requestedTenureMonths,
      "EnterpriseOpportunity",
      opportunityId,
      "requestedTenureMonths",
    );
  }

  const propertyValue = money(sources.propertyValueRupees, "propertyValueRupees", false);
  if (propertyValue) {
    facts.property.propertyValue = known(propertyValue, "EnterpriseOpportunity", opportunityId, "propertyValueRupees");
  }
  if (sources.propertyCategory?.trim()) {
    facts.property.propertyCategory = known(
      sources.propertyCategory.trim(),
      "EnterpriseOpportunity",
      opportunityId,
      "propertyCategory",
    );
  }
  if (sources.constructionStatus?.trim()) {
    facts.property.constructionStatus = known(
      sources.constructionStatus.trim(),
      "EnterpriseOpportunity",
      opportunityId,
      "constructionStatus",
    );
  }
  if (sources.residency?.trim()) {
    facts.borrower.residency = known(sources.residency.trim(), "EnterpriseOpportunity", opportunityId, "residency");
  }
  if (sources.cityLabel?.trim()) {
    const city = sources.cityLabel.trim();
    facts.borrower.journeyCity = known(city, "EnterpriseOpportunity", opportunityId, "cityLabel");
    facts.property.propertyCity = known(city, "EnterpriseOpportunity", opportunityId, "cityLabel");
  }
  if (sources.stateLabel?.trim()) {
    const state = sources.stateLabel.trim();
    facts.borrower.journeyState = known(state, "EnterpriseOpportunity", opportunityId, "stateLabel");
    facts.property.propertyState = known(state, "EnterpriseOpportunity", opportunityId, "stateLabel");
  }

  const dob = calendarDate(sources.dateOfBirth);
  if (dob && sources.contactId?.trim()) {
    facts.borrower.dateOfBirth = known(dob, "EcmContact", sources.contactId.trim(), "dateOfBirth", {
      sourceChannel: "CONTACT",
    });
  }

  const cibil = sources.approxCibilScore?.trim() ?? "";
  if (cibil === "not_known") {
    facts.cibil.kind = known("explicitly_unknown", "EnterpriseOpportunity", opportunityId, "approxCibilScore", {
      certainty: "not_known",
    });
  } else if (cibil && isBand(cibil)) {
    facts.cibil.kind = known("expected_band", "EnterpriseOpportunity", opportunityId, "approxCibilScore", {
      certainty: "approximate",
    });
    facts.cibil.expectedBand = known(cibil, "EnterpriseOpportunity", opportunityId, "approxCibilScore", {
      certainty: "approximate",
    });
  }

  if (hlbt) {
    const outstanding = money(sources.btAmount, "btAmount", false);
    if (outstanding) {
      facts.balanceTransfer.outstandingPrincipal = known(
        outstanding,
        "EnterpriseOpportunity",
        opportunityId,
        "lendingExtension.btAmount",
      );
    }
    const lender = sources.btInstitutionName?.trim() || sources.btInstitutionId?.trim() || "";
    if (lender) {
      facts.balanceTransfer.existingLenderInstitution = known(
        lender,
        "EnterpriseOpportunity",
        opportunityId,
        sources.btInstitutionName?.trim() ? "lendingExtension.btInstitutionName" : "lendingExtension.btInstitutionId",
      );
    }
    const roi = percent(sources.currentRoiPercent);
    if (roi) {
      facts.balanceTransfer.currentRoiPercent = known(roi, "EnterpriseOpportunity", opportunityId, "currentRoiPercent");
    }
    const emi = money(sources.currentHomeLoanEmiRupees, "currentHomeLoanEmiRupees", false);
    if (emi) {
      facts.balanceTransfer.currentHomeLoanEmi = known(
        emi,
        "EnterpriseOpportunity",
        opportunityId,
        "currentHomeLoanEmiRupees",
      );
    }
    if (sources.remainingTenureMonths != null && sources.remainingTenureMonths > 0) {
      facts.balanceTransfer.remainingTenureMonths = known(
        sources.remainingTenureMonths,
        "EnterpriseOpportunity",
        opportunityId,
        "remainingTenureMonths",
      );
    }
    const start = calendarDate(sources.loanStartDate);
    if (start) {
      facts.balanceTransfer.loanStartDate = known(start, "EnterpriseOpportunity", opportunityId, "loanStartDate");
    }
    if (sources.repaymentTrack === "yes" || sources.repaymentTrack === "no" || sources.repaymentTrack === "not_sure") {
      facts.balanceTransfer.repaymentTrack = known(
        sources.repaymentTrack,
        "EnterpriseOpportunity",
        opportunityId,
        "repaymentTrack",
      );
    }
    if (sources.delayedEmiCount != null && sources.delayedEmiCount >= 0) {
      facts.balanceTransfer.delayedEmiCount = known(
        sources.delayedEmiCount,
        "EnterpriseOpportunity",
        opportunityId,
        "delayedEmiCount",
        { knownZeroDeclared: sources.delayedEmiCount === 0 },
      );
    }
  }

  return facts;
}

function mapperFailureCode(error: unknown): string {
  if (error instanceof OpportunityAssessmentError) {
    if (error.message && error.message !== error.code) return error.message;
    return error.code;
  }
  return "ASSESSMENT_UNSUPPORTED";
}

export function evaluateCanonicalAssessmentSnapshot(
  facts: OpportunityAssessmentFactsV1,
  sources: Pick<CanonicalAssessmentSources, "productCode" | "transactionType">,
): CanonicalSnapshotEvaluation {
  const storedProduct = assessmentProduct(sources.productCode) ?? facts.loanRequirement.productCode.value;
  const transaction =
    facts.loanRequirement.transactionType.value ??
    (sources.transactionType === "balance_transfer" ? "balance_transfer" : null);
  const hlbt = isHlbtCanonicalFactJourney(storedProduct, transaction);
  const journeyFields = bootstrapProductJourneyFields(hlbt ? "HOME_LOAN_BT" : storedProduct);
  const derived = deriveOpportunityAssessmentReadiness(facts, journeyFields);
  const employment = facts.borrower.employmentFamily.value ?? "unknown";
  const required = mandatoryRecommendationFields(journeyFields, employment);
  const missingFactKeys = required
    .filter((row) => !journeyFieldIsSatisfied(facts, row))
    .map((row) => assessmentPathForJourneyField(row.fieldId))
    .filter((path): path is string => Boolean(path));
  const missingLabels = missingJourneyFieldLabels(facts, required);

  const base = {
    facts,
    journeyFields,
    readinessStatus: derived.readinessStatus,
    unsupportedReasonCode: derived.unsupportedReasonCode,
    missingFactKeys,
    missingLabels,
  };

  if (sources.productCode?.trim() && !assessmentProduct(sources.productCode)) {
    return {
      ...base,
      readinessStatus: "unsupported",
      unsupportedReasonCode: "UNSUPPORTED_RECOMMENDATION_PRODUCT",
      failureCode: "UNSUPPORTED_RECOMMENDATION_PRODUCT",
      missingFactKeys: [],
      missingLabels: [],
      executable: false,
      revisionKind: "SAVED",
      panel: "unsupported",
    };
  }

  if (
    facts.borrower.employmentFamily.value === "self_employed" ||
    derived.unsupportedReasonCode === "SELF_EMPLOYED_INCOME_METHODOLOGY_UNSUPPORTED"
  ) {
    return {
      ...base,
      failureCode: "SELF_EMPLOYED_INCOME_METHODOLOGY_UNSUPPORTED",
      missingFactKeys: [],
      missingLabels: [],
      executable: false,
      revisionKind: "SAVED",
      panel: "unsupported",
    };
  }

  if (derived.readinessStatus === "unsupported") {
    return {
      ...base,
      failureCode: derived.unsupportedReasonCode ?? "ASSESSMENT_UNSUPPORTED",
      missingFactKeys: [],
      missingLabels: [],
      executable: false,
      revisionKind: "SAVED",
      panel: "unsupported",
    };
  }

  if (derived.readinessStatus !== "ready") {
    return {
      ...base,
      failureCode: missingFactKeys.length > 0 ? null : "ASSESSMENT_INCOMPLETE",
      executable: false,
      revisionKind: "SAVED",
      panel: "information_required",
    };
  }

  try {
    mapFinalizedAssessmentFactsToCanonical(facts);
  } catch (error) {
    return {
      ...base,
      failureCode: mapperFailureCode(error),
      missingFactKeys: [],
      missingLabels: [],
      executable: false,
      revisionKind: "SAVED",
      panel: "blocked",
    };
  }

  return {
    ...base,
    failureCode: null,
    missingFactKeys: [],
    missingLabels: [],
    executable: true,
    revisionKind: "FINALIZED",
    panel: "complete",
  };
}
