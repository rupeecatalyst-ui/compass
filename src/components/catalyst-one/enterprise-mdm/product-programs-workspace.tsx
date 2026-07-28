"use client";

/**
 * CO-MDM-001 — Product Programs desk (Product + Lender programs).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import { listProductMaster } from "@/lib/enterprise-product-master/admin-client";
import { ROUTES } from "@/constants/routes";
import { PageHeader } from "@/components/design-system/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProgramRow = {
  id: string;
  code: string;
  label: string;
  lenderId?: string;
  productCode?: string | null;
  productId?: string | null;
  enabled?: boolean;
  status?: string;
};

export function ProductProgramsWorkspace() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [products, setProducts] = useState<{ code: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [progRes, prodRes] = await Promise.all([
        lenderRegistryClient.queryPrograms({ pageSize: 200 }),
        listProductMaster().catch(() => ({ items: [] as { code: string; label: string }[] })),
      ]);
      setPrograms((progRes.items ?? []) as ProgramRow[]);
      setProducts(
        (prodRes.items ?? []).map((p: { code: string; label: string }) => ({
          code: p.code,
          label: p.label,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load programs");
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const productLabel = (code: string | null | undefined) =>
    products.find((p) => p.code === code)?.label ?? code ?? "—";

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Product Programs"
        description="Programs belong to a Product and a Lender (e.g. Commercial Purchase → SBI Commercial Purchase). Create and edit programs from Lender Registry."
        actions={
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
            <Button type="button" size="sm" asChild>
              <Link href={ROUTES.ADMIN_LENDER_REGISTRY}>Open Lender Registry</Link>
            </Button>
          </div>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  No programs yet. Add programs from Lender Registry or Product–Lender Matrix.
                </TableCell>
              </TableRow>
            ) : (
              programs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs font-medium">{row.label}</TableCell>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell className="text-xs">
                    {productLabel(row.productCode)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.enabled ? "default" : "outline"}>
                      {row.status ?? (row.enabled ? "active" : "inactive")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
