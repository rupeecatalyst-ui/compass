"use client";

import { cn } from "@/lib/utils";
import type { OpportunityHealthBand } from "@/types/enterprise-opportunity-intelligence";
import { OwGlassPanel, OwInfoChip, OwSectionLabel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

const BAND_STYLES: Record<OpportunityHealthBand, string> = {
  excellent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  good: "bg-teal-500/15 text-teal-800 dark:text-teal-200",
  needs_attention: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  critical: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export function WorkspaceHeader() {
  const {
    opportunity,
    contact,
    stageCode,
    progressRatio,
    productLabel,
    loanAmountLabel,
    selectedLender,
    intelligence,
  } = useOpportunityWorkspace();

  const band = intelligence?.health.band ?? "needs_attention";
  const progressPct = Math.round(progressRatio * 100);

  return (
    <OwGlassPanel className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <OwSectionLabel>Opportunity Summary</OwSectionLabel>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {opportunity?.opportunityCode ?? "Opportunity"}
          </h1>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide",
            BAND_STYLES[band],
          )}
        >
          {band.replace(/_/g, " ")}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <OwInfoChip label="Opportunity No." value={opportunity?.opportunityCode ?? "—"} />
        <OwInfoChip label="Product" value={productLabel} className="capitalize" />
        <OwInfoChip label="Loan Amount" value={loanAmountLabel} />
        <OwInfoChip label="Customer" value={contact?.name ?? "—"} />
        <OwInfoChip label="Selected Lender" value={selectedLender?.lenderName ?? "Not selected"} />
        <OwInfoChip label="Relationship Manager" value="RM-001" />
        <OwInfoChip label="Current Stage" value={stageCode.replace(/_/g, " ")} className="capitalize" />
        <OwInfoChip label="Progress" value={`${progressPct}%`} />
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-teal-500 transition-all duration-500"
          style={{ width: `${Math.min(100, progressPct)}%` }}
        />
      </div>
    </OwGlassPanel>
  );
}
