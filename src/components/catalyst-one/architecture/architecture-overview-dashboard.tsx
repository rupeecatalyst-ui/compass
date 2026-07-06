"use client";

import Link from "next/link";
import { FUTURE_MODULE_HOOKS } from "@/config/architecture-navigation";
import { ROUTES } from "@/constants/routes";
import { ArchitectureShell } from "@/components/catalyst-one/architecture/architecture-shell";
import { ArchitectureKpiGrid } from "@/components/catalyst-one/architecture/architecture-kpi-grid";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const QUICK_LINKS = [
  { title: "Compliance", href: ROUTES.ADMIN_ARCHITECTURE_COMPLIANCE, description: "Evaluate artifacts against architecture rules" },
  { title: "Registry", href: ROUTES.ADMIN_ARCHITECTURE_REGISTRY, description: "Browse the enterprise artifact catalog" },
  { title: "Performance", href: ROUTES.ADMIN_ARCHITECTURE_PERFORMANCE, description: "View design-time performance budgets" },
  { title: "Documentation", href: ROUTES.ADMIN_ARCHITECTURE_DOCUMENTATION, description: "Documentation readiness for SAGE" },
  { title: "Health", href: ROUTES.ADMIN_ARCHITECTURE_HEALTH, description: "Platform health and extension hooks" },
];

export function ArchitectureOverviewDashboard() {
  return (
    <ArchitectureShell
      title="Architecture Overview"
      description="CARB v1 — Enterprise Architecture Foundation. Design-time intelligence for Catalyst One CEOS."
    >
      <div className="space-y-6">
        <ArchitectureKpiGrid />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Card key={link.href} className="glass-card border-border/60 transition-all hover:border-primary/25">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{link.title}</CardTitle>
                <CardDescription className="text-xs">{link.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                  <Link href={link.href}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Architectural Principles</CardTitle>
            <CardDescription>Runtime executes. Architecture thinks. Never confuse the two.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <li>Runtime performance comes first</li>
              <li>Architecture intelligence belongs to design-time</li>
              <li>Never introduce runtime graph traversal</li>
              <li>Prefer metadata over hardcoded behavior</li>
              <li>Every artifact must be version-ready</li>
              <li>Design for millions of transactions, thousands of tenants</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Reserved Integrations</CardTitle>
            <CardDescription>Extension hooks for future platform modules — not implemented in CARB v1</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {FUTURE_MODULE_HOOKS.map((hook) => (
              <div
                key={hook.id}
                className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-2"
              >
                <span className="text-sm font-medium">{hook.label}</span>
                <StatusPill variant="muted">{hook.status}</StatusPill>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ArchitectureShell>
  );
}
