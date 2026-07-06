"use client";

import { getProductAuditTrail } from "@/lib/product-library/product-store";
import { ProductLibraryShell } from "@/components/catalyst-one/product-library/product-library-shell";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ProductAuditView() {
  const audit = getProductAuditTrail();

  return (
    <ProductLibraryShell
      title="Audit Trail"
      description="Append-only log of product definition governance actions."
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{audit.length} audit entry(ies)</p>
        <Card className="glass-card overflow-hidden border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-medium">{e.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{e.versionLabel}</TableCell>
                  <TableCell className="text-xs">{e.action}</TableCell>
                  <TableCell className="text-xs">{e.actor}</TableCell>
                  <TableCell className="text-xs">{e.field ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.oldValue && e.newValue ? `${e.oldValue} → ${e.newValue}` : "—"}
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
