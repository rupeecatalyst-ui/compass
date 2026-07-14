"use client";

import { OwGlassPanel, OwPanelHeader, OwSectionLabel } from "./workspace-design";
import { WorkspaceCompassCentrepiece } from "./workspace-compass-centrepiece";
import { WorkspaceKpiStrip } from "./workspace-kpi-strip";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import type { OwStrategicTabId } from "./strategic-tabs";
import { Button } from "@/components/ui/button";

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
          Plan and qualify this opportunity before execution. Move through Customer → Requirement → Product →
          Funding Strategy with CHANAKYA on the right.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Customer" value={contact?.name ?? "—"} />
          <Stat label="Product" value={productLabel} />
          <Stat label="Requirement" value={loanAmountLabel} />
          <Stat label="Funding" value={selectedLender?.lenderName ?? "Not selected"} />
        </div>
        <p className="mt-3 text-[11px] text-zinc-400">
          Current planning stage · <span className="capitalize text-zinc-200">{stageCode.replace(/_/g, " ")}</span>
        </p>
      </OwGlassPanel>

      <WorkspaceCompassCentrepiece />
      <WorkspaceKpiStrip />

      <OwGlassPanel>
        <OwPanelHeader
          title="Continue planning"
          description="Jump to the next strategic surface — only one workspace pane is active at a time."
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["customer", "Customer"],
              ["requirement", "Requirement"],
              ["funding_strategy", "Funding Strategy"],
              ["documents", "Documents"],
              ["tasks", "Tasks"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
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
