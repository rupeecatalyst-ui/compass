/**
 * CO-UX-018 — Opportunity-level executive summary for Enterprise Deal Registry.
 * Presentation derive only — no architecture / persistence changes.
 */

import { formatINR } from "@/lib/format-currency";
import {
  deriveJourneyProgressSegments,
  ENTERPRISE_JOURNEY_SEGMENTS,
} from "@/constants/enterprise-deal-journey-progress";
import type { DealRegistryRow } from "@/types/deal-registry";

export type OpportunityHealthBand = "healthy" | "needs_attention" | "critical";

export type DealStageBucketId =
  | "identified"
  | "logged_in"
  | "soft_approved"
  | "final_approved"
  | "closure_wip"
  | "disbursed"
  | "hold"
  | "lost";

export type DealStageBucket = {
  id: DealStageBucketId;
  label: string;
  count: number;
};

export type OpportunityExecutiveSummary = {
  healthScore: number;
  healthBand: OpportunityHealthBand;
  healthLabel: string;
  progressPercent: number;
  currentFocusLender: string;
  dealsRequiringAttention: number;
  pendingCustomerDocuments: number;
  pendingCustomerDocumentsLabel: string;
  expectedRevenue: number;
  expectedRevenueLabel: string;
  lastActivity: string;
  lastActivityLabel: string;
  totalDeals: number;
  stageBuckets: DealStageBucket[];
  /** Compact lines for the right panel (non-zero buckets preferred). */
  stageSummaryLines: string[];
  lenderChips: string[];
};

const BUCKET_ORDER: DealStageBucketId[] = [
  "final_approved",
  "soft_approved",
  "logged_in",
  "identified",
  "closure_wip",
  "disbursed",
  "hold",
  "lost",
];

const BUCKET_LABEL: Record<DealStageBucketId, string> = {
  identified: "Identified",
  logged_in: "Logged In",
  soft_approved: "Soft Approved",
  final_approved: "Final Approved",
  closure_wip: "Closure WIP",
  disbursed: "Disbursed",
  hold: "Hold",
  lost: "Lost",
};

function dealBucket(row: DealRegistryRow): DealStageBucketId {
  const prog = deriveJourneyProgressSegments({
    pipelineStage: row.grossStage,
    status: String(row.status),
  });
  if (prog.overlay === "hold") return "hold";
  if (prog.overlay === "lost") return "lost";
  switch (prog.segmentId) {
    case "pre_login":
      return "identified";
    case "logged_in_wip":
      return "logged_in";
    case "soft_approved":
      return "soft_approved";
    case "final_approved":
      return "final_approved";
    case "closure_wip":
      return "closure_wip";
    case "disbursed":
      return "disbursed";
    default:
      return "identified";
  }
}

function bandFromScore(score: number): {
  band: OpportunityHealthBand;
  label: string;
} {
  if (score >= 70) return { band: "healthy", label: "Healthy" };
  if (score >= 45) return { band: "needs_attention", label: "Needs Attention" };
  return { band: "critical", label: "Critical" };
}

/**
 * Derive executive summary for one Opportunity group (list of child Deals).
 */
export function deriveOpportunityExecutiveSummary(
  deals: DealRegistryRow[],
): OpportunityExecutiveSummary {
  const total = deals.length;
  const counts: Record<DealStageBucketId, number> = {
    identified: 0,
    logged_in: 0,
    soft_approved: 0,
    final_approved: 0,
    closure_wip: 0,
    disbursed: 0,
    hold: 0,
    lost: 0,
  };

  let maxFilled = 1;
  let lastActivity = "";
  let lastActivityLabel = "—";
  let expectedRevenue = 0;
  let pendingDocs = 0;
  let focusLender = "—";
  let focusFilled = -1;

  for (const d of deals) {
    const bucket = dealBucket(d);
    counts[bucket] += 1;
    const prog = deriveJourneyProgressSegments({
      pipelineStage: d.grossStage,
      status: String(d.status),
    });
    maxFilled = Math.max(maxFilled, prog.filled);
    if ((d.lastActivity || "") >= lastActivity) {
      lastActivity = d.lastActivity || "";
      lastActivityLabel = d.lastActivityLabel || "—";
    }
    expectedRevenue += d.expectedRevenue || 0;
    pendingDocs += d.documentsPending || 0;
    if (prog.overlay === "none" && prog.filled > focusFilled) {
      focusFilled = prog.filled;
      focusLender = d.selectedLender?.trim() || "—";
    }
  }

  if (focusLender === "—" && deals[0]) {
    focusLender = deals[0].selectedLender?.trim() || "—";
  }

  const dealsRequiringAttention =
    counts.hold +
    counts.lost +
    counts.identified +
    counts.logged_in +
    (pendingDocs > 0 ? 1 : 0);

  const totalSegments = ENTERPRISE_JOURNEY_SEGMENTS.length || 6;
  const progressPercent = Math.round((maxFilled / totalSegments) * 100);

  let healthScore = 40 + Math.round(progressPercent * 0.45);
  healthScore += Math.round(
    ((counts.final_approved + counts.closure_wip + counts.disbursed) /
      Math.max(1, total)) *
      18,
  );
  healthScore -= Math.min(25, counts.lost * 8 + counts.hold * 5);
  healthScore -= Math.min(12, Math.floor(pendingDocs / 2));
  if (total === 0) healthScore = 30;
  healthScore = Math.max(8, Math.min(99, healthScore));

  const { band, label } = bandFromScore(healthScore);

  const stageBuckets: DealStageBucket[] = BUCKET_ORDER.map((id) => ({
    id,
    label: BUCKET_LABEL[id],
    count: counts[id],
  }));

  const stageSummaryLines = stageBuckets
    .filter((b) => b.count > 0 && b.id !== "hold" && b.id !== "lost")
    .slice(0, 4)
    .map((b) => `${b.count} ${b.label}`);

  const lenderChips = deals
    .map((d) => d.selectedLender?.trim())
    .filter((n): n is string => Boolean(n) && n !== "—")
    .filter((n, i, arr) => arr.indexOf(n) === i);

  return {
    healthScore,
    healthBand: band,
    healthLabel: label,
    progressPercent,
    currentFocusLender: focusLender,
    dealsRequiringAttention: Math.max(
      0,
      counts.hold + counts.identified + (counts.logged_in > 0 ? counts.logged_in : 0),
    ),
    pendingCustomerDocuments: pendingDocs,
    pendingCustomerDocumentsLabel: pendingDocs > 0 ? String(pendingDocs) : "—",
    expectedRevenue,
    expectedRevenueLabel: expectedRevenue > 0 ? formatINR(expectedRevenue) : "—",
    lastActivity,
    lastActivityLabel,
    totalDeals: total,
    stageBuckets,
    stageSummaryLines:
      stageSummaryLines.length > 0
        ? stageSummaryLines
        : [`${total} Deal${total === 1 ? "" : "s"}`],
    lenderChips,
  };
}
