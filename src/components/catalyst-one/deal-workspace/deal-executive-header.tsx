"use client";

/**
 * CO-UX-020 / CO-UX-021 / CO-UX-022 — Deal Workspace executive chrome (Kanban-first).
 * Compressed header · expandable CHANAKYA ribbon · single toolbar · one-line readiness.
 */

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Filter, History, ListFilter, Plus, Sparkles } from "lucide-react";
import { formatINR } from "@/lib/format-currency";
import {
  resolveOpportunityDisplayNumber,
  type DealExecutiveIntelligence,
} from "@/lib/deal-workspace/derive-deal-executive-intelligence";
import { DEAL_WORKSPACE_PAD_X } from "@/constants/deal-workspace-layout";
import type { DealPipelineRuntime } from "@/types/deal-pipeline-runtime";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WorkspacePrimaryActions } from "@/components/catalyst-one/shared/workspace-primary-actions";
import { DealActionCenter } from "@/components/catalyst-one/action-center";
import { DealReadinessStrip } from "@/components/catalyst-one/deal-workspace/deal-readiness-strip";
import { deriveDealReadiness } from "@/lib/deal-workspace/deal-workflow-validation";

export function DealExecutiveHeader({
  runtime,
  activeDeal,
  intelligence,
  saving,
  onSave,
  onMyDeals,
  onClose,
  onTimelineNote,
  onOpportunityHealthClick,
  onIdentifyLender,
  onViewOptions,
  onFilters,
  onViewActivity,
  activityTimelineOpen = false,
  dealCount,
}: {
  runtime: DealPipelineRuntime;
  activeDeal: EnterpriseDealApiRecord;
  intelligence: DealExecutiveIntelligence;
  saving?: boolean;
  onSave: () => void | Promise<void>;
  onMyDeals: () => void | Promise<void>;
  onClose: () => void;
  onTimelineNote?: (title: string, description: string) => void;
  onOpportunityHealthClick?: () => void;
  /** Merged pipeline actions into the single toolbar (CO-UX-022). */
  onIdentifyLender?: () => void;
  onViewOptions?: () => void;
  onFilters?: () => void;
  onViewActivity?: () => void;
  activityTimelineOpen?: boolean;
  dealCount?: number;
}) {
  const { context, deal, siblingDeals } = runtime;
  const borrowerName = context.customerName?.trim() || deal.dealNumber;
  const opportunityNumber = resolveOpportunityDisplayNumber(runtime);
  const lenderFocus =
    activeDeal.primaryCounterpartyName || activeDeal.dealNumber || "Deal";
  const [chanakyaOpen, setChanakyaOpen] = useState(false);

  const readiness = useMemo(
    () =>
      deriveDealReadiness({
        customerName: context.customerName,
        loanProduct: context.loanProduct || activeDeal.productLabel,
        lenderId: activeDeal.lenderId,
        lenderProgramId: activeDeal.lenderProgramId,
        grossStage: activeDeal.grossStage,
        invoicePartyId: activeDeal.invoicePartyId,
        commissionAccountingPayeeId: activeDeal.commissionAccountingPayeeId,
      }),
    [activeDeal, context.customerName, context.loanProduct],
  );

  const identityBits = [
    opportunityNumber !== "—" ? opportunityNumber : null,
    deal.dealNumber ? `Deal ${deal.dealNumber}` : null,
    context.loanProduct || null,
    context.requiredAmount ? formatINR(context.requiredAmount) : null,
    `${siblingDeals.length} deal${siblingDeals.length === 1 ? "" : "s"}`,
    context.relationshipManager ? `RM ${context.relationshipManager}` : null,
  ].filter(Boolean);

  const activeDeals = dealCount ?? siblingDeals.length;

  return (
    <header
      className={cn(
        "overflow-visible border-b border-border/70 bg-background/95 py-1",
        DEAL_WORKSPACE_PAD_X,
      )}
      data-layout="workspace-context"
      data-sprint="CO-UX-022"
    >
      {/* Row 1 — Identity (half-height) · CHANAKYA ribbon · merged toolbar */}
      <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-2">
        <section
          aria-label="Opportunity Summary"
          className="w-max max-w-full shrink-0 overflow-visible"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-violet-700/90 dark:text-violet-300/90">
              Opportunity
            </p>
            <h1
              className="max-w-none whitespace-normal break-words text-sm font-semibold leading-tight tracking-tight text-foreground sm:text-[15px]"
              title={borrowerName}
              data-borrower-name=""
            >
              {borrowerName}
            </h1>
          </div>
          <p className="mt-0 max-w-[min(100%,32rem)] truncate text-[9px] leading-tight text-muted-foreground">
            {identityBits.join(" · ")}
          </p>
        </section>

        {/* Compact CHANAKYA notification ribbon — expands on demand */}
        <section
          aria-label="CHANAKYA Live Intelligence"
          className="min-w-0 flex-1"
        >
          <button
            type="button"
            className={cn(
              "flex w-full min-w-0 items-center gap-1.5 rounded-md border border-teal-500/25 bg-teal-500/5 px-2 py-0.5 text-left",
              "hover:bg-teal-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40",
            )}
            aria-expanded={chanakyaOpen}
            onClick={() => setChanakyaOpen((v) => !v)}
          >
            <Sparkles className="h-3 w-3 shrink-0 text-teal-700 dark:text-teal-300" aria-hidden />
            <span className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-200">
              CHANAKYA LIVE
            </span>
            <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
              {lenderFocus}
              <span className="mx-1 text-border">·</span>
              <span className="font-medium text-teal-800 dark:text-teal-200">
                Health {intelligence.opportunityHealthScore}%
              </span>
              {intelligence.dealsRequiringAttention > 0 ? (
                <>
                  <span className="mx-1 text-border">·</span>
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    {intelligence.dealsRequiringAttention} need attention
                  </span>
                </>
              ) : null}
              <span className="mx-1 text-border">·</span>
              <span className="text-foreground/80">Next · {intelligence.nextBestAction}</span>
            </span>
            {chanakyaOpen ? (
              <ChevronUp className="h-3 w-3 shrink-0 text-teal-700/80" aria-hidden />
            ) : (
              <ChevronDown className="h-3 w-3 shrink-0 text-teal-700/80" aria-hidden />
            )}
          </button>
          {chanakyaOpen ? (
            <div className="mt-1 space-y-1 rounded-md border border-teal-500/20 bg-teal-500/5 px-2 py-1.5">
              <p className="text-[11px] font-medium leading-snug text-foreground [overflow-wrap:anywhere]">
                <span className="text-muted-foreground">Next best action · </span>
                {intelligence.nextBestAction}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onOpportunityHealthClick}
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-teal-800 hover:bg-teal-500/10 dark:text-teal-200"
                >
                  Health {intelligence.opportunityHealthScore}% ·{" "}
                  {intelligence.opportunityHealthLabel}
                </button>
                <span className="text-[9px] text-muted-foreground">
                  Updated {intelligence.lastUpdatedLabel}
                  {intelligence.successProbabilityLabel !== "—"
                    ? ` · ${intelligence.successProbabilityLabel}`
                    : ""}
                </span>
              </div>
            </div>
          ) : null}
        </section>

        {/* Single merged toolbar — pipeline + Action Center + workspace commands */}
        <section
          aria-label="Deal Workspace Toolbar"
          className="flex shrink-0 flex-wrap items-center justify-end gap-1"
        >
          {onIdentifyLender ? (
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 bg-teal-700 px-2 text-[10px] text-white hover:bg-teal-600"
              onClick={onIdentifyLender}
            >
              <Plus className="h-3 w-3" aria-hidden />
              Identify Lender
            </Button>
          ) : null}
          {onViewOptions ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-1.5 text-[10px]"
              onClick={onViewOptions}
            >
              <ListFilter className="h-3 w-3" aria-hidden />
              View
            </Button>
          ) : null}
          {onFilters ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-1.5 text-[10px]"
              onClick={onFilters}
            >
              <Filter className="h-3 w-3" aria-hidden />
              Filters
            </Button>
          ) : null}
          {onViewActivity ? (
            <Button
              type="button"
              size="sm"
              variant={activityTimelineOpen ? "secondary" : "outline"}
              className="h-7 gap-1 px-1.5 text-[10px]"
              data-deal-activity-action=""
              aria-expanded={activityTimelineOpen}
              aria-controls="deal-activity-timeline-panel"
              onClick={onViewActivity}
            >
              <History className="h-3 w-3" aria-hidden />
              Activity
            </Button>
          ) : null}
          <DealActionCenter
            runtime={runtime}
            activeDeal={activeDeal}
            className="h-7 shrink-0 px-2 text-[10px]"
            onTimelineNote={onTimelineNote}
            onViewActivity={onViewActivity}
          />
          <WorkspacePrimaryActions
            mode="editable"
            density="compact"
            saving={saving}
            onSave={onSave}
            onMyDeals={onMyDeals}
            onClose={onClose}
            className="justify-end"
          />
        </section>
      </div>

      {/* Row 2 — Pipeline title + single-line readiness */}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
        <p className="truncate text-[11px] font-semibold tracking-tight text-foreground">
          Lender Pipeline (Execution)
          <span className="ml-1.5 font-normal text-muted-foreground">
            {activeDeals > 0 ? `· ${activeDeals} active` : ""}
          </span>
        </p>
        <DealReadinessStrip className="min-w-0 flex-1 sm:max-w-md sm:flex-none" readiness={readiness} />
      </div>
    </header>
  );
}
