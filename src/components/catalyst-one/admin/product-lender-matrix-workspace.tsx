"use client";

/**
 * CO-ADMIN-005 / CO-PR-004 — Product × Lender matrix (no hardcoding).
 * Columns are canonical-family deduped; checkboxes treat legacy alias codes as selected.
 *
 * CO-MASTER-003 — Viewport/scroll fix only:
 * Route is a locked registry desk (main overflow-hidden + h-full). The matrix body must
 * be a height-constrained overflow container so lender rows and product columns scroll.
 */

import { useCallback, useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/design-system/page-header";
import { productCodesShareSelectionFamily } from "@/constants/enterprise-product-master";
import { cn } from "@/lib/utils";

type MatrixProduct = { id: string; code: string; label: string; isSecured?: boolean | null };
type MatrixLender = {
  lenderId: string;
  lenderCode: string;
  lenderLabel: string;
  institutionCategory: string;
  productsSupported: string[];
};

function lenderSupportsProduct(lender: MatrixLender, productCode: string): boolean {
  return lender.productsSupported.some((c) => productCodesShareSelectionFamily(c, productCode));
}

export function ProductLenderMatrixWorkspace() {
  const [products, setProducts] = useState<MatrixProduct[]>([]);
  const [lenders, setLenders] = useState<MatrixLender[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/admin/product-lender-matrix", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? "Load failed");
      setProducts(json.data.products);
      setLenders(json.data.lenders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load matrix");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (lender: MatrixLender, productCode: string, checked: boolean) => {
    // Drop all alias/family codes for this product, then optionally add the canonical code.
    const withoutFamily = lender.productsSupported.filter(
      (c) => !productCodesShareSelectionFamily(c, productCode),
    );
    const next = checked ? [...new Set([...withoutFamily, productCode])] : withoutFamily;
    setSavingId(lender.lenderId);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/admin/product-lender-matrix", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ lenderId: lender.lenderId, productCodes: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? "Save failed");
      setLenders((rows) =>
        rows.map((r) =>
          r.lenderId === lender.lenderId
            ? { ...r, productsSupported: json.data.productsSupported }
            : r,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div
      className="flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden px-4 py-3 md:px-5 lg:px-6"
      data-sprint="CO-MASTER-003"
      data-surface="product-lender-matrix"
    >
      <div className="shrink-0 space-y-3 pb-3">
        <PageHeader
          density="registry"
          title="Product–Lender Matrix"
          description="Configure which lenders offer which products. Columns show each Enterprise Product once (canonical family). Changes apply immediately to Deal eligibility."
          actions={
            <Button type="button" size="sm" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          }
        />
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {loading
            ? "Loading matrix…"
            : `${lenders.length} lenders · ${products.length} products`}
        </p>
      </div>

      {/*
        Single scrollport for both axes:
        - vertical → all lender rows
        - horizontal → all product columns
        Parent dashboard main is overflow-hidden for this registry path; without
        min-h-0 + flex-1 + overflow-auto here, rows clip with no scrollbar.
      */}
      <Card className="min-h-0 flex-1 overflow-auto border-border/60 p-0">
        <table className="w-max min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b">
              <th
                className={cn(
                  "sticky left-0 top-0 z-30 bg-background p-2 font-medium shadow-[1px_0_0_0_hsl(var(--border))]",
                )}
              >
                Lender
              </th>
              {products.map((p) => (
                <th
                  key={p.code}
                  className="sticky top-0 z-20 max-w-[6rem] bg-background p-2 font-medium"
                  title={`${p.label} (${p.code})`}
                >
                  <span className="line-clamp-2">{p.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lenders.map((lender) => (
              <tr key={lender.lenderId} className="border-b border-border/50">
                <td
                  className={cn(
                    "sticky left-0 z-10 bg-background p-2 shadow-[1px_0_0_0_hsl(var(--border))]",
                  )}
                >
                  <div className="font-medium">{lender.lenderLabel}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {lender.institutionCategory} · {lender.lenderCode}
                  </div>
                </td>
                {products.map((p) => {
                  const on = lenderSupportsProduct(lender, p.code);
                  return (
                    <td key={p.code} className="p-2 text-center">
                      <Checkbox
                        checked={on}
                        disabled={savingId === lender.lenderId}
                        onCheckedChange={(v) => void toggle(lender, p.code, Boolean(v))}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && lenders.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No active lenders found. Seed Lender Registry first.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
