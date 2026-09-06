"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuthContext } from "@/components/providers/auth-provider";
import { lenderRegistryClient } from "@/lib/enterprise-lender-registry";
import { listProductMaster } from "@/lib/enterprise-product-master/admin-client";
import { ProductProgrammeEditor } from "@/components/catalyst-one/product-programme-operations/programme-editor";
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
import type {
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
} from "@/types/enterprise-lender-registry";
import { listSelectableCreditRiskPolicies } from "@/lib/enterprise-lender-registry/resolve-program-policy";

export function ProductProgramsWorkspace() {
  const { user } = useAuthContext();
  const actor =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "admin";

  const [programs, setPrograms] = useState<EnterpriseLenderProgramRecord[]>([]);
  const [lenders, setLenders] = useState<EnterpriseLenderRecord[]>([]);
  const [products, setProducts] = useState<{ id?: string; code: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EnterpriseLenderProgramRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [progRes, prodRes, lenderRes] = await Promise.all([
        lenderRegistryClient.queryPrograms({ pageSize: 200 }),
        listProductMaster().catch(() => ({ items: [] as { id?: string; code: string; label: string }[] })),
        lenderRegistryClient.queryLenders({ pageSize: 200 }).catch(() => ({ items: [] })),
      ]);
      setPrograms((progRes.items ?? []) as EnterpriseLenderProgramRecord[]);
      setProducts(
        (prodRes.items ?? []).map((item: { id?: string; code: string; label: string }) => ({
          id: item.id,
          code: item.code,
          label: item.label,
        })),
      );
      setLenders((lenderRes.items ?? []) as EnterpriseLenderRecord[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load programs");
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const productLabel = (code: string | null | undefined) =>
    products.find((item) => item.code === code)?.label ?? code ?? "—";

  const lenderLabel = (id: string) => {
    const lender = lenders.find((item) => item.id === id);
    return lender?.displayName || lender?.label || id.slice(0, 8);
  };

  const policies = listSelectableCreditRiskPolicies().map((policy) => ({
    id: policy.policyId,
    label: `${policy.policyName} (${policy.policyCode})`,
    status: policy.status,
  }));

  if (editorOpen) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <ProductProgrammeEditor
          lenders={lenders}
          products={products}
          policies={policies}
          initial={editing}
          actor={actor}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            void load();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Product Programmes"
        description="Structured lender programmes with controlled employment, constitution, policy, LOD and exact commercials."
        actions={
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
              Refresh
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={ROUTES.ADMIN_PRODUCT_LENDER_MATRIX}>Product–Lender Matrix</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              New Programme
            </Button>
          </div>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Programme</TableHead>
              <TableHead>Lender</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Employment</TableHead>
              <TableHead>ROI</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-sm text-muted-foreground">
                  No programmes yet. Create a structured draft — the matrix will not auto-publish empty programmes.
                </TableCell>
              </TableRow>
            ) : (
              programs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs font-medium">{row.label}</TableCell>
                  <TableCell className="text-xs">{lenderLabel(row.lenderId)}</TableCell>
                  <TableCell className="text-xs">{productLabel(row.productCode)}</TableCell>
                  <TableCell className="text-xs">{(row.employmentTypes ?? []).join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {row.minRoiExact && row.maxRoiExact
                      ? `${row.minRoiExact}–${row.maxRoiExact}%`
                      : row.roiPercent != null
                        ? `${row.roiPercent}%`
                        : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.isLivePublished ? "default" : "outline"}>
                      {row.publicationState ?? row.status ?? "draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(row);
                        setEditorOpen(true);
                      }}
                    >
                      Edit
                    </Button>
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
