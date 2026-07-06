"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import {
  PRODUCT_LIFECYCLE_LABELS,
  PRODUCT_LIFECYCLE_PILL_VARIANT,
  PRODUCT_OPERATIONAL_PILL_VARIANT,
  PRODUCT_OPERATIONAL_STATUS_LABELS,
} from "@/constants/product-library-lifecycle";
import { searchProductRegistry } from "@/lib/product-library/product-store";
import { ProductLibraryShell } from "@/components/catalyst-one/product-library/product-library-shell";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ProductRegistryView() {
  const [query, setQuery] = useState("");
  const registry = useMemo(() => searchProductRegistry(query), [query]);

  return (
    <ProductLibraryShell
      title="Product Registry"
      description="Enterprise catalog of metadata-driven product definitions."
      showSearch
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search product code, name, category, owner..."
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{registry.length} product definition(s)</p>
        <Card className="glass-card overflow-hidden border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Deps</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registry.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell className="font-mono text-xs">{row.productCode}</TableCell>
                  <TableCell className="max-w-[12rem] truncate text-xs font-medium">{row.productName}</TableCell>
                  <TableCell className="text-xs">{row.categoryName}</TableCell>
                  <TableCell className="text-xs">{row.groupName}</TableCell>
                  <TableCell className="font-mono text-xs">{row.latestVersionLabel}</TableCell>
                  <TableCell>
                    <StatusPill variant={PRODUCT_LIFECYCLE_PILL_VARIANT[row.lifecycleStatus]}>
                      {PRODUCT_LIFECYCLE_LABELS[row.lifecycleStatus]}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={PRODUCT_OPERATIONAL_PILL_VARIANT[row.operationalStatus]}>
                      {PRODUCT_OPERATIONAL_STATUS_LABELS[row.operationalStatus]}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-xs">{row.productOwner}</TableCell>
                  <TableCell className="text-xs">{row.dependencyCount}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                      <Link href={`${ROUTES.ADMIN_PRODUCT_REGISTRY}/${row.productId}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </ProductLibraryShell>
  );
}
