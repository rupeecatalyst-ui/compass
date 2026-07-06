"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { ATLAS_RESERVED_EXTENSIONS } from "@/constants/atlas";
import { ArchitectureShell } from "@/components/catalyst-one/architecture/architecture-shell";
import { AtlasKpiGrid } from "@/components/catalyst-one/atlas/atlas-kpi-grid";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AtlasDashboard() {
  return (
    <ArchitectureShell
      title="ATLAS"
      description="Architectural Topology, Lifecycle & Asset System — enterprise architecture catalog. Design-time only."
      actions={
        <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link href={ROUTES.ADMIN_ARCHITECTURE_ATLAS_EXPLORER}>
            <Search className="h-3.5 w-3.5" />
            Asset Explorer
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="glass-card border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ATLAS v0.1</CardTitle>
            <CardDescription>
              ATLAS exists to help architects think. CORE exists to execute. Never mix the two.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Lightweight architecture registry — not a graph database, not a runtime engine.
            Platform artifacts are registered automatically when created in Rule Library, Policy Library, and future modules.
          </CardContent>
        </Card>

        <AtlasKpiGrid />

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Reserved Extension Points</CardTitle>
            <CardDescription>Not implemented in v0.1 — placeholders only</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ATLAS_RESERVED_EXTENSIONS.map((ext) => (
              <div
                key={ext.id}
                className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-2"
              >
                <span className="text-sm font-medium">{ext.label}</span>
                <StatusPill variant="muted">{ext.status}</StatusPill>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ArchitectureShell>
  );
}
