/**
 * CO-SPRINT-089 — Strategic Workspace ↔ Lender Pipeline.
 * Analysis memory persists for the loan lifecycle; Identified is execution entry only.
 */

import { updateLoanFileInStorage } from "@/lib/loan-files-utils";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import type { LoanFile, LoanLenderExecution, LenderProbability } from "@/types/catalyst-one";
import { isPreExecutionStage, normalizeLenderCaseStage } from "@/constants/lender-pipeline";

const SHORTLIST_KEY = "catalyst.strategic-lender-shortlist";
const ANALYSIS_KEY = "catalyst.strategic-lender-analysis";

export interface StrategicLenderShortlistItem {
  lenderRef: string;
  lenderName: string;
  product?: string;
  productRefs?: string[];
  expectedRoi?: number;
  successProbability?: number;
  specialNotes?: string;
  branchName?: string;
  executorName?: string;
  reportingManagerName?: string;
  strategicRank?: number;
  reasonForRecommendation?: string;
  strategicScore?: number;
  foirAssessment?: string;
  cibilAssessment?: string;
  incomeFit?: string;
  policyFit?: string;
  expectedTurnaround?: string;
  recommendationNotes?: string;
  chanakyaRecommendation?: string;
  createdBy: string;
  createdAt: string;
}

export interface StrategicShortlistBucket {
  opportunityId: string;
  items: StrategicLenderShortlistItem[];
  updatedAt: string;
}

