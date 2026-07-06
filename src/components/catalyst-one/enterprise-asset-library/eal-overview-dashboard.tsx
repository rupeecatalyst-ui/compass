"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { EAL_RESERVED_EXTENSIONS } from "@/constants/enterprise-asset-lifecycle";
import { getEnterpriseAssetAuditTrail } from "@/lib/enterprise-asset-library/eal-store";
import { EalShell } from "@/components/catalyst-one/enterprise-asset-library/eal-shell";
import { EalKpiGrid } from "@/components/catalyst-one/enterprise-asset-library/eal-kpi-grid";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Library } from "lucide-react";

export function EalOverviewDashboard() {
  const recentAudit = getEnterpriseAssetAuditTrail().slice(0, 4);

  return (
    <EalShell
      title="Overview"
      description="Enterprise Asset Library — governed repository for all reusable enterprise assets. Foundation only."
      actions={
        <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link href={ROUTES.ADMIN_ENTERPRISE_ASSETS_REGISTRY}>
            <Library className="h-3.5 w-3.5" />
            Asset Registry
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="glass-card border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">EAL Foundation</CardTitle>
            <CardDescription>
              ADR-005: parent repository for reusable enterprise assets. Product Library compositionAssets[] references EAL assetIds at design-time. No asset-type engines in this sprint.
            </CardDescription>
          </CardHeader>
        </Card>

        <EalKpiGrid />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Reserved Extensions</CardTitle>
              <CardDescription>Future asset engines — Sprint 17+</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {EAL_RESERVED_EXTENSIONS.map((ext) => (
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
                    <p className="text-muted-foreground">{e.assetName} · {e.actor}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </EalShell>
  );
}
