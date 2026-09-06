"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  EMPTY_PROGRAMME_REGISTRY_FILTERS,
  filterProgrammeRegistry,
  programmeStatusLabel,
} from "@/lib/product-programme-operations/registry-filters";
import { PROGRAMME_EMPLOYMENT_TYPES } from "@/constants/product-programme-operations/controlled-masters";

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
  const [filters, setFilters] = useState(EMPTY_PROGRAMME_REGISTRY_FILTERS);

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

  useEffect(() => {
    const programId = new URLSearchParams(window.location.search).get("programId");
    if (!programId || programs.length === 0) return;
    const match = programs.find((row) => row.id === programId);
    if (match) {
      setEditing(match);
      setEditorOpen(true);
    }
  }, [programs]);

  const filtered = useMemo(
    () => filterProgrammeRegistry(programs, filters),
    [programs, filters],
  );

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

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filters.search}
          onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
          placeholder="Search programme, code, product…"
          className="h-8 max-w-xs"
        />
        <Select
          value={filters.productCode}
          onValueChange={(value) => setFilters((current) => ({ ...current, productCode: value }))}
        >
          <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Product" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.code} value={product.code}>
                {product.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.employmentType}
          onValueChange={(value) => setFilters((current) => ({ ...current, employmentType: value }))}
        >
          <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Applicant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All applicants</SelectItem>
            {PROGRAMME_EMPLOYMENT_TYPES.map((item) => (
              <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((current) => ({ ...current, status: value as typeof current.status }))
          }
        >
          <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending approval</SelectItem>
            <SelectItem value="incomplete">Incomplete</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="superseded">Superseded</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.effectiveWindow}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              effectiveWindow: value as typeof current.effectiveWindow,
            }))
          }
        >
          <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder="Effective" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Effective / expired</SelectItem>
            <SelectItem value="effective">Effective now</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Programme</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Lender</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Employment</TableHead>
              <TableHead>Constitution</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>ROI</TableHead>
              <TableHead>Policy</TableHead>
              <TableHead>Docs</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-sm text-muted-foreground">
                  No programmes yet. Create a structured draft — the matrix will not auto-publish empty programmes.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs font-medium">{row.label}</TableCell>
                  <TableCell className="text-xs tabular-nums">{row.code}</TableCell>
                  <TableCell className="text-xs">{lenderLabel(row.lenderId)}</TableCell>
                  <TableCell className="text-xs">{productLabel(row.productCode)}</TableCell>
                  <TableCell className="text-xs">{(row.employmentTypes ?? []).join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs">{(row.legalConstitutions ?? []).join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {row.minLoanAmountExact && row.maxLoanAmountExact
                      ? `${row.minLoanAmountExact}–${row.maxLoanAmountExact}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.minRoiExact && row.maxRoiExact
                      ? `${row.minRoiExact}–${row.maxRoiExact}%`
                      : row.roiPercent != null
                        ? `${row.roiPercent}%`
                        : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{row.policyVersionId ?? row.creditRiskPolicyRef ?? "—"}</TableCell>
                  <TableCell className="text-xs tabular-nums">{(row.requiredDocumentTypeIds ?? []).length}</TableCell>
                  <TableCell className="text-xs tabular-nums">v{row.versionNumber}</TableCell>
                  <TableCell>
                    <Badge variant={row.isLivePublished ? "default" : "outline"}>
                      {programmeStatusLabel(row)}
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