export interface StrategicAnalysisBucket {
  opportunityId: string;
  analysed: StrategicLenderShortlistItem[];
  updatedAt: string;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function normalizeLenderKey(nameOrRef: string): string {
  return nameOrRef.trim().toLowerCase().replace(/^lender:/, "");
}

function readShortlistMap(): Record<string, StrategicShortlistBucket> {
  return readJson(SHORTLIST_KEY) ?? {};
}

function writeShortlistMap(map: Record<string, StrategicShortlistBucket>) {
  writeJson(SHORTLIST_KEY, map);
}

function readAnalysisMap(): Record<string, StrategicAnalysisBucket> {
  return readJson(ANALYSIS_KEY) ?? {};
}

function writeAnalysisMap(map: Record<string, StrategicAnalysisBucket>) {
  writeJson(ANALYSIS_KEY, map);
}

/** Persist / merge strategic analysis — never cleared when execution begins. */
export function upsertStrategicAnalysis(
  opportunityId: string,
  items: Array<Partial<StrategicLenderShortlistItem> & { lenderRef: string; lenderName: string }>,
): StrategicLenderShortlistItem[] {
  const map = readAnalysisMap();
  const bucket = map[opportunityId] ?? {
    opportunityId,
    analysed: [],
    updatedAt: new Date().toISOString(),
  };

  for (const [index, raw] of items.entries()) {
    const key = normalizeLenderKey(raw.lenderRef || raw.lenderName);
    const enriched = enrichStrategyFields(raw, index);
    const idx = bucket.analysed.findIndex(
      (i) => normalizeLenderKey(i.lenderRef || i.lenderName) === key,
    );
    if (idx >= 0) {
      bucket.analysed[idx] = { ...bucket.analysed[idx], ...enriched };
    } else {
      bucket.analysed.push(enriched);
    }
  }

  // Re-rank by strategic score descending
  bucket.analysed = bucket.analysed
    .sort((a, b) => (b.strategicScore ?? 0) - (a.strategicScore ?? 0))
    .map((item, i) => ({ ...item, strategicRank: i + 1 }));
  bucket.updatedAt = new Date().toISOString();
  map[opportunityId] = bucket;
  writeAnalysisMap(map);
  return bucket.analysed;
}

export function getStrategicAnalysis(opportunityId: string): StrategicLenderShortlistItem[] {
  if (!opportunityId) return [];
  return readAnalysisMap()[opportunityId]?.analysed ?? [];
}

export function getStrategicShortlist(opportunityId: string): StrategicLenderShortlistItem[] {
  if (!opportunityId) return [];
  return readShortlistMap()[opportunityId]?.items ?? [];
}

export function upsertStrategicShortlistItem(
  opportunityId: string,
  item: Omit<StrategicLenderShortlistItem, "createdAt" | "createdBy"> & {
    createdBy?: string;
    createdAt?: string;
  },
): StrategicLenderShortlistItem[] {
  const enriched = enrichStrategyFields(item, item.strategicRank ? item.strategicRank - 1 : 0);
  // Always keep analysis memory
  upsertStrategicAnalysis(opportunityId, [enriched]);

  const map = readShortlistMap();
  const bucket = map[opportunityId] ?? {
    opportunityId,
    items: [],
    updatedAt: new Date().toISOString(),
  };
  const key = normalizeLenderKey(enriched.lenderRef || enriched.lenderName);
  const existingIdx = bucket.items.findIndex(
    (i) => normalizeLenderKey(i.lenderRef || i.lenderName) === key,
  );
  const nextItem: StrategicLenderShortlistItem = {
    ...enriched,
    createdBy: item.createdBy ?? enriched.createdBy ?? "RM",
    createdAt: item.createdAt ?? enriched.createdAt ?? new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    bucket.items[existingIdx] = { ...bucket.items[existingIdx], ...nextItem };
  } else {
    bucket.items.push(nextItem);
  }
  bucket.updatedAt = new Date().toISOString();
  map[opportunityId] = bucket;
  writeShortlistMap(map);
  return bucket.items;
}

/** Remove from execution shortlist only — analysis memory is preserved. */
export function removeStrategicShortlistItem(
  opportunityId: string,
  lenderRefOrName: string,
): StrategicLenderShortlistItem[] {
  const map = readShortlistMap();
  const bucket = map[opportunityId];
  if (!bucket) return [];
  const key = normalizeLenderKey(lenderRefOrName);
  bucket.items = bucket.items.filter(
    (i) => normalizeLenderKey(i.lenderRef || i.lenderName) !== key,
  );
  bucket.updatedAt = new Date().toISOString();
  map[opportunityId] = bucket;
  writeShortlistMap(map);
  return bucket.items;
}

function enrichStrategyFields(
  item: Partial<StrategicLenderShortlistItem> & { lenderRef: string; lenderName: string },
  index: number,
): StrategicLenderShortlistItem {
  const score =
    item.strategicScore ??
    item.successProbability ??
    Math.max(42, 92 - index * 8);
  const rank = item.strategicRank ?? index + 1;
  const reason =
    item.reasonForRecommendation ??
    (rank === 1
      ? "Highest strategic fit for this transaction profile"
      : rank === 2
        ? "Strong alternate — competitive ROI and relationship depth"
        : "Viable alternate retained from strategic analysis");

  return {
    lenderRef: item.lenderRef,
    lenderName: item.lenderName,
    product: item.product,
    productRefs: item.productRefs,
    expectedRoi: item.expectedRoi ?? Number((8.2 + (index % 4) * 0.35).toFixed(2)),
    successProbability: item.successProbability ?? score,
    specialNotes: item.specialNotes,
    branchName: item.branchName,
    executorName: item.executorName,
    reportingManagerName: item.reportingManagerName,
    strategicRank: rank,
    reasonForRecommendation: reason,
    strategicScore: score,
    foirAssessment: item.foirAssessment ?? (score >= 75 ? "Within policy band" : "Borderline — monitor"),
    cibilAssessment: item.cibilAssessment ?? (score >= 70 ? "Acceptable" : "Needs review"),
    incomeFit: item.incomeFit ?? (score >= 72 ? "Strong" : "Adequate"),
    policyFit: item.policyFit ?? (score >= 78 ? "Aligned" : "Partial fit"),
    expectedTurnaround: item.expectedTurnaround ?? (rank <= 2 ? "7–10 days" : "10–14 days"),
    recommendationNotes:
      item.recommendationNotes ??
      `${item.lenderName} retained from Strategic Workspace analysis for this opportunity.`,
    chanakyaRecommendation:
      item.chanakyaRecommendation ??
      (rank === 1
        ? `Prioritise ${item.lenderName} for login.`
        : `Keep ${item.lenderName} available as an alternate.`),
    createdBy: item.createdBy ?? "RM",
    createdAt: item.createdAt ?? new Date().toISOString(),
  };
}

function loadFile(loanFileId: string): LoanFile | null {
  const files = (typeof window !== "undefined" ? loadLoanFiles() : null) ?? getInitialLoanFiles();
  return files.find((f) => f.id === loanFileId) ?? null;
}

function findExistingCase(
  cases: LoanLenderExecution[],
  lenderName: string,
  lenderRef?: string,
): LoanLenderExecution | undefined {
  const keys = [lenderRef, lenderName].filter(Boolean).map((k) => normalizeLenderKey(k!));
  return cases.find((c) => {
    const cKeys = [c.lenderRef, c.lender].filter(Boolean).map((k) => normalizeLenderKey(k!));
    return cKeys.some((ck) => keys.includes(ck));
  });
}

function probabilityFromScore(score?: number): LenderProbability {
  if (score == null) return "medium";
  if (score >= 85) return "very_high";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  if (score >= 30) return "low";
  return "very_low";
}

function toCasePatch(item: StrategicLenderShortlistItem, opportunityId: string, actor: string, now: string) {
  return {
    product: item.product,
    expectedRoi: item.expectedRoi,
    specialNotes: item.specialNotes,
    strategicRank: item.strategicRank,
    reasonForRecommendation: item.reasonForRecommendation,
    strategicScore: item.strategicScore,
    foirAssessment: item.foirAssessment,
    cibilAssessment: item.cibilAssessment,
    incomeFit: item.incomeFit,
    policyFit: item.policyFit,
    expectedTurnaround: item.expectedTurnaround,
    recommendationNotes: item.recommendationNotes,
    chanakyaRecommendation: item.chanakyaRecommendation,
    branch: item.branchName,
    relationshipManager: item.executorName,
    fromStrategic: true as const,
    opportunityId,
    lenderRef: item.lenderRef,
    identifiedBy: item.createdBy || actor,
    updatedBy: actor,
    updatedAt: now,
  };
}

export interface SyncIdentifiedResult {
  ok: boolean;
  loanFileId?: string;
  cases: LoanLenderExecution[];
  created: string[];
  existingOpened: string[];
  message: string;
}

/**
 * Upsert shortlist into IDENTIFIED.
 * @param pruneMissing — when true, drop Identified (pre-login) cards not in shortlist.
 *   Move-to-execution of a subset should pass false so alternate Identified cards stay.
 *   Explicit shortlist removal should pass true for that sync.
 */
export function syncShortlistToIdentified(
  loanFileId: string,
  opportunityId: string,
  shortlist: StrategicLenderShortlistItem[],
  actor = "RM",
  options?: { pruneMissing?: boolean },
): SyncIdentifiedResult {
  const file = loadFile(loanFileId);
  if (!file) {
    return {
      ok: false,
      cases: [],
      created: [],
      existingOpened: [],
      message: "Loan file not found — open Loan Workspace to continue.",
    };
  }

  // Preserve analysis memory for every shortlisted lender
  upsertStrategicAnalysis(opportunityId, shortlist);

  const now = new Date().toISOString();
  let cases = [...(file.lenders ?? [])];
  const created: string[] = [];
  const existingOpened: string[] = [];
  const pruneMissing = options?.pruneMissing ?? false;

  for (const item of shortlist) {
    const existing = findExistingCase(cases, item.lenderName, item.lenderRef);
    if (existing) {
      existingOpened.push(existing.lender);
      if (isPreExecutionStage(existing.caseStage)) {
        cases = cases.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                ...toCasePatch(item, opportunityId, actor, now),
                identifiedAt: c.identifiedAt ?? now,
                createdBy: c.createdBy ?? item.createdBy ?? actor,
              }
            : c,
        );
      }
      continue;
    }

