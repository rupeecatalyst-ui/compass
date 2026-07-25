"use client";

import { OwGlassPanel, OwSectionLabel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import type { OwStrategicTabId } from "./strategic-tabs";
import { Button } from "@/components/ui/button";
import { displayOpportunityRequirementStageLabel } from "@/lib/lead-opportunity-journey/opportunity-field-display";

export function WorkspaceOverviewPanel({
  onOpenTab,
}: {
  onOpenTab: (tab: OwStrategicTabId) => void;
}) {
  const { productLabel, loanAmountLabel, selectedLender, stageCode, contact } =
    useOpportunityWorkspace();

  return (
    <div className="space-y-4">
      <OwGlassPanel>
        <OwSectionLabel>Strategic Overview</OwSectionLabel>
        <p className="mt-1 max-w-2xl text-sm text-zinc-300">
          How should this opportunity be structured for maximum probability of success? Analyse,
          qualify, design the financing strategy, and prepare the execution plan — then select
          lenders in Lender Strategy (LIFE).
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Customer" value={contact?.name ?? "—"} />
          <Stat label="Product" value={productLabel} />
          <Stat label="Requirement" value={loanAmountLabel} />
          <Stat label="Execution Queue" value={selectedLender?.lenderName ?? "Not selected"} />
        </div>
        <p className="mt-3 text-[11px] text-zinc-400">
          Strategic status ·{" "}
          <span className="capitalize text-zinc-200">
            {displayOpportunityRequirementStageLabel(stageCode)}
          </span>
        </p>
      </OwGlassPanel>

      <OwGlassPanel>
        <p className="text-xs font-semibold text-zinc-100">Continue planning</p>
        <p className="mt-0.5 text-[11px] text-zinc-400">
          Jump to a dedicated workspace — Overview content is hidden when another tab is active.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["customer", "Customer Profile"],
              ["requirement", "Requirement"],
              ["document_requests", "Document Requests"],
              ["product", "Solution Design"],
              ["funding_strategy", "Lender Strategy (LIFE)"],
              ["competition", "Competition"],
              ["notes", "Notes"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={id === "funding_strategy" ? "default" : "secondary"}
              className={
                id === "funding_strategy"
                  ? "h-8 bg-amber-600 text-xs text-white hover:bg-amber-500"
                  : "h-8 text-xs"
              }
              onClick={() => onOpenTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </OwGlassPanel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-zinc-50">{value}</p>
    </div>
  );
}
