"use client";

/**
 * CO-C1-DEALS-JOURNEY-001 — One Opportunity / customer card with lender Deal rows.
 */

import { ArrowRight } from "lucide-react";
import {
  LenderJourneyAxisHeader,
  LenderJourneyRailway,
} from "@/components/catalyst-one/my-deals/lender-journey-railway";
import { getJourneySegmentLabel } from "@/constants/enterprise-deal-journey-progress";
import { ENTERPRISE_JOURNEY_SEGMENTS } from "@/constants/enterprise-deal-journey-progress";
import {
  formatDealBusinessSource,
  resolveLenderDealContactName,
} from "@/lib/my-deals/lender-deal-contact";
import type { OpportunityRegistryGroup } from "@/lib/my-deals/group-opportunities";
import { cn } from "@/lib/utils";
import type { DealRegistryRow } from "@/types/deal-registry";

type Props = {
  group: OpportunityRegistryGroup;
  onOpenOpportunity: (group: OpportunityRegistryGroup) => void;
  onOpenDeal: (row: DealRegistryRow, group: OpportunityRegistryGroup) => void;
};

function opportunityStageLabel(group: OpportunityRegistryGroup): string {
  const idx = Math.max(
    0,
    Math.min(group.maxProgressFilled - 1, ENTERPRISE_JOURNEY_SEGMENTS.length - 1),
  );
  const segment = ENTERPRISE_JOURNEY_SEGMENTS[idx];
  if (segment) return getJourneySegmentLabel(segment.id);
  return group.deals[0]?.grossStageLabel || "—";
}

export function OpportunityLenderJourneyCard({
  group,
  onOpenOpportunity,
  onOpenDeal,
}: Props) {
  const head = group.deals[0];
  const sourceLine = head ? formatDealBusinessSource(head) : "Not Specified";
  const stageLabel = opportunityStageLabel(group);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950/90 shadow-[0_0_0_1px_rgba(39,39,42,0.6)]",
        group.needsAttention && "border-amber-700/50",
      )}
      data-opportunity-key={group.key}
    >
      <button
        type="button"
        onClick={() => onOpenOpportunity(group)}
        className="flex w-full flex-col gap-1 border-b border-zinc-800/80 bg-gradient-to-r from-zinc-900/90 via-zinc-950 to-zinc-950 px-4 py-3 text-left transition-colors hover:from-zinc-900 hover:via-zinc-900/80"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <h3 className="truncate text-base font-semibold tracking-tight text-zinc-50">
              {group.borrowerName}
            </h3>
            <p className="font-mono text-[11px] text-teal-400/90">{group.opportunityNumber}</p>
          </div>
          <span className="shrink-0 rounded-md border border-zinc-700/80 bg-zinc-900 px-2 py-1 text-[10px] font-medium text-zinc-300">
            Open Opportunity →
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          <span>
            <span className="text-zinc-500">Product · </span>
            <span className="text-zinc-200">{group.product}</span>
          </span>
          <span>
            <span className="text-zinc-500">Amount · </span>
            <span className="font-medium tabular-nums text-zinc-100">
              {group.loanAmountLabel}
            </span>
          </span>
          <span>
            <span className="text-zinc-500">Source · </span>
            <span className="text-zinc-200">{sourceLine}</span>
          </span>
          <span>
            <span className="text-zinc-500">Stage · </span>
            <span className="text-zinc-200">{stageLabel}</span>
          </span>
          <span>
            <span className="text-zinc-500">Created · </span>
            <span className="text-zinc-300">
              {head?.dateCreatedLabel || "—"}
            </span>
          </span>
          <span>
            <span className="text-zinc-500">Updated · </span>
            <span className="text-zinc-300">
              {group.executive.lastActivityLabel || head?.lastActivityLabel || "—"}
            </span>
          </span>
        </div>
      </button>

      <div className="px-3 py-2">
        {group.deals.length === 0 ? (
          <p className="px-1 py-4 text-center text-[12px] text-zinc-500">
            No lenders identified yet for this Opportunity.
          </p>
        ) : (
          <>
            <div className="mb-1 hidden items-center gap-3 px-1 md:flex">
              <div className="w-[140px] shrink-0" />
              <div className="w-[120px] shrink-0" />
              <LenderJourneyAxisHeader />
              <div className="w-[132px] shrink-0" />
            </div>
            <ul className="divide-y divide-zinc-800/70">
              {group.deals.map((deal) => {
                const contact = resolveLenderDealContactName(deal);
                return (
                  <li key={deal.enterpriseDealId || deal.id}>
                    <div className="flex flex-col gap-2 px-1 py-2.5 md:flex-row md:items-center md:gap-3">
                      <div className="w-full shrink-0 md:w-[140px]">
                        <p className="truncate text-[13px] font-semibold text-zinc-100">
                          {deal.selectedLender && deal.selectedLender !== "—"
                            ? deal.selectedLender
                            : "Lender not specified"}
                        </p>
                        <p className="truncate font-mono text-[10px] text-zinc-500">
                          {deal.dealId}
                        </p>
                      </div>
                      <div className="w-full shrink-0 md:w-[120px]">
                        <p
                          className={cn(
                            "truncate text-[12px]",
                            contact === "Unassigned"
                              ? "italic text-zinc-500"
                              : "text-zinc-300",
                          )}
                        >
                          {contact}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1 overflow-x-auto">
                        <LenderJourneyRailway
                          pipelineStage={deal.grossStage}
                          lenderCaseStage={deal.grossStage}
                          status={String(deal.status)}
                        />
                      </div>
                      <div className="shrink-0 md:w-[132px] md:text-right">
                        <button
                          type="button"
                          onClick={() => onOpenDeal(deal, group)}
                          className="inline-flex items-center gap-1 rounded-md border border-teal-700/50 bg-teal-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-teal-300 transition-colors hover:border-teal-500/70 hover:bg-teal-900/50 hover:text-teal-100"
                        >
                          Workspace
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </article>
  );
}
