"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { PRODUCT_LIBRARY_EXTENSIONS } from "@/constants/product-library-lifecycle";
import { getProductAuditTrail } from "@/lib/product-library/product-store";
import { ProductLibraryShell } from "@/components/catalyst-one/product-library/product-library-shell";
import { ProductLibraryKpiGrid } from "@/components/catalyst-one/product-library/product-library-kpi-grid";
import { ProductCompositionSummary } from "@/components/catalyst-one/product-library/product-composition-summary";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Library } from "lucide-react";

export function ProductLibraryOverviewDashboard() {
  const recentAudit = getProductAuditTrail().slice(0, 4);

  return (
    <ProductLibraryShell
      title="Overview"
      description="Enterprise Product Library Factory — governed definitions for every business product. Not loan configuration."
      actions={
        <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link href={ROUTES.ADMIN_PRODUCT_REGISTRY}>
            <Library className="h-3.5 w-3.5" />
            Product Registry
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="glass-card border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Product Composition Engine</CardTitle>
            <CardDescription>
              Products are enterprise composition blueprints. Policies, workflows, rules, and packs are referenced by ID only — no duplicated business logic.
            </CardDescription>
          </CardHeader>
        </Card>

        <ProductLibraryKpiGrid />

        <ProductCompositionSummary />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Reserved Extensions</CardTitle>
              <CardDescription>Future capabilities — not implemented in this sprint</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {PRODUCT_LIBRARY_EXTENSIONS.map((ext) => (
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
                    <p className="text-muted-foreground">{e.productName} · {e.actor}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProductLibraryShell>
  );
}
