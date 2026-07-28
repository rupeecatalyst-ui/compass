/**
 * CO-BIZ-005 Phase 2 — My Pipeline from EBI RM provider (no duplicate KPI formulas).
 */

import { createRelationshipManagerBiProvider } from "@/lib/enterprise-business-intelligence";
import { loadDealsSync } from "@/lib/enterprise-deal";
import type { RmPipelineSnapshot } from "@/types/enterprise-rm-workspace";

function sameRmName(a: string | undefined, b: string): boolean {
  if (!a) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Value / conversion / TAT come from EBI.
 * Disbursals / lost / opportunity counts enrich from Deal DAL for the same RM.
 */
export function projectRmPipeline(input: {
  displayName: string;
  userId?: string;
}): RmPipelineSnapshot {
  const ebi = createRelationshipManagerBiProvider(input.displayName).getDashboard();
  const member = ebi.team.members[0];
  const exec = ebi.executive;
  const focus = ebi.focusRm || input.displayName;

  let myDisbursals = 0;
  let myLostCases = 0;
  let myActiveDeals = exec.dealsByRm[0]?.count ?? exec.activeDeals;
  let myOpportunities = member?.opportunitiesHandled ?? exec.activeOpportunities;

  try {
    const files = loadDealsSync("loan_workspace").files.filter((f) => {
      if (f.archived) return false;
      const byId =
        Boolean(input.userId) &&
        (f as { relationshipManagerUserId?: string }).relationshipManagerUserId ===
          input.userId;
      const byName = sameRmName(f.relationshipManager, focus);
      return Boolean(byId || byName);
    });
    if (files.length > 0) {
      myActiveDeals = files.length;
      myDisbursals = files.filter((f) => {
        const stage = String(f.stage || "").toLowerCase();
        const status = String(f.status || "").toLowerCase();
        return stage.includes("disburs") || status.includes("disburs");
      }).length;
      myLostCases = files.filter((f) => {
        const status = String(f.status || "").toLowerCase();
        const stage = String(f.stage || "").toLowerCase();
        return status.includes("lost") || stage.includes("lost") || status.includes("reject");
      }).length;
      const oppIds = new Set(
        files
          .map((f) => f.enterpriseOpportunityId || f.opportunityNumber)
          .filter(Boolean) as string[],
      );
      if (oppIds.size > 0) myOpportunities = oppIds.size;
    }
  } catch {
    // Deal DAL optional — EBI remains authoritative for value/conversion/TAT.
  }

  return {
    myOpportunities,
    myActiveDeals,
    myDisbursals,
    myLostCases,
    pipelineValue: exec.pipelineValue,
    conversionRatePct: exec.conversionRatioPct,
    averageTatDays: exec.averageProcessingDays ?? member?.averageTurnaroundDays ?? 0,
    focusRm: focus,
    ebi,
  };
}
