"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { WORKFLOW_ENGINE_EXTENSIONS } from "@/constants/workflow-engine";
import { getWorkflowAuditTrail } from "@/lib/workflow-engine/workflow-store";
import { WorkflowEngineShell } from "@/components/catalyst-one/workflow-engine/workflow-engine-shell";
import { WorkflowKpiGrid } from "@/components/catalyst-one/workflow-engine/workflow-kpi-grid";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Library } from "lucide-react";

export function WorkflowOverviewDashboard() {
  const recentAudit = getWorkflowAuditTrail().slice(0, 4);

  return (
    <WorkflowEngineShell
      title="Overview"
      description="Metadata-driven workflow engine — platform execution foundation. Not a BPM designer."
      actions={
        <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link href={ROUTES.ADMIN_WORKFLOW_REGISTRY}>
            <Library className="h-3.5 w-3.5" />
            Workflow Registry
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="glass-card border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Execution Engine Foundation</CardTitle>
            <CardDescription>
              You are building the Engine — not the Coach, not CHANAKYA. Definitions only; no runtime execution in this sprint.
            </CardDescription>
          </CardHeader>
        </Card>

        <WorkflowKpiGrid />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Reserved Extensions</CardTitle>
              <CardDescription>Future capabilities — not implemented</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {WORKFLOW_ENGINE_EXTENSIONS.map((ext) => (
                <div key={ext.id} className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-2">
                  <span className="text-sm font-medium">{ext.label}</span>
                  <StatusPill variant="muted">{ext.status}</StatusPill>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Recent Audit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentAudit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit entries yet.</p>
              ) : (
                recentAudit.map((e) => (
                  <div key={e.id} className="rounded-lg border border-border/50 px-3 py-2 text-xs">
                    <p className="font-medium">{e.action}</p>
                    <p className="text-muted-foreground">{e.workflowName} · {e.actor}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </WorkflowEngineShell>
  );
}
