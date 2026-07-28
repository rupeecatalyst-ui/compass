"use client";

/**
 * CO-ADMIN-006 — Category & Group Master (API-backed CRUD).
 * Administrators maintain taxonomy without developer intervention.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activateProductCategory,
  activateProductGroup,
  createProductCategory,
  createProductGroup,
  deactivateProductCategory,
  deactivateProductGroup,
  deleteProductCategory,
  deleteProductGroup,
  listProductCategories,
  listProductGroups,
  seedCanonicalProducts,
  updateProductCategory,
  updateProductGroup,
} from "@/lib/enterprise-product-master/admin-client";
import type {
  EnterpriseProductCategoryRecord,
  EnterpriseProductGroupRecord,
} from "@/types/enterprise-product-registry";
import { ProductLibraryShell } from "@/components/catalyst-one/product-library/product-library-shell";
import { StatusPill } from "@/components/design-system/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type CatDraft = {
  id?: string;
  code: string;
  label: string;
  description: string;
  sortOrder: string;
  enabled: boolean;
};

type GrpDraft = {
  id?: string;
  categoryId: string;
  code: string;
  label: string;
  description: string;
  sortOrder: string;
  enabled: boolean;
};

const emptyCat = (): CatDraft => ({
  code: "",
  label: "",
  description: "",
  sortOrder: "0",
  enabled: true,
});

const emptyGrp = (categoryId = ""): GrpDraft => ({
  categoryId,
  code: "",
  label: "",
  description: "",
  sortOrder: "0",
  enabled: true,
});

export function ProductCategoriesView() {
  const [categories, setCategories] = useState<EnterpriseProductCategoryRecord[]>([]);
  const [groups, setGroups] = useState<EnterpriseProductGroupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catDraft, setCatDraft] = useState<CatDraft | null>(null);
  const [grpDraft, setGrpDraft] = useState<GrpDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, grps] = await Promise.all([listProductCategories(), listProductGroups()]);
      setCategories(cats.items);
      setGroups(grps.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Category & Group Master");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groupsByCategory = useMemo(() => {
    const map = new Map<string, EnterpriseProductGroupRecord[]>();
    for (const g of groups) {
      const list = map.get(g.categoryId) ?? [];
      list.push(g);
      map.set(g.categoryId, list);
    }
    return map;
  }, [groups]);

  const saveCategory = async () => {
    if (!catDraft) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: catDraft.code,
        label: catDraft.label,
        description: catDraft.description || undefined,
        sortOrder: Number(catDraft.sortOrder) || 0,
        enabled: catDraft.enabled,
        status: catDraft.enabled ? "active" : "inactive",
      };
      if (catDraft.id) {
        await updateProductCategory(catDraft.id, payload);
      } else {
        await createProductCategory(payload);
      }
      setCatDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Category save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveGroup = async () => {
    if (!grpDraft) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        categoryId: grpDraft.categoryId,
        code: grpDraft.code,
        label: grpDraft.label,
        description: grpDraft.description || undefined,
        sortOrder: Number(grpDraft.sortOrder) || 0,
        enabled: grpDraft.enabled,
        status: grpDraft.enabled ? "active" : "inactive",
      };
      if (grpDraft.id) {
        await updateProductGroup(grpDraft.id, payload);
      } else {
        await createProductGroup(payload);
      }
      setGrpDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Group save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProductLibraryShell
      title="Categories & Groups"
      description="Maintain Product Category and Group masters. Product Master dropdowns consume these registries automatically."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => setCatDraft(emptyCat())}>
            Create Category
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              setGrpDraft(emptyGrp(categories.find((c) => c.enabled)?.id ?? categories[0]?.id ?? ""))
            }
            disabled={categories.length === 0}
          >
            Create Group
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
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
          <span className="text-xs text-muted-foreground">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} · {groups.length}{" "}
            group(s)
          </span>
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {catDraft ? (
          <Card className="space-y-3 border-border/60 p-4">
            <p className="text-sm font-medium">
              {catDraft.id ? "Edit Category" : "Create Category"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Category Code</Label>
                <Input
                  value={catDraft.code}
                  disabled={Boolean(catDraft.id)}
                  onChange={(e) => setCatDraft({ ...catDraft, code: e.target.value })}
                  placeholder="e.g. LOAN_PRODUCTS"
                />
              </div>
              <div className="space-y-1">
                <Label>Category Name</Label>
                <Input
                  value={catDraft.label}
                  onChange={(e) => setCatDraft({ ...catDraft, label: e.target.value })}
                  placeholder="e.g. Loan Products"
                />
              </div>
              <div className="space-y-1">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={catDraft.sortOrder}
                  onChange={(e) => setCatDraft({ ...catDraft, sortOrder: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  checked={catDraft.enabled}
                  onCheckedChange={(v) => setCatDraft({ ...catDraft, enabled: Boolean(v) })}
                />
                <Label>Active</Label>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={catDraft.description}
                  onChange={(e) => setCatDraft({ ...catDraft, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" disabled={saving} onClick={() => void saveCategory()}>
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setCatDraft(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        ) : null}

        {grpDraft ? (
          <Card className="space-y-3 border-border/60 p-4">
            <p className="text-sm font-medium">{grpDraft.id ? "Edit Group" : "Create Group"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={grpDraft.categoryId}
                  onValueChange={(v) => setGrpDraft({ ...grpDraft, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Group Code</Label>
                <Input
                  value={grpDraft.code}
                  disabled={Boolean(grpDraft.id)}
                  onChange={(e) => setGrpDraft({ ...grpDraft, code: e.target.value })}
                  placeholder="e.g. SECURED_LOANS"
                />
              </div>
              <div className="space-y-1">
                <Label>Group Name</Label>
                <Input
                  value={grpDraft.label}
                  onChange={(e) => setGrpDraft({ ...grpDraft, label: e.target.value })}
                  placeholder="e.g. Secured Loans"
                />
              </div>
              <div className="space-y-1">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={grpDraft.sortOrder}
                  onChange={(e) => setGrpDraft({ ...grpDraft, sortOrder: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  checked={grpDraft.enabled}
                  onCheckedChange={(v) => setGrpDraft({ ...grpDraft, enabled: Boolean(v) })}
                />
                <Label>Active</Label>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={grpDraft.description}
                  onChange={(e) => setGrpDraft({ ...grpDraft, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" disabled={saving} onClick={() => void saveGroup()}>
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setGrpDraft(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        ) : null}

        {categories.length === 0 && !loading ? (
          <Card className="border-border/60 p-6 text-sm text-muted-foreground">
            No categories yet. Click <strong>Seed / Sync Catalog</strong> to load Loan Products,
            Investment Products, Insurance Products, Deposits, and Others — or create a category
            manually.
          </Card>
        ) : null}

        {categories.map((cat) => {
          const catGroups = groupsByCategory.get(cat.id) ?? [];
          return (
            <Card key={cat.id} className="glass-card border-border/60">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{cat.label}</CardTitle>
                  <StatusPill variant="muted">{cat.code}</StatusPill>
                  <StatusPill variant={cat.enabled ? "success" : "warning"}>
                    {cat.enabled ? "Active" : "Inactive"}
                  </StatusPill>
                </div>
                <CardDescription>{cat.description || "No description"}</CardDescription>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() =>
                      setCatDraft({
                        id: cat.id,
                        code: cat.code,
                        label: cat.label,
                        description: cat.description ?? "",
                        sortOrder: String(cat.sortOrder ?? 0),
                        enabled: cat.enabled,
                      })
                    }
                  >
                    Edit
                  </Button>
                  {cat.enabled ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => void deactivateProductCategory(cat.id).then(load)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => void activateProductCategory(cat.id).then(load)}
                    >
                      Activate
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive"
                    onClick={() =>
                      void deleteProductCategory(cat.id, "Deleted via Category Master")
                        .then(load)
                        .catch((e) =>
                          setError(e instanceof Error ? e.message : "Delete category failed"),
                        )
                    }
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setGrpDraft(emptyGrp(cat.id))}
                  >
                    Add Group
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group Code</TableHead>
                      <TableHead>Group Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-xs text-muted-foreground">
                          No groups defined for this category.
                        </TableCell>
                      </TableRow>
                    ) : (
                      catGroups.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="font-mono text-xs">{g.code}</TableCell>
                          <TableCell className="text-xs font-medium">{g.label}</TableCell>
                          <TableCell>
                            <StatusPill variant={g.enabled ? "success" : "muted"}>
                              {g.enabled ? "Active" : "Inactive"}
                            </StatusPill>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {g.description || "—"}
                          </TableCell>
                          <TableCell className="space-x-1 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() =>
                                setGrpDraft({
                                  id: g.id,
                                  categoryId: g.categoryId,
                                  code: g.code,
                                  label: g.label,
                                  description: g.description ?? "",
                                  sortOrder: String(g.sortOrder ?? 0),
                                  enabled: g.enabled,
                                })
                              }
                            >
                              Edit
                            </Button>
                            {g.enabled ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => void deactivateProductGroup(g.id).then(load)}
                              >
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => void activateProductGroup(g.id).then(load)}
                              >
                                Activate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive"
                              onClick={() =>
                                void deleteProductGroup(g.id, "Deleted via Group Master")
                                  .then(load)
                                  .catch((e) =>
                                    setError(e instanceof Error ? e.message : "Delete group failed"),
                                  )
                              }
                            >
                              Delete
                            </Button>
                          </TableCell>
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
