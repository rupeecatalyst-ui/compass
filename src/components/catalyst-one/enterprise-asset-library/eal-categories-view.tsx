"use client";

import { getEnterpriseAssetCategories } from "@/lib/enterprise-asset-library/eal-store";
import { EalShell } from "@/components/catalyst-one/enterprise-asset-library/eal-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/design-system/status-pill";

export function EalCategoriesView() {
  const categories = getEnterpriseAssetCategories();

  return (
    <EalShell
      title="Categories"
      description="Generic asset categories — not hardcoded to a single asset type."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((cat) => (
          <Card key={cat.id} className="glass-card border-border/60">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{cat.categoryName}</CardTitle>
                <StatusPill variant="muted">{cat.categoryCode}</StatusPill>
              </div>
              <CardDescription>{cat.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs text-muted-foreground">{cat.id}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </EalShell>
  );
}
