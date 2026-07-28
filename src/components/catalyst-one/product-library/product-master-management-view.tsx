"use client";

/**
 * CO-ADMIN-005 — Enterprise Product Master management (API-backed).
 * Create / Edit / Activate / Deactivate / Archive / Duplicate / Search / Filter.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activateProductMaster,
  archiveProductMaster,
  createProductMaster,
  deactivateProductMaster,
  duplicateProductMaster,
  listProductCategories,
  listProductGroups,
  listProductMaster,
  seedCanonicalProducts,
  updateProductMaster,
} from "@/lib/enterprise-product-master/admin-client";
import type { EnterpriseProductRecord } from "@/types/enterprise-product-registry";
import { ProductLibraryShell } from "@/components/catalyst-one/product-library/product-library-shell";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Cat = { id: string; code: string; label: string; enabled?: boolean };
type Grp = { id: string; code: string; label: string; categoryId: string; enabled?: boolean };

type Draft = {
  id?: string;
  code: string;
  label: string;
  categoryId: string;
  groupId: string;
  description: string;
  sortOrder: string;
  isSecured: boolean;
  customerSegment: string;
  remarks: string;
  parentProductId: string;
  enabled: boolean;
};

const emptyDraft = (): Draft => ({
  code: "",
  label: "",
  categoryId: "",
  groupId: "",
  description: "",
  sortOrder: "0",
  isSecured: true,
  customerSegment: "business,msme,company",
  remarks: "",
  parentProductId: "",
  enabled: true,
});

export function ProductMasterManagementView() {
  const [items, setItems] = useState<EnterpriseProductRecord[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [groups, setGroups] = useState<Grp[]>([]);
  const [search, setSearch] = useState("");
  const [enabledFilter, setEnabledFilter] = useState<"all" | "true" | "false">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [products, cats, grps] = await Promise.all([
        listProductMaster({
          search: search || undefined,
          enabled: enabledFilter === "all" ? undefined : enabledFilter,
        }),
        listProductCategories(),
        listProductGroups(),
      ]);
      setItems(products.items);
      setCategories(
        cats.items.map((c) => ({
          id: c.id,
          code: c.code,
          label: c.label,
          enabled: c.enabled,
        })),
      );
      setGroups(
        grps.items.map((g) => ({
          id: g.id,
          code: g.code,
          label: g.label,
          categoryId: g.categoryId,
          enabled: g.enabled,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Product Master");
    } finally {
      setLoading(false);
    }
  }, [search, enabledFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredGroups = useMemo(() => {
    const pool = draft?.categoryId
      ? groups.filter((g) => g.categoryId === draft.categoryId)
      : groups;
    return pool.filter((g) => g.enabled !== false || g.id === draft?.groupId);
  }, [groups, draft?.categoryId, draft?.groupId]);

  const selectableCategories = useMemo(
    () => categories.filter((c) => c.enabled !== false || c.id === draft?.categoryId),
    [categories, draft?.categoryId],
  );

  const openCreate = () => {
    const activeCats = categories.filter((c) => c.enabled !== false);
    const firstCat = activeCats[0] ?? categories[0];
    const activeGrps = groups.filter(
      (g) => g.categoryId === firstCat?.id && g.enabled !== false,
    );
    const firstGrp = activeGrps[0] ?? groups.find((g) => g.categoryId === firstCat?.id);
    setDraft({
      ...emptyDraft(),
      categoryId: firstCat?.id ?? "",
      groupId: firstGrp?.id ?? "",
    });
  };

  const openEdit = (row: EnterpriseProductRecord) => {
    setDraft({
      id: row.id,
      code: row.code,
      label: row.label,
      categoryId: row.categoryId,
      groupId: row.groupId,
      description: row.description ?? "",
      sortOrder: String(row.sortOrder ?? 0),
      isSecured: row.isSecured !== false,
      customerSegment: (row.customerSegment ?? []).join(","),
      remarks: row.remarks ?? row.notes ?? "",
      parentProductId: row.parentProductId ?? "",
      enabled: row.enabled,
    });
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        categoryId: draft.categoryId,
        groupId: draft.groupId,
        code: draft.code,
        label: draft.label,
        description: draft.description || undefined,
        sortOrder: Number(draft.sortOrder) || 0,
        isSecured: draft.isSecured,
        customerSegment: draft.customerSegment
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        remarks: draft.remarks || undefined,
        parentProductId: draft.parentProductId || null,
        enabled: draft.enabled,
        lifecycleStatus: draft.enabled ? "published" : "draft",
        operationalStatus: draft.enabled ? "active" : "inactive",
        status: draft.enabled ? "active" : "draft",
      };
      if (draft.id) {
        await updateProductMaster(draft.id, payload);
      } else {
        await createProductMaster(payload);
      }
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProductLibraryShell
      title="Product Master"
      description="Maintain enterprise products without code changes. Dropdowns across Opportunity and Deal consume this master."
      showSearch
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search code, name, description…"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={enabledFilter}
            onValueChange={(v) => setEnabledFilter(v as typeof enabledFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            Create Product
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={async () => {
              try {
                await seedCanonicalProducts();
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Seed failed");
              }
            }}
          >
            Seed / Sync Catalog
          </Button>
          <span className="text-xs text-muted-foreground">{items.length} product(s)</span>
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!error && categories.length === 0 && !loading ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-sm">
            Category and Group dropdowns are empty. Open{" "}
            <strong>Categories &amp; Groups</strong> or click{" "}
            <strong>Seed / Sync Catalog</strong> to load Loan Products → Secured Loans and
            Commercial Purchase (<code className="text-xs">COMM_PURCHASE</code>).
          </div>
        ) : null}

        {draft ? (
          <Card className="space-y-3 border-border/60 p-4">
            <p className="text-sm font-medium">{draft.id ? "Edit Product" : "Create Product"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Product Code</Label>
                <Input
                  value={draft.code}
                  disabled={Boolean(draft.id)}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Product Name</Label>
                <Input
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={draft.categoryId}
                  onValueChange={(v) => {
                    const g = groups.find((x) => x.categoryId === v);
                    setDraft({ ...draft, categoryId: v, groupId: g?.id ?? "" });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Group</Label>
                <Select
                  value={draft.groupId}
                  onValueChange={(v) => setDraft({ ...draft, groupId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Customer Segment (comma-separated)</Label>
                <Input
                  value={draft.customerSegment}
                  onChange={(e) => setDraft({ ...draft, customerSegment: e.target.value })}
                  placeholder="business, msme, company"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Remarks</Label>
                <Textarea
                  value={draft.remarks}
                  onChange={(e) => setDraft({ ...draft, remarks: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Parent Product (optional)</Label>
                <Select
                  value={draft.parentProductId || "__none__"}
                  onValueChange={(v) =>
                    setDraft({ ...draft, parentProductId: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (root product)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (root product)</SelectItem>
                    {items
                      .filter((p) => p.id !== draft.id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label} ({p.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.isSecured}
                    onCheckedChange={(v) => setDraft({ ...draft, isSecured: Boolean(v) })}
                  />
                  Secured
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.enabled}
                    onCheckedChange={(v) => setDraft({ ...draft, enabled: Boolean(v) })}
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" disabled={saving} onClick={() => void saveDraft()}>
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        ) : null}

        <Card className="overflow-hidden border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Secured</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">{row.sortOrder}</TableCell>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell className="text-xs font-medium">{row.label}</TableCell>
                  <TableCell className="text-xs">
                    {row.isSecured === true ? "Secured" : row.isSecured === false ? "Unsecured" : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={row.enabled ? "success" : "muted"}>
                      {row.enabled ? "Active" : "Inactive"}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate text-xs text-muted-foreground">
                    {(row.customerSegment ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    {row.enabled ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => void deactivateProductMaster(row.id).then(load)}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => void activateProductMaster(row.id).then(load)}
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        const code = `${row.code}_COPY`;
                        void duplicateProductMaster(row.id, code, `${row.label} (Copy)`).then(load);
                      }}
                    >
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      onClick={() =>
                        void archiveProductMaster(row.id, "Archived via Product Master").then(load)
                      }
                    >
                      Archive
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
