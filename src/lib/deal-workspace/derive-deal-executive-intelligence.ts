/**
 * CO-UX-017 — Deal Workspace executive intelligence (presentation derive only).
 * Consumes DealPipelineRuntime — no architecture / persistence changes.
 */

import { formatINR } from "@/lib/format-currency";
import {
  LENDER_PROBABILITY_LABELS,
  normalizeLenderCaseStage,
} from "@/constants/lender-pipeline";
import type { DealPipelineRuntime } from "@/types/deal-pipeline-runtime";
import type { LenderProbability, LoanLenderExecution } from "@/types/catalyst-one";

const PROBABILITY_RANK: Record<LenderProbability, number> = {
  very_high: 6,
  high: 5,
  medium: 4,
  low: 3,
  very_low: 2,
  rejected: 1,
  withdrawn: 0,
};

export type DealExecutiveIntelligence = {
  opportunityHealthScore: number;
  opportunityHealthLabel: string;
  pendingCustomerDocuments: number | null;
  pendingCustomerDocumentsLabel: string;
  dealsRequiringAttention: number;
  expectedRevenue: number | null;
  expectedRevenueLabel: string;
  highestProbabilityLender: string;
  nextBestAction: string;
  createdOnLabel: string;
  lastUpdatedLabel: string;
  expectedDisbursalLabel: string;
  overallDisbursedLabel: string;
  successProbabilityLabel: string;
};

function formatDateLabel(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STAGE_PROBABILITY: Record<string, LenderProbability> = {
  disbursed: "very_high",
  closure_wip: "very_high",
  final_approved: "high",
  soft_approved: "high",
  logged_in_wip: "medium",
  prelogin: "medium",
  identified: "low",
  hold: "very_low",
  lost: "rejected",
};

function inferredProbability(l: LoanLenderExecution): LenderProbability {
  if (l.probability) return l.probability;
  const stage = normalizeLenderCaseStage(l.caseStage);
  return STAGE_PROBABILITY[stage] ?? "medium";
}

function activeLenders(lenders: LoanLenderExecution[]): LoanLenderExecution[] {
  return lenders.filter((l) => {
    const stage = normalizeLenderCaseStage(l.caseStage);
    return stage !== "lost";
  });
}

function pickHighestProbability(
  lenders: LoanLenderExecution[],
): LoanLenderExecution | null {
  const pool = activeLenders(lenders);
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => {
    const ra = PROBABILITY_RANK[inferredProbability(a)] ?? 0;
    const rb = PROBABILITY_RANK[inferredProbability(b)] ?? 0;
    if (rb !== ra) return rb - ra;
    return (b.strategicScore ?? 0) - (a.strategicScore ?? 0);
  })[0];
}

/** Prefer a human OPP-… ref; never surface DEAL-… as the Opportunity number. */
export function resolveOpportunityDisplayNumber(
  runtime: DealPipelineRuntime,
): string {
  const candidates = [
    runtime.deal.opportunityNumber,
    runtime.context.opportunityNumber,
    ...runtime.siblingDeals.map((d) => d.opportunityNumber),
  ];
  for (const raw of candidates) {
    const v = raw?.trim();
    if (!v) continue;
    if (/^deal[-_]/i.test(v)) continue;
    return v;
  }
  return "—";
}

function countDealsRequiringAttention(lenders: LoanLenderExecution[]): number {
  return lenders.filter((l) => {
    const stage = normalizeLenderCaseStage(l.caseStage);
    if (stage === "hold") return true;
    if (stage === "lost") return false;
    if (stage === "identified" || stage === "prelogin") return true;
    if (stage === "logged_in_wip" || stage === "closure_wip") return true;
    return false;
  }).length;
}

function deriveHealthScore(runtime: DealPipelineRuntime): {
  score: number;
  label: string;
} {
  const total = runtime.lenders.length;
  if (total === 0) {
    return { score: 35, label: "Needs attention" };
  }
  const disbursed = runtime.lenders.filter(
    (l) => normalizeLenderCaseStage(l.caseStage) === "disbursed",
  ).length;
  const approved = runtime.lenders.filter((l) => {
    const s = normalizeLenderCaseStage(l.caseStage);
    return s === "soft_approved" || s === "final_approved" || s === "closure_wip";
  }).length;
  const lost = runtime.lenders.filter(
    (l) => normalizeLenderCaseStage(l.caseStage) === "lost",
  ).length;
  const attention = countDealsRequiringAttention(runtime.lenders);

  let score = 48;
  score += Math.round((disbursed / total) * 28);
  score += Math.round((approved / total) * 18);
  score -= Math.round((lost / total) * 22);
  score -= Math.min(18, attention * 3);
  score = Math.max(12, Math.min(98, score));

  let label = "Needs attention";
  if (score >= 80) label = "Excellent";
  else if (score >= 65) label = "Good";
  else if (score >= 45) label = "Fair";
  else label = "Critical";

  return { score, label };
}

