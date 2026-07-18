/**
 * CO-SPRINT-089 — Strategic Workspace shortlist → Lender Pipeline IDENTIFIED sync.
 * Strategic owns selection; Pipeline owns execution. No manual duplication.
 */

import { updateLoanFileInStorage } from "@/lib/loan-files-utils";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import { getInitialLoanFiles } from "@/data/catalyst-one/loan-files";
import type { LoanFile, LoanLenderExecution, LenderProbability } from "@/types/catalyst-one";
import { isPreExecutionStage, normalizeLenderCaseStage } from "@/constants/lender-pipeline";

const SHORTLIST_KEY = "catalyst.strategic-lender-shortlist";

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
  createdBy: string;
  createdAt: string;
}

export interface StrategicShortlistBucket {
  opportunityId: string;
  items: StrategicLenderShortlistItem[];
  updatedAt: string;
}

function readAll(): Record<string, StrategicShortlistBucket> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SHORTLIST_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StrategicShortlistBucket>) : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, StrategicShortlistBucket>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SHORTLIST_KEY, JSON.stringify(map));
}

export function normalizeLenderKey(nameOrRef: string): string {
  return nameOrRef.trim().toLowerCase().replace(/^lender:/, "");
}

export function getStrategicShortlist(opportunityId: string): StrategicLenderShortlistItem[] {
  if (!opportunityId) return [];
  return readAll()[opportunityId]?.items ?? [];
}

export function upsertStrategicShortlistItem(
  opportunityId: string,
  item: Omit<StrategicLenderShortlistItem, "createdAt" | "createdBy"> & {
    createdBy?: string;
    createdAt?: string;
  },
): StrategicLenderShortlistItem[] {
  const map = readAll();
  const bucket = map[opportunityId] ?? {
    opportunityId,
    items: [],
    updatedAt: new Date().toISOString(),
  };
  const key = normalizeLenderKey(item.lenderRef || item.lenderName);
  const existingIdx = bucket.items.findIndex(
    (i) => normalizeLenderKey(i.lenderRef || i.lenderName) === key,
  );
  const nextItem: StrategicLenderShortlistItem = {
    ...item,
    createdBy: item.createdBy ?? "RM",
    createdAt: item.createdAt ?? new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    bucket.items[existingIdx] = { ...bucket.items[existingIdx], ...nextItem };
  } else {
    bucket.items.push(nextItem);
  }
  bucket.updatedAt = new Date().toISOString();
  map[opportunityId] = bucket;
  writeAll(map);
  return bucket.items;
}

export function removeStrategicShortlistItem(
  opportunityId: string,
  lenderRefOrName: string,
): StrategicLenderShortlistItem[] {
  const map = readAll();
  const bucket = map[opportunityId];
  if (!bucket) return [];
  const key = normalizeLenderKey(lenderRefOrName);
  bucket.items = bucket.items.filter(
    (i) => normalizeLenderKey(i.lenderRef || i.lenderName) !== key,
  );
  bucket.updatedAt = new Date().toISOString();
  map[opportunityId] = bucket;
  writeAll(map);
  return bucket.items;
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

export interface SyncIdentifiedResult {
  ok: boolean;
  loanFileId?: string;
  cases: LoanLenderExecution[];
  created: string[];
  existingOpened: string[];
  message: string;
}

/** Upsert shortlist into IDENTIFIED. Never duplicates. Does not demote executed cases. */
export function syncShortlistToIdentified(
  loanFileId: string,
  opportunityId: string,
  shortlist: StrategicLenderShortlistItem[],
  actor = "RM",
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

  const now = new Date().toISOString();
  let cases = [...(file.lenders ?? [])];
  const created: string[] = [];
  const existingOpened: string[] = [];

  for (const item of shortlist) {
    const existing = findExistingCase(cases, item.lenderName, item.lenderRef);
    if (existing) {
      existingOpened.push(existing.lender);
      // Refresh strategic metadata only while still in IDENTIFIED
      if (isPreExecutionStage(existing.caseStage)) {
        cases = cases.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                product: item.product ?? c.product,
                expectedRoi: item.expectedRoi ?? c.expectedRoi,
                specialNotes: item.specialNotes ?? c.specialNotes,
                branch: item.branchName ?? c.branch,
                relationshipManager: item.executorName ?? c.relationshipManager,
                fromStrategic: true,
                opportunityId,
                lenderRef: item.lenderRef ?? c.lenderRef,
                updatedBy: actor,
                updatedAt: now,
              }
            : c,
        );
      }
      continue;
    }

    const next: LoanLenderExecution = {
      id: `strat-${normalizeLenderKey(item.lenderRef || item.lenderName)}-${Date.now()}`,
      lender: item.lenderName,
      lenderRef: item.lenderRef,
      branch: item.branchName,
      relationshipManager: item.executorName,
      status: "active",
      caseStage: "identified",
      product: item.product,
      expectedRoi: item.expectedRoi,
      specialNotes: item.specialNotes,
      expectedLoanAmount: file.requiredAmount,
      probability: probabilityFromScore(item.successProbability),
      isPrimary: cases.length === 0,
      fromStrategic: true,
      opportunityId,
      createdBy: item.createdBy || actor,
      updatedBy: actor,
      createdAt: item.createdAt || now,
      updatedAt: now,
    };
    cases = [next, ...cases];
    created.push(item.lenderName);
  }

  // Live sync: remove IDENTIFIED cases that were dropped from shortlist (pre-execution only)
  const shortlistKeys = new Set(
    shortlist.map((i) => normalizeLenderKey(i.lenderRef || i.lenderName)),
  );
  cases = cases.filter((c) => {
    if (!c.fromStrategic || !isPreExecutionStage(c.caseStage)) return true;
    if (c.opportunityId && c.opportunityId !== opportunityId) return true;
    const key = normalizeLenderKey(c.lenderRef || c.lender);
    return shortlistKeys.has(key);
  });

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

/** Move IDENTIFIED → PRE LOGIN (Start Login). */
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

export function buildMinimalLenderPipelineInsight(cases: LoanLenderExecution[]): string[] {
  const b = countPipelineBuckets(cases);
  const lines: string[] = [];
  if (b.identified > 0) {
    lines.push(
      `${b.identified === 1 ? "One lender has" : `${b.identified} lenders have`} been identified${
        b.awaitingLogin > 0
          ? `. ${b.awaitingLogin === 1 ? "One is" : `${b.awaitingLogin} are`} ready for login.`
          : "."
      }`,
    );
  } else if (b.awaitingLogin > 0) {
    lines.push(
      `${b.awaitingLogin === 1 ? "One lender is" : `${b.awaitingLogin} lenders are`} awaiting login.`,
    );
  }
  if (b.loggedIn > 0) {
    lines.push(
      `${b.loggedIn === 1 ? "One lender is" : `${b.loggedIn} lenders are`} logged in – WIP.`,
    );
  }
  if (lines.length === 0) {
    lines.push("Shortlist lenders in Strategic Workspace to populate Identified.");
  }
  return lines.slice(0, 2);
}
