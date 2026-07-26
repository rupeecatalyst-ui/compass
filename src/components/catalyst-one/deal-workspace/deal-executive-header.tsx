"use client";

/**
 * CO-UX-020 / CO-UX-021 — Deal Workspace executive chrome (context only · Kanban-first).
 * CO-UX-021 — Borrower name never clips; shared left grid with Pipeline / Kanban.
 */

import { formatINR } from "@/lib/format-currency";
import {
  resolveOpportunityDisplayNumber,
  type DealExecutiveIntelligence,
} from "@/lib/deal-workspace/derive-deal-executive-intelligence";
import { DEAL_WORKSPACE_PAD_X } from "@/constants/deal-workspace-layout";
import type { DealPipelineRuntime } from "@/types/deal-pipeline-runtime";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { WorkspacePrimaryActions } from "@/components/catalyst-one/shared/workspace-primary-actions";
import { DealActionCenter } from "@/components/catalyst-one/action-center";

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
}) {
  const { context, deal, siblingDeals } = runtime;
  const borrowerName = context.customerName?.trim() || deal.dealNumber;
  const opportunityNumber = resolveOpportunityDisplayNumber(runtime);
  const lenderFocus =
    activeDeal.primaryCounterpartyName || activeDeal.dealNumber || "Deal";

  const identityBits = [
    opportunityNumber !== "—" ? opportunityNumber : null,
    deal.dealNumber ? `Deal ${deal.dealNumber}` : null,
    context.loanProduct || null,
    context.requiredAmount ? formatINR(context.requiredAmount) : null,
    `${siblingDeals.length} deal${siblingDeals.length === 1 ? "" : "s"}`,
    context.relationshipManager ? `RM ${context.relationshipManager}` : null,
  ].filter(Boolean);

  return (
    <header
      className={cn(
        "overflow-visible border-b border-border/70 bg-background/95 py-2",
        DEAL_WORKSPACE_PAD_X,
      )}
      data-layout="workspace-context"
      data-sprint="CO-UX-021"
    >
      {/*
        Flex (not equal grid fractions): identity is content-sized and never shrinks;
        CHANAKYA absorbs remaining width and compresses first under pressure.
      */}
      <div className="flex flex-col gap-1.5 sm:gap-2 lg:flex-row lg:items-center lg:gap-2 xl:gap-4 2xl:gap-6">
        {/* LEFT — Identity grows with content; never shrink / never ellipsis the name */}
        <section
          aria-label="Opportunity Summary"
          className="w-max max-w-full shrink-0 overflow-visible"
        >
          <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-violet-700/90 dark:text-violet-300/90">
            Opportunity
          </p>
          <h1
            className="mt-0.5 max-w-none whitespace-normal break-words text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg"
            title={borrowerName}
            data-borrower-name=""
          >
            {borrowerName}
          </h1>
          <p className="mt-0.5 max-w-[min(100%,28rem)] truncate text-[10px] leading-snug text-muted-foreground">
            {identityBits.join(" · ")}
          </p>
        </section>

        {/* CENTRE — CHANAKYA; absorbs leftover width and compresses first under pressure */}
        <section
          aria-label="CHANAKYA Executive Panel"
          className="min-w-0 flex-1 rounded-lg border border-teal-500/25 bg-teal-500/5 px-2.5 py-1.5 lg:min-w-[12rem]"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-200">
              <Sparkles className="h-3 w-3" aria-hidden />
              CHANAKYA LIVE
            </span>
            <span className="min-w-0 truncate text-[10px] text-muted-foreground">
              {lenderFocus}
            </span>
            <button
              type="button"
              onClick={onOpportunityHealthClick}
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-teal-800 hover:bg-teal-500/10 dark:text-teal-200"
            >
              Health {intelligence.opportunityHealthScore}% ·{" "}
              {intelligence.opportunityHealthLabel}
            </button>
            {intelligence.dealsRequiringAttention > 0 ? (
              <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                {intelligence.dealsRequiringAttention} need attention
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-foreground [overflow-wrap:anywhere]">
              <span className="text-muted-foreground">Next · </span>
              {intelligence.nextBestAction}
            </p>
            <DealActionCenter
              runtime={runtime}
              activeDeal={activeDeal}
              className="h-7 shrink-0 px-2.5 text-[11px]"
              onTimelineNote={onTimelineNote}
            />
          </div>
        </section>

        {/* RIGHT — Commands */}
        <section
          aria-label="Enterprise Command Panel"
          className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end"
        >
          <WorkspacePrimaryActions
            mode="editable"
            density="compact"
            saving={saving}
            onSave={onSave}
            onMyDeals={onMyDeals}
            onClose={onClose}
            className="justify-end"
          />
          <p className="hidden text-[9px] text-muted-foreground lg:block lg:text-right">
            Updated {intelligence.lastUpdatedLabel}
            {intelligence.successProbabilityLabel !== "—"
              ? ` · ${intelligence.successProbabilityLabel}`
              : ""}
          </p>
        </section>
      </div>
    </header>
  );
}
