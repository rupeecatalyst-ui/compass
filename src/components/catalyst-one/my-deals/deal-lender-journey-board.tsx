"use client";

/**
 * CO-C1-DEALS-JOURNEY-001 — My Deals list (Opportunity-grouped lender journey).
 * Consumes already-filtered loan Deal Registry rows — no parallel data engine.
 * Shared filters: `filterDealRegistryRows` in MyDealsWorkspace (same registry rows as Kanban).
 */

import { useMemo } from "react";
import { OpportunityLenderJourneyCard } from "@/components/catalyst-one/my-deals/opportunity-lender-journey-card";
import { formatINRCompact } from "@/lib/format-currency";
import { countDealsByActivity } from "@/lib/my-deals/classify-deal-activity";
import {
  formatLoanValueTotal,
  groupDealRowsByOpportunity,
  sortOpportunityGroups,
  type OpportunityRegistryGroup,
} from "@/lib/my-deals/group-opportunities";
import { deriveJourneyProgressSegments } from "@/constants/enterprise-deal-journey-progress";
import type { DealRegistryRow } from "@/types/deal-registry";

interface DealLenderJourneyBoardProps {
  rows: DealRegistryRow[];
  onOpenOpportunity: (group: OpportunityRegistryGroup) => void;
  onOpenDeal: (row: DealRegistryRow, group: OpportunityRegistryGroup) => void;
}

function countByJourney(rows: DealRegistryRow[]) {
  let inApproval = 0;
  let disbursed = 0;
  let lostHold = 0;
  for (const row of rows) {
    const prog = deriveJourneyProgressSegments({
      pipelineStage: row.grossStage,
      lenderCaseStage: row.lenderCaseStage,
      status: String(row.status),
    });
    if (prog.overlay === "lost" || prog.overlay === "hold") {
      lostHold += 1;
      continue;
    }
    if (prog.segmentId === "disbursed") {
      disbursed += 1;
      continue;
    }
    if (
      prog.segmentId === "soft_approved" ||
      prog.segmentId === "final_approved" ||
      prog.segmentId === "closure_wip"
    ) {
      inApproval += 1;
    }
  }
  return { inApproval, disbursed, lostHold };
}

export function DealLenderJourneyBoard({
  rows: filteredRows,
  onOpenOpportunity,
  onOpenDeal,
}: DealLenderJourneyBoardProps) {
  const groups = useMemo(
    () =>
      sortOpportunityGroups(
        groupDealRowsByOpportunity(filteredRows),
        "lastActivity",
        "desc",
      ),
    [filteredRows],
  );

  const kpis = useMemo(() => {
    const journey = countByJourney(filteredRows);
    const loanValue = formatLoanValueTotal(filteredRows);
    return {
      opportunities: groups.length,
      activeDeals: countDealsByActivity(filteredRows, "active"),
      loanValueLabel: formatINRCompact(loanValue),
      ...journey,
    };
  }, [filteredRows, groups]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-surface="deal-lender-journey">
      <div className="grid shrink-0 grid-cols-2 gap-1.5 px-2 pb-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Opportunities", value: String(kpis.opportunities) },
          { label: "Active Deals", value: String(kpis.activeDeals) },
          { label: "Loan Value", value: kpis.loanValueLabel },
          { label: "In Approval", value: String(kpis.inApproval) },
          { label: "Disbursed", value: String(kpis.disbursed) },
          { label: "Lost / Hold", value: String(kpis.lostHold) },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-2.5 py-1.5"
          >
            <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
              {kpi.label}
            </p>
            <p className="truncate text-sm font-semibold tabular-nums text-zinc-100">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-16 text-center">
            <p className="text-sm font-medium text-zinc-200">No loan Deals to show</p>
            <p className="mt-1 max-w-md text-[12px] text-zinc-500">
              Adjust filters or create lender Deals under loan Opportunities. My Deals is the
              Loan Deal Registry.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
            {groups.map((group) => (
              <OpportunityLenderJourneyCard
                key={group.key}
                group={group}
                onOpenOpportunity={onOpenOpportunity}
                onOpenDeal={onOpenDeal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