function readPendingDocs(runtime: DealPipelineRuntime): number | null {
  for (const deal of runtime.siblingDeals) {
    const snap =
      deal.snapshot && typeof deal.snapshot === "object"
        ? (deal.snapshot as Record<string, unknown>)
        : null;
    if (!snap) continue;
    const n =
      (typeof snap.pendingDocumentCount === "number" && snap.pendingDocumentCount) ||
      (typeof snap.pendingCustomerDocuments === "number" &&
        snap.pendingCustomerDocuments) ||
      null;
    if (typeof n === "number" && n >= 0) return n;
  }
  return null;
}

function deriveNextBestAction(
  runtime: DealPipelineRuntime,
  pendingDocs: number | null,
  highest: LoanLenderExecution | null,
): string {
  if (pendingDocs != null && pendingDocs > 0) {
    return `${pendingDocs} customer document${pendingDocs === 1 ? "" : "s"} are pending.`;
  }

  const hold = runtime.lenders.find(
    (l) => normalizeLenderCaseStage(l.caseStage) === "hold",
  );
  if (hold) {
    return `Resume ${hold.lender} — case is on Hold.`;
  }

  const prelogin = runtime.lenders.find((l) => {
    const s = normalizeLenderCaseStage(l.caseStage);
    return s === "identified" || s === "prelogin";
  });
  if (prelogin) {
    return `${prelogin.lender} requires income documents.`;
  }

  const logged = runtime.lenders.find(
    (l) => normalizeLenderCaseStage(l.caseStage) === "logged_in_wip",
  );
  if (logged) {
    return `Follow up with ${logged.lender} Relationship Manager.`;
  }

  if (highest) {
    return `Advance ${highest.lender} — highest probability lender on this Opportunity.`;
  }

  if (runtime.lenders.length === 0) {
    return "Identify the first lender to start execution.";
  }

  return "Review Lender Pipeline and advance the strongest active Deal.";
}

/**
 * Single derive for Deal Workspace executive header metrics.
 */
export function deriveDealExecutiveIntelligence(
  runtime: DealPipelineRuntime,
): DealExecutiveIntelligence {
  const health = deriveHealthScore(runtime);
  const pendingDocs = readPendingDocs(runtime);
  const attention = countDealsRequiringAttention(runtime.lenders);
  const highest = pickHighestProbability(runtime.lenders);

  const expectedRevenue = runtime.lenders.reduce((sum, l) => {
    if (typeof l.revenue === "number" && l.revenue > 0) return sum + l.revenue;
    return sum;
  }, 0);

  const overallDisbursed = runtime.siblingDeals.reduce((sum, d) => {
    const fromDeal = d.fulfilledAmount ?? 0;
    if (fromDeal > 0) return sum + fromDeal;
    const card = runtime.lenders.find(
      (l) => l.enterpriseDealId === d.id || l.id === d.id,
    );
    if (card && normalizeLenderCaseStage(card.caseStage) === "disbursed") {
      return sum + (card.disbursedAmount ?? card.expectedLoanAmount ?? 0);
    }
    return sum;
  }, 0);

  let createdAt = runtime.deal.createdAt || "";
  let updatedAt = runtime.deal.updatedAt || "";
  for (const d of runtime.siblingDeals) {
    if (d.createdAt && (!createdAt || d.createdAt < createdAt)) {
      createdAt = d.createdAt;
    }
    if (d.updatedAt && (!updatedAt || d.updatedAt > updatedAt)) {
      updatedAt = d.updatedAt;
    }
  }

  const anchor = runtime.deal;
  const snap =
    anchor.snapshot && typeof anchor.snapshot === "object"
      ? (anchor.snapshot as Record<string, unknown>)
      : {};
  const expectedDisbursal =
    (typeof snap.expectedDisbursalDate === "string" && snap.expectedDisbursalDate) ||
    (typeof snap.expectedDisbursementDate === "string" &&
      snap.expectedDisbursementDate) ||
    null;

  const successProbability = highest
    ? inferredProbability(highest)
    : null;

  return {
    opportunityHealthScore: health.score,
    opportunityHealthLabel: health.label,
    pendingCustomerDocuments: pendingDocs,
    pendingCustomerDocumentsLabel:
      pendingDocs == null ? "—" : String(pendingDocs),
    dealsRequiringAttention: attention,
    expectedRevenue: expectedRevenue > 0 ? expectedRevenue : null,
    expectedRevenueLabel:
      expectedRevenue > 0 ? formatINR(expectedRevenue) : "—",
    highestProbabilityLender: highest
      ? `${highest.lender} · ${LENDER_PROBABILITY_LABELS[inferredProbability(highest)]}`
      : "—",
    nextBestAction: deriveNextBestAction(runtime, pendingDocs, highest),
    createdOnLabel: formatDateLabel(createdAt),
    lastUpdatedLabel: formatDateLabel(updatedAt),
    expectedDisbursalLabel: formatDateLabel(expectedDisbursal),
    overallDisbursedLabel:
      overallDisbursed > 0 ? formatINR(overallDisbursed) : "—",
    successProbabilityLabel: successProbability
      ? LENDER_PROBABILITY_LABELS[successProbability]
      : "—",
  };
}
