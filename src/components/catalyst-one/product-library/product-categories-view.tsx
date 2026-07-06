"use client";

import { getProductCategories, getProductGroupsForCategory } from "@/lib/product-library/product-store";
import { ProductLibraryShell } from "@/components/catalyst-one/product-library/product-library-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/design-system/status-pill";

export function ProductCategoriesView() {
  const categories = getProductCategories();

  return (
    <ProductLibraryShell
      title="Categories & Groups"
      description="Taxonomy for organizing product definitions across the enterprise."
    >
      <div className="space-y-4">
        {categories.map((cat) => {
          const groups = getProductGroupsForCategory(cat.id);
          return (
            <Card key={cat.id} className="glass-card border-border/60">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{cat.categoryName}</CardTitle>
                  <StatusPill variant="muted">{cat.categoryCode}</StatusPill>
                  {!cat.enabled && <StatusPill variant="warning">Disabled</StatusPill>}
                </div>
                <CardDescription>{cat.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group Code</TableHead>
                      <TableHead>Group Name</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-xs text-muted-foreground">No groups defined.</TableCell>
                      </TableRow>
                    ) : (
                      groups.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="font-mono text-xs">{g.groupCode}</TableCell>
                          <TableCell className="text-xs font-medium">{g.groupName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{g.description}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ProductLibraryShell>
  );
}
