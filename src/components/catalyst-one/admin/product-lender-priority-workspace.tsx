"use client";

/**
 * Product-family lender priority desk (LAP · Commercial Purchase · Personal Loan).
 * Priority is ranking only — never filters eligibility or mutates lender master / matrix.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, RefreshCw, Save, Search } from "lucide-react";
import { toast } from "sonner";
import type { ProductFamilyEligibleLenderRow } from "@/lib/enterprise-product-lender-priority/compose-product-family-eligible";
import { PRODUCT_LENDER_PRIORITY_FAMILY } from "@/lib/enterprise-product-lender-priority/compose-product-family-eligible";
import { getAccessToken } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProductTab = "LAP" | "COMM_PURCHASE" | "PERSONAL_LOAN" | "BUSINESS_LOAN_UNSECURED";

type ListResponse = {
  productFamily: string;
  rows: ProductFamilyEligibleLenderRow[];
  totalEnabledLenders: number;
  productMappedCount: number;
};

const TAB_META: Record<
  ProductTab,
  { label: string; priorityHeading: string; otherHeading: string; searchPlaceholder: string }
> = {
  LAP: {
    label: "Loan Against Property (LAP)",
    priorityHeading: "PRIORITY LAP LENDERS",
    otherHeading: "OTHER LAP LENDERS",
    searchPlaceholder: "Search any LAP lender (priority or other)…",
  },
  COMM_PURCHASE: {
    label: "Commercial Purchase",
    priorityHeading: "PRIORITY COMMERCIAL PURCHASE LENDERS",
    otherHeading: "OTHER COMMERCIAL PURCHASE LENDERS",
    searchPlaceholder: "Search any Commercial Purchase lender…",
  },
  PERSONAL_LOAN: {
    label: "Personal Loan",
    priorityHeading: "PRIORITY PERSONAL LOAN LENDERS",
    otherHeading: "OTHER PERSONAL LOAN LENDERS",
    searchPlaceholder: "Search any Personal Loan lender (priority or other)…",
  },
  BUSINESS_LOAN_UNSECURED: {
    label: "Unsecured Business Loan",
    priorityHeading: "PRIORITY UNSECURED BUSINESS LOAN LENDERS",
    otherHeading: "OTHER UNSECURED BUSINESS LOAN LENDERS",
    searchPlaceholder: "Search any Unsecured Business Loan lender…",
  },
};

const FAMILY_BY_TAB: Record<ProductTab, string> = {
  LAP: PRODUCT_LENDER_PRIORITY_FAMILY.LAP,
  COMM_PURCHASE: PRODUCT_LENDER_PRIORITY_FAMILY.COMM_PURCHASE,
  PERSONAL_LOAN: PRODUCT_LENDER_PRIORITY_FAMILY.PERSONAL_LOAN,
  BUSINESS_LOAN_UNSECURED: PRODUCT_LENDER_PRIORITY_FAMILY.BUSINESS_LOAN_UNSECURED,
};

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

export function ProductLenderPriorityWorkspace(props?: {
  initialTab?: ProductTab;
}) {
  const [tab, setTab] = useState<ProductTab>(props?.initialTab ?? "LAP");
  const [rows, setRows] = useState<ProductFamilyEligibleLenderRow[]>([]);
  const [meta, setMeta] = useState({ totalEnabledLenders: 0, productMappedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const family = FAMILY_BY_TAB[tab];
  const copy = TAB_META[tab];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/product-lender-priority?family=${family}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || `Unable to load ${copy.label} lenders`);
      }
      const data = json.data as ListResponse;
      setRows(data.rows);
      setMeta({
        totalEnabledLenders: data.totalEnabledLenders,
        productMappedCount: data.productMappedCount,
      });
      const ordered = data.rows
        .filter((r) => r.selectionPriority != null)
        .sort((a, b) => (a.selectionPriority ?? 9999) - (b.selectionPriority ?? 9999))
        .map((r) => r.lenderId);
      setSelectedIds(ordered);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setRows([]);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }, [family, copy.label]);

  useEffect(() => {
    setSearch("");
    setTypeFilter("all");
    void load();
  }, [load]);

  const typeOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.institutionTypeLabel));
    return ["all", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const matchesFilters = useCallback(
    (r: ProductFamilyEligibleLenderRow) => {
      if (typeFilter !== "all" && r.institutionTypeLabel !== typeFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [r.institutionName, r.lenderCode, r.institutionTypeLabel, r.status]
        .join(" ")
        .toLowerCase()
        .includes(q);
    },
    [search, typeFilter],
  );

  const priorityRows = useMemo(() => {
    return rows
      .filter((r) => r.selectionPriority != null)
      .sort((a, b) => (a.selectionPriority ?? 9999) - (b.selectionPriority ?? 9999))
      .filter(matchesFilters);
  }, [rows, matchesFilters]);

  const otherRows = useMemo(() => {
    return rows
      .filter((r) => r.selectionPriority == null)
      .sort((a, b) => a.institutionName.localeCompare(b.institutionName))
      .filter(matchesFilters);
  }, [rows, matchesFilters]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const priorityBoard = useMemo(() => {
    return selectedIds
      .map((id, idx) => {
        const row = rows.find((r) => r.lenderId === id);
        if (!row) return null;
        return { ...row, draftPriority: idx + 1 };
      })
      .filter(Boolean) as Array<ProductFamilyEligibleLenderRow & { draftPriority: number }>;
  }, [selectedIds, rows]);

  const toggleSelect = (lenderId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(lenderId)) return prev.filter((id) => id !== lenderId);
      return [...prev, lenderId];
    });
  };

  const move = (lenderId: string, dir: -1 | 1) => {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(lenderId);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copyIds = [...prev];
      const [item] = copyIds.splice(idx, 1);
      copyIds.splice(next, 0, item);
      return copyIds;
    });
  };

  const savePriorities = async () => {
    setSaving(true);
    try {
      const items = selectedIds.map((lenderId, idx) => ({
        lenderId,
        priorityRank: idx + 1,
      }));
      const res = await fetch("/api/admin/product-lender-priority", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ productFamily: family, items }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Unable to save priority");
      }
      toast.success(`${copy.label} lender priority saved. Reloading…`);
      await load();
      toast.success("Priority persisted. Other product-eligible lenders remain fully available.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const renderLenderTable = (
    sectionRows: ProductFamilyEligibleLenderRow[],
    emptyLabel: string,
  ) => {
    if (loading) {
      return <p className="text-sm text-muted-foreground">Loading {copy.label} lenders…</p>;
    }
    if (sectionRows.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
    }
    return (
      <div className="max-h-[42vh] overflow-auto rounded-lg border border-border/50">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="sticky top-0 bg-muted/90 backdrop-blur">
            <tr className="border-b border-border/60">
              <th className="px-2 py-2 font-medium">Select</th>
              <th className="px-2 py-2 font-medium">Priority</th>
              <th className="px-2 py-2 font-medium">Institution</th>
              <th className="px-2 py-2 font-medium">Type</th>
              <th className="px-2 py-2 font-medium">Code</th>
              <th className="px-2 py-2 font-medium">Active</th>
              <th className="px-2 py-2 font-medium">Mapped</th>
              <th className="px-2 py-2 font-medium">Programs</th>
            </tr>
          </thead>
          <tbody>
            {sectionRows.map((r) => {
              const checked = selectedSet.has(r.lenderId);
              const draftIdx = selectedIds.indexOf(r.lenderId);
              return (
                <tr
                  key={r.lenderId}
                  className={cn("border-b border-border/40", checked && "bg-teal-500/5")}
                >
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(r.lenderId)}
                      aria-label={`Select ${r.institutionName}`}
                    />
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {draftIdx >= 0 ? draftIdx + 1 : (r.selectionPriority ?? "—")}
                  </td>
                  <td className="px-2 py-1.5 font-medium">{r.institutionName}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {r.institutionTypeLabel}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-[10px]">{r.lenderCode}</td>
                  <td className="px-2 py-1.5">{r.activeInactive}</td>
                  <td className="px-2 py-1.5">{r.productMapped}</td>
                  <td className="px-2 py-1.5">
                    {r.existingProgramCount === 0 ? "—" : r.existingPrograms.join("; ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">
          Product Lender Priority
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          Product Lender Priority — LAP · CP · Personal Loan · UBL
        </h1>
        <p className="text-sm text-muted-foreground">
          Priority is presentation order only. All product-mapped lenders remain active,
          searchable, and selectable. Priority ≠ filter · ≠ eligibility · ≠ mapping.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TAB_META) as ProductTab[]).map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={tab === key ? "default" : "outline"}
            className="h-8"
            onClick={() => setTab(key)}
          >
            {TAB_META[key].label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
        <span className="font-medium">{copy.label}</span>
        <span className="text-muted-foreground">·</span>
        <span>
          Enabled lenders ·{" "}
          <strong className="tabular-nums">{meta.totalEnabledLenders}</strong>
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          Product mapped ·{" "}
          <strong className="tabular-nums">{meta.productMappedCount}</strong>
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          Priority · <strong className="tabular-nums">{selectedIds.length}</strong>
        </span>
        <span className="text-muted-foreground">·</span>
        <span>
          Other ·{" "}
          <strong className="tabular-nums">
            {Math.max(0, meta.productMappedCount - selectedIds.length)}
          </strong>
        </span>
        <div className="ml-auto flex gap-2">
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Reload
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={saving || loading}
            onClick={() => void savePriorities()}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save Priority"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4 rounded-xl border border-border/60 bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-xs"
                placeholder={copy.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "All institution types" : t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold tracking-tight">
              {copy.priorityHeading}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({priorityRows.length})
              </span>
            </h2>
            {renderLenderTable(priorityRows, "No priority lenders match filters.")}
          </div>

          <div className="space-y-2 border-t border-border/60 pt-3">
            <h2 className="text-sm font-semibold tracking-tight">
              {copy.otherHeading}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({otherRows.length} · remain fully eligible)
              </span>
            </h2>
            {renderLenderTable(
              otherRows,
              "No other product lenders match filters (all may already be prioritized).",
            )}
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-border/60 bg-card p-3">
          <h2 className="text-sm font-semibold">Priority order (draft) — {copy.label}</h2>
          <p className="text-[11px] text-muted-foreground">
            Reorder, add, or remove without deleting, deactivating, or unmapping lenders.
            Save writes ranking only. Priority ≠ filter.
          </p>
          {priorityBoard.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              No priority draft yet for this product.
            </p>
          ) : (
            <ol className="max-h-[70vh] space-y-1.5 overflow-auto">
              {priorityBoard.map((r) => (
                <li
                  key={r.lenderId}
                  className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5"
                >
                  <span className="w-6 text-center text-xs font-semibold tabular-nums text-teal-800">
                    {r.draftPriority}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.institutionName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {r.lenderCode} · {r.institutionTypeLabel}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => move(r.lenderId, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => move(r.lenderId, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
