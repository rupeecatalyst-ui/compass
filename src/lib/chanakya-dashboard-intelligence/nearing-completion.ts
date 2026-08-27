/**
 * CO-CHANAKYA-INTELLIGENCE-001 — Project nearing-completion deals from Deal Registry.
 * Milestone mapping uses ENTERPRISE_JOURNEY_SEGMENTS only — no invented TAT.
 */

import {
  deriveJourneyProgressSegments,
  type EnterpriseJourneySegmentId,
} from "@/constants/enterprise-deal-journey-progress";
import { ROUTES } from "@/constants/routes";
import { buildDealWorkspaceHref } from "@/lib/loan-journey/adr-018-routing";
import type { DealRegistryRow } from "@/types/deal-registry";
import type {
  ChanakyaNearingCompletionItem,
  ChanakyaNearingMilestone,
} from "@/types/chanakya-dashboard-intelligence";

const NEARING_SEGMENTS = new Set<EnterpriseJourneySegmentId>([
  "soft_approved",
  "final_approved",
  "closure_wip",
]);

function milestoneForSegment(
  segmentId: string,
): { milestone: ChanakyaNearingMilestone; label: string; hint: string } | null {
  switch (segmentId) {
    case "soft_approved":
      return {
        milestone: "soft_approval",
        label: "Approaching Final Approval",
        hint: "Timely lender / condition follow-up may accelerate Final Approval.",
      };
    case "final_approved":
      return {
        milestone: "final_approval",
        label: "Approaching Closure",
        hint: "Clear residual conditions to move into Closure WIP.",
      };
    case "closure_wip":
      return {
        milestone: "closure",
        label: "Approaching Disbursement",
        hint: "Operational intervention now can protect disbursement momentum.",
      };
    default:
      return null;
  }
}

export function projectNearingCompletionFromDeals(
  rows: DealRegistryRow[],
): ChanakyaNearingCompletionItem[] {
  const items: ChanakyaNearingCompletionItem[] = [];

  for (const row of rows) {
    const progress = deriveJourneyProgressSegments({
      pipelineStage: row.grossStage,
      status: String(row.status),
    });
    if (progress.overlay === "hold" || progress.overlay === "lost") continue;
    if (!NEARING_SEGMENTS.has(progress.segmentId)) continue;

    const mapped = milestoneForSegment(progress.segmentId);
    if (!mapped) continue;

    const dealKey = row.enterpriseDealId || row.id;
    items.push({
      id: `near:${dealKey}`,
      title: row.borrowerName || row.opportunityNumber || row.dealId,
      product: row.product || "Not Specified",
      lender: row.selectedLender || "Not Specified",
      milestone: mapped.milestone,
      milestoneLabel: mapped.label,
      stageLabel: progress.segmentLabel,
      amountLabel: row.loanAmountLabel || "Not Specified",
      interventionHint: mapped.hint,
      href: dealKey
        ? buildDealWorkspaceHref({
            dealId: dealKey,
            opportunityId: row.opportunityId,
          })
        : ROUTES.MY_DEALS,
    });
  }

  return items.slice(0, 12);
}
