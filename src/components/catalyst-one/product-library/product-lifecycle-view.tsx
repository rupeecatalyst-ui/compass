"use client";

import { PRODUCT_LIFECYCLE_LABELS, PRODUCT_LIFECYCLE_ORDER } from "@/constants/product-library-lifecycle";
import { getProductsByLifecycleStatus } from "@/lib/product-library/product-store";
import { ProductLibraryShell } from "@/components/catalyst-one/product-library/product-library-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/design-system/status-pill";
import type { ProductLifecycleStatus } from "@/types/product-library";

const LIFECYCLE_DESCRIPTIONS: Record<ProductLifecycleStatus, string> = {
  draft: "Initial authoring — not yet submitted for governance review.",
  review: "Under governance review by product and risk stakeholders.",
  approved: "Approved for publication — awaiting go-live.",
  published: "Active governed definition available to consuming modules.",
  deprecated: "Superseded — existing references retained, no new bindings.",
  archived: "Immutable historical record — read-only.",
};

export function ProductLifecycleView() {
  return (
    <ProductLibraryShell
      title="Lifecycle"
      description="Governed product definition lifecycle — design-time only."
    >
      <div className="space-y-6">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Lifecycle Pipeline</CardTitle>
            <CardDescription>Draft → Review → Approved → Published → Deprecated → Archived</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {PRODUCT_LIFECYCLE_ORDER.map((stage, i) => (
                <div key={stage} className="flex items-center gap-2">
                  <StatusPill variant="info">{PRODUCT_LIFECYCLE_LABELS[stage]}</StatusPill>
                  {i < PRODUCT_LIFECYCLE_ORDER.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PRODUCT_LIFECYCLE_ORDER.map((stage) => {
            const products = getProductsByLifecycleStatus(stage);
            return (
              <Card key={stage} className="glass-card border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{PRODUCT_LIFECYCLE_LABELS[stage]}</CardTitle>
                  <CardDescription className="text-xs">{LIFECYCLE_DESCRIPTIONS[stage]}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-2xl font-bold">{products.length}</p>
                  {products.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {products.slice(0, 5).map((p) => (
                        <li key={p.productId}>{p.productName}</li>
                      ))}
                      {products.length > 5 && <li>+{products.length - 5} more</li>}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </ProductLibraryShell>
  );
}