    const next: LoanLenderExecution = {
      id: `strat-${normalizeLenderKey(item.lenderRef || item.lenderName)}-${Date.now()}`,
      lender: item.lenderName,
      status: "active",
      caseStage: "identified",
      expectedLoanAmount: file.requiredAmount,
      probability: probabilityFromScore(item.strategicScore ?? item.successProbability),
      isPrimary: cases.length === 0,
      createdBy: item.createdBy || actor,
      createdAt: item.createdAt || now,
      identifiedAt: now,
      ...toCasePatch(item, opportunityId, actor, now),
    };
    cases = [next, ...cases];
    created.push(item.lenderName);
  }

  if (pruneMissing) {
    const shortlistKeys = new Set(
      shortlist.map((i) => normalizeLenderKey(i.lenderRef || i.lenderName)),
    );
    cases = cases.filter((c) => {
      if (!c.fromStrategic || !isPreExecutionStage(c.caseStage)) return true;
      if (c.opportunityId && c.opportunityId !== opportunityId) return true;
      return shortlistKeys.has(normalizeLenderKey(c.lenderRef || c.lender));
    });
  }

  const updated = updateLoanFileInStorage(loanFileId, {
    lenders: cases,
    lender: cases.find((c) => c.isPrimary)?.lender ?? cases[0]?.lender ?? file.lender,
  });

  return {
    ok: Boolean(updated),
    loanFileId,
    cases: updated?.lenders ?? cases,
    created,
    existingOpened,
    message:
      created.length > 0
        ? `${created.length} lender${created.length === 1 ? "" : "s"} moved to Identified.`
        : existingOpened.length > 0
          ? "Existing lender case opened — no duplicate created."
          : "Lender Pipeline synchronized.",
  };
}

