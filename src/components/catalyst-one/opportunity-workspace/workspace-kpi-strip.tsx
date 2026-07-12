"use client";

import { OwGlassPanel, OwKpiCard, OwSectionLabel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

export function WorkspaceKpiStrip() {
  const { intelligence, overdueTaskCount } = useOpportunityWorkspace();
  const kpis = intelligence?.kpis;

  return (
    <OwGlassPanel>
      <OwSectionLabel>Live KPIs</OwSectionLabel>
      <div className="mt-3 flex flex-wrap gap-2">
        <OwKpiCard
          label="Pulse"
          value={kpis?.pulseLabel ?? "—"}
          tone={
            kpis?.pulseLabel === "critical" || kpis?.pulseLabel === "high"
              ? "critical"
              : kpis?.pulseLabel === "moderate"
                ? "warn"
                : "good"
          }
        />
        <OwKpiCard
          label="Health Score"
          value={kpis ? `${kpis.healthScore}` : "—"}
          tone={
            (kpis?.healthScore ?? 0) >= 70 ? "good" : (kpis?.healthScore ?? 0) >= 45 ? "warn" : "critical"
          }
        />
        <OwKpiCard label="Opportunity Age" value={kpis ? `${kpis.opportunityAgeDays}d` : "—"} />
        <OwKpiCard
          label="Pending Documents"
          value={kpis ? `${kpis.pendingDocuments}` : "—"}
          tone={(kpis?.pendingDocuments ?? 0) > 0 ? "warn" : "good"}
        />
        <OwKpiCard label="Open Tasks" value={kpis ? `${kpis.openTasks}` : "—"} tone="info" />
        <OwKpiCard
          label="Overdue Tasks"
          value={`${overdueTaskCount}`}
          tone={overdueTaskCount > 0 ? "critical" : "good"}
        />
        <OwKpiCard label="Last Activity" value={kpis?.lastActivityLabel ?? "—"} />
        <OwKpiCard label="Assigned RM" value={kpis?.assignedRm ?? "RM-001"} />
      </div>
    </OwGlassPanel>
  );
}
