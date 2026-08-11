"use client";

/**
 * CO-C1-DASH-001 — My Performance (EBI / ETE productivity only — no invented formulas).
 */

import { useMemo } from "react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { formatINRCompact } from "@/lib/format-currency";
import { composeRmWorkspaceSnapshot } from "@/lib/enterprise-rm-workspace";

export function MyPerformanceSection() {
  const { user } = useAuthContext();
  const snap = useMemo(() => composeRmWorkspaceSnapshot(user), [user]);
  const { pipeline, productivity } = snap;

  const metrics = [
    { label: "Opportunities", value: String(pipeline.myOpportunities) },
    { label: "Active Deals", value: String(pipeline.myActiveDeals) },
    {
      label: "Approval Conversion",
      value: `${pipeline.conversionRatePct.toFixed(1)}%`,
    },
    { label: "Disbursement", value: String(pipeline.myDisbursals) },
    { label: "Pipeline Value", value: formatINRCompact(pipeline.pipelineValue) },
    {
      label: "Average TAT",
      value: `${pipeline.averageTatDays.toFixed(1)} days`,
    },
    {
      label: "Tasks completed today",
      value: String(productivity.tasksCompletedToday),
    },
    {
      label: "Cases closed",
      value: String(productivity.casesClosed),
    },
  ];

  return (
    <section
      aria-label="My Performance"
      data-widget-slot="my_performance"
      data-sprint="CO-C1-DASH-001"
      className="space-y-3"
    >
      <div>
        <h2 className="text-sm font-semibold tracking-tight">My Performance</h2>
        <p className="text-[12px] text-muted-foreground">
          Authoritative EBI / ETE metrics for your desk — no parallel KPI engine.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground">{m.label}</p>
              <p className="text-xl font-semibold tabular-nums">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-1 p-4 text-sm">
          <p>{productivity.pipelineMovementLabel}</p>
          <p className="text-muted-foreground">{productivity.weeklyTrendLabel}</p>
        </CardContent>
      </Card>
    </section>
  );
}