/** One-click identify a single alternate from strategic memory. */
export function identifyLenderFromAnalysis(
  loanFileId: string,
  opportunityId: string,
  lenderRefOrName: string,
  actor = "RM",
): SyncIdentifiedResult {
  const analysed = getStrategicAnalysis(opportunityId);
  const key = normalizeLenderKey(lenderRefOrName);
  let item = analysed.find((i) => normalizeLenderKey(i.lenderRef || i.lenderName) === key);
  if (!item) {
    item = getStrategicShortlist(opportunityId).find(
      (i) => normalizeLenderKey(i.lenderRef || i.lenderName) === key,
    );
  }
  if (!item) {
    return {
      ok: false,
      cases: [],
      created: [],
      existingOpened: [],
      message: "Lender not found in strategic analysis.",
    };
  }
  upsertStrategicShortlistItem(opportunityId, item);
  return syncShortlistToIdentified(loanFileId, opportunityId, [item], actor, {
    pruneMissing: false,
  });
}

export function startLenderLogin(
  loanFileId: string,
  caseId: string,
  actor = "RM",
): LoanLenderExecution | null {
  const file = loadFile(loanFileId);
  if (!file) return null;
  const now = new Date().toISOString();
  const cases = (file.lenders ?? []).map((c) =>
    c.id === caseId
      ? {
          ...c,
          caseStage: "prelogin" as const,
          updatedBy: actor,
          updatedAt: now,
        }
      : c,
  );
  const updated = updateLoanFileInStorage(loanFileId, { lenders: cases });
  return updated?.lenders?.find((c) => c.id === caseId) ?? null;
}

export function countPipelineBuckets(cases: LoanLenderExecution[]) {
  const active = cases.filter((c) => c.status !== "closed");
  const stageOf = (id: ReturnType<typeof normalizeLenderCaseStage>) =>
    active.filter((c) => normalizeLenderCaseStage(c.caseStage) === id).length;

  return {
    identified: stageOf("identified"),
    awaitingLogin: stageOf("prelogin"),
    loggedIn: stageOf("logged_in_wip"),
    approvals: stageOf("soft_approved") + stageOf("final_approved"),
    disbursements: stageOf("disbursed") + stageOf("closure_wip"),
  };
}

export function buildMinimalLenderPipelineInsight(
  cases: LoanLenderExecution[],
  opportunityId?: string,
): string[] {
  const analysedList = opportunityId ? getStrategicAnalysis(opportunityId) : [];
  const analysed = analysedList.length;
  const b = countPipelineBuckets(cases);
  const onPipeline = new Set(
    cases.map((c) => normalizeLenderKey(c.lenderRef || c.lender)),
  );
  const inExecution = cases.filter((c) => c.status !== "closed").length;
  const altCount = analysedList.filter(
    (a) => !onPipeline.has(normalizeLenderKey(a.lenderRef || a.lenderName)),
  ).length;

  const lines: string[] = [];
  if (analysed > 0) {
    lines.push(`${analysed === 1 ? "One lender" : `${analysed} lenders`} analysed.`);
  }
  if (inExecution > 0) {
    lines.push(
      `${inExecution === 1 ? "One lender" : `${inExecution} lenders`} moved into execution.`,
    );
  } else if (b.identified > 0) {
    lines.push(
      `${b.identified === 1 ? "One lender" : `${b.identified} lenders`} moved into execution.`,
    );
  }
  if (altCount > 0) {
    lines.push(
      `${altCount === 1 ? "One alternate lender remains" : `${altCount} alternate lenders remain`} available.`,
    );
  }
  if (lines.length === 0) {
    lines.push("Shortlist lenders in Strategic Workspace to populate Identified.");
  }
  return lines.slice(0, 3);
}
