"use client";

import { ASSIGNMENT_STRATEGY_LABELS } from "@/constants/workflow-engine";
import { getAssignmentStrategies } from "@/lib/workflow-engine/workflow-store";
import { WorkflowEngineShell } from "@/components/catalyst-one/workflow-engine/workflow-engine-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkflowSettingsView() {
  const strategies = getAssignmentStrategies();

  return (
    <WorkflowEngineShell title="Settings" description="Assignment strategies and engine configuration metadata.">
      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Assignment Strategies</CardTitle>
          <CardDescription>Metadata-driven assignment resolution — no runtime execution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {strategies.map((s) => (
            <div key={s.id} className="rounded-lg border border-border/50 px-4 py-3">
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">{ASSIGNMENT_STRATEGY_LABELS[s.strategyType]} · {s.description}</p>
              {s.configRef && <p className="mt-1 font-mono text-[10px] text-muted-foreground">config: {s.configRef}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </WorkflowEngineShell>
  );
}
