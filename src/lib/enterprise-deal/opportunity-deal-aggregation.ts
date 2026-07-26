/**
 * CO-ARCH-007 — Opportunity-level rollups are always aggregations of child Enterprise Deals.
 * Chanakya / Radar / Accounting dashboards must key by dealId and roll up by opportunityId.
 */

import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { deriveJourneyProgressSegments } from "@/constants/enterprise-deal-journey-progress";

export type OpportunityDealAggregation = {
  opportunityId: string;
  dealCount: number;
  dealIds: string[];
  lenderNames: string[];
  maxProgressFilled: number;
  stages: string[];
  /** Placeholder for deal-centric Radar / Chanakya until engines consume Deal SSOT. */
  needsAttention: boolean;
};

export function aggregateOpportunityDealIntelligence(
  opportunityId: string,
  deals: EnterpriseDealApiRecord[],
): OpportunityDealAggregation {
  let maxProgressFilled = 1;
  const stages: string[] = [];
  const lenderNames: string[] = [];
  let needsAttention = false;

  for (const d of deals) {
    const prog = deriveJourneyProgressSegments({
      pipelineStage: d.grossStage,
      status: d.operationalStatus,
    });
    maxProgressFilled = Math.max(maxProgressFilled, prog.filled);
    stages.push(d.grossStage);
    if (d.primaryCounterpartyName) lenderNames.push(d.primaryCounterpartyName);
    if (prog.overlay !== "none") needsAttention = true;
  }

  return {
    opportunityId,
    dealCount: deals.length,
    dealIds: deals.map((d) => d.id),
    lenderNames,
    maxProgressFilled,
    stages,
    needsAttention,
  };
}
