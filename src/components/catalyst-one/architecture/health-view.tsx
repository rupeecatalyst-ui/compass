"use client";

import {
  ATLAS_INTEGRATION_RESERVED,
  COMPASS_INTEGRATION_RESERVED,
  FORGE_INTEGRATION_RESERVED,
  getEnterpriseIdPrefixes,
} from "@/constants/enterprise-architecture";
import { FUTURE_MODULE_HOOKS } from "@/config/architecture-navigation";
import { getArchitectureDashboardMetrics } from "@/lib/enterprise-architecture/registry-store";
import { ArchitectureShell } from "@/components/catalyst-one/architecture/architecture-shell";
import { ArchitectureKpiGrid } from "@/components/catalyst-one/architecture/architecture-kpi-grid";
import { ComplianceScoreBadge } from "@/components/catalyst-one/architecture/compliance-score-badge";
import { StatusPill } from "@/components/design-system/status-pill";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function HealthView() {
  const metrics = getArchitectureDashboardMetrics();
  const prefixes = getEnterpriseIdPrefixes();

  return (
    <ArchitectureShell
      title="Architecture Health"
      description="Platform health indicators and reserved extension hooks for future modules."
    >
      <div className="space-y-6">
        <ArchitectureKpiGrid />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="text-base">CARB Health Summary</CardTitle>
              <CardDescription>Composite design-time health score</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Overall Health</span>
                <ComplianceScoreBadge score={metrics.healthScore} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Compliance Average</span>
                <ComplianceScoreBadge score={metrics.averageComplianceScore} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Active / Total</span>
                <span className="font-mono">{metrics.activeArtifacts} / {metrics.totalArtifacts}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Future Module Hooks</CardTitle>
              <CardDescription>Extension points only — not implemented</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {FUTURE_MODULE_HOOKS.map((hook) => (
                <div
                  key={hook.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{hook.label}</p>
                    <p className="text-[10px] text-muted-foreground">{hook.description}</p>
                  </div>
                  <StatusPill variant="muted">{hook.status}</StatusPill>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Enterprise ID Prefix Registry</CardTitle>
            <CardDescription>
              Metadata-driven prefixes — ATLAS {ATLAS_INTEGRATION_RESERVED ? "(reserved)" : ""},
              FORGE {FORGE_INTEGRATION_RESERVED ? "(reserved)" : ""},
              COMPASS {COMPASS_INTEGRATION_RESERVED ? "(reserved)" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {prefixes.map((p) => (
                <span
                  key={p.code}
                  className="rounded-md border border-border/60 bg-muted/20 px-2 py-1 font-mono text-xs"
                  title={p.description}
                >
                  {p.code}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ArchitectureShell>
  );
}
