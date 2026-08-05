"use client";

/**
 * CO-ARCH-ELD-001 — Enterprise Lender Directory (operational landing).
 * Full-width table · no landing analytics · right slide-over workspace.
 * SSOT: Enterprise Lender Registry (read-only projection).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import {
  ELD_CATEGORY_OPTIONS,
  ELD_LANDING_TABS,
  ELD_PAGE_SIZES,
  ELW_DIRECTORY_PRODUCTS,
  type EldLandingTabId,
} from "@/constants/enterprise-lender-directory";
import { ROUTES } from "@/constants/routes";
import {
  composeEnterpriseLenderDirectoryRows,
  enrichDirectoryRowsWithBankerProducts,
  exportEnterpriseLenderDirectoryCsv,
  filterEnterpriseLenderDirectoryRows,
  rememberEldLenderUsed,
  sortEnterpriseLenderDirectoryRows,
  uniqueEldRegions,
} from "@/lib/enterprise-lender-directory";
import { buildInstitutionBankerProductIndex } from "@/lib/enterprise-contact-master";
import { ensureEnterpriseRegistryHydrated } from "@/lib/enterprise-registry/hydrate";
import {
  lenderRegistryClient,
  subscribeLenderRegistryUpdated,
} from "@/lib/enterprise-lender-registry";
import { downloadCsv } from "@/lib/loan-files-utils";
import type {
  EnterpriseLenderDirectoryCategoryId,
  EnterpriseLenderDirectoryFilters,
  EnterpriseLenderDirectoryRow,
  EnterpriseLenderDirectorySortMode,
} from "@/types/enterprise-lender-directory-ops";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EnterpriseLenderDirectorySlideOver } from "./eld-slide-over";
import { EldLenderEmployeesPanel } from "./eld-lender-employees-panel";

const EMPTY_FILTERS: EnterpriseLenderDirectoryFilters = {
  search: "",
  category: "all",
  product: "all",
  region: "all",
};

const SORT_FIELD: Record<string, EnterpriseLenderDirectorySortMode> = {
  lenderName: "lenderName",
  homeLoanRoi: "homeLoanRoi",
  balanceTransferRoi: "balanceTransferRoi",
  maxLtv: "maxLtv",
  minCibil: "minCibil",
  maxLoanAmount: "maxLoanAmount",
  averageTat: "averageTat",
  activeOpportunities: "activeOpportunities",
  status: "status",
};

export function EnterpriseLenderDirectoryWorkspace() {
  const { user } = useAuthContext();
  const [landingTab, setLandingTab] = useState<EldLandingTabId>("lenders");
  const [rows, setRows] = useState<EnterpriseLenderDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [filters, setFilters] = useState<EnterpriseLenderDirectoryFilters>(EMPTY_FILTERS);
  const [sortMode, setSortMode] = useState<EnterpriseLenderDirectorySortMode>("smart");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof ELD_PAGE_SIZES)[number]>(25);
  const [selected, setSelected] = useState<EnterpriseLenderDirectoryRow | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [lendersResult, programsResult] = await Promise.all([
          lenderRegistryClient.queryLenders({
            status: "active",
            enabled: true,
            pageSize: 500,
          }),
          lenderRegistryClient.queryPrograms({
            publishedOnly: true,
            pageSize: 1000,
          }),
        ]);
        await ensureEnterpriseRegistryHydrated(false).catch(() => undefined);
        if (cancelled) return;
        const composed = composeEnterpriseLenderDirectoryRows({
          lenders: lendersResult.items,
          programs: programsResult.items,
        });
        setRows(
          enrichDirectoryRowsWithBankerProducts(
            composed,
            buildInstitutionBankerProductIndex(),
          ),
        );
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  useEffect(
    () => subscribeLenderRegistryUpdated(() => setReloadToken((n) => n + 1)),
    [],
  );

  const regions = useMemo(() => uniqueEldRegions(rows), [rows]);

  const filteredSorted = useMemo(() => {
    const filtered = filterEnterpriseLenderDirectoryRows(rows, filters);
    return sortEnterpriseLenderDirectoryRows(filtered, sortMode, sortDir);
  }, [rows, filters, sortMode, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const patchFilters = (patch: Partial<EnterpriseLenderDirectoryFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const openLender = (row: EnterpriseLenderDirectoryRow) => {
    rememberEldLenderUsed(row.lenderId);
    setSelected(row);
    setPanelOpen(true);
  };

  const handleSort = (columnId: string) => {
    const field = SORT_FIELD[columnId];
    if (!field) return;
    setSortMode((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(
        field === "homeLoanRoi" || field === "averageTat" || field === "balanceTransferRoi"
          ? "asc"
          : "desc",
      );
      return field;
    });
    setPage(1);
  };

  const columns = useMemo<EnterpriseGridColumnDef<EnterpriseLenderDirectoryRow>[]>(
    () => [
      {
        id: "lenderName",
        label: "Lender Name",
        frozen: true,
        sortable: true,
        defaultOrder: 1,
        defaultWidth: 168,
        render: (row) => (
          <span className="font-medium">
            {row.pinned ? (
              <span className="mr-1 text-[9px] font-semibold uppercase text-amber-600">Pin</span>
            ) : null}
            {row.lenderName}
          </span>
        ),
        exportValue: (row) => row.lenderName,
      },
      {
        id: "category",
        label: "Category",
        defaultOrder: 2,
        defaultWidth: 140,
        render: (row) => (
          <span className="text-[11px] text-muted-foreground">{row.categoryLabel}</span>
        ),
        exportValue: (row) => row.categoryLabel,
      },
      {
        id: "homeLoanRoi",
        label: "Home Loan ROI",
        sortable: true,
        defaultOrder: 3,
        defaultWidth: 110,
        align: "right",
        render: (row) => <span className="tabular-nums">{row.homeLoanRoiLabel}</span>,
        exportValue: (row) => row.homeLoanRoiLabel,
      },
      {
        id: "balanceTransferRoi",
        label: "Balance Transfer ROI",
        sortable: true,
        defaultOrder: 4,
        defaultWidth: 130,
        align: "right",
        render: (row) => (
          <span className="tabular-nums">{row.balanceTransferRoiLabel}</span>
        ),
        exportValue: (row) => row.balanceTransferRoiLabel,
      },
      {
        id: "maxLtv",
        label: "Maximum LTV",
        sortable: true,
        defaultOrder: 5,
        defaultWidth: 100,
        align: "right",
        render: (row) => <span className="tabular-nums">{row.maxLtvLabel}</span>,
        exportValue: (row) => row.maxLtvLabel,
      },
      {
        id: "foir",
        label: "FOIR",
        defaultOrder: 6,
        defaultWidth: 88,
        render: (row) => (
          <span className="text-[11px] text-muted-foreground">{row.foirLabel}</span>
        ),
        exportValue: (row) => row.foirLabel,
      },
      {
        id: "minCibil",
        label: "Minimum CIBIL",
        sortable: true,
        defaultOrder: 7,
        defaultWidth: 100,
        align: "right",
        render: (row) => <span className="tabular-nums">{row.minCibilLabel}</span>,
        exportValue: (row) => row.minCibilLabel,
      },
      {
        id: "maxLoanAmount",
        label: "Maximum Loan Amount",
        sortable: true,
        defaultOrder: 8,
        defaultWidth: 130,
        render: (row) => <span className="tabular-nums">{row.maxLoanAmountLabel}</span>,
        exportValue: (row) => row.maxLoanAmountLabel,
      },
      {
        id: "processingFee",
        label: "Processing Fee",
        defaultOrder: 9,
        defaultWidth: 110,
        render: (row) => (
          <span className="tabular-nums text-[11px]">{row.processingFeeLabel}</span>
        ),
        exportValue: (row) => row.processingFeeLabel,
      },
      {
        id: "averageTat",
        label: "Average TAT",
        sortable: true,
        defaultOrder: 10,
        defaultWidth: 92,
        align: "right",
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.averageTatLabel}</span>
        ),
        exportValue: (row) => row.averageTatLabel,
      },
      {
        id: "btAvailable",
        label: "Balance Transfer Available",
        defaultOrder: 11,
        defaultWidth: 120,
        render: (row) => (row.balanceTransferAvailable ? "Yes" : "No"),
        exportValue: (row) => (row.balanceTransferAvailable ? "Yes" : "No"),
      },
      {
        id: "topUpAvailable",
        label: "Top-up Available",
        defaultOrder: 12,
        defaultWidth: 100,
        render: (row) => (row.topUpAvailable ? "Yes" : "No"),
        exportValue: (row) => (row.topUpAvailable ? "Yes" : "No"),
      },
      {
        id: "activeOpportunities",
        label: "Active Opportunities",
        sortable: true,
        defaultOrder: 13,
        defaultWidth: 110,
        align: "right",
        render: (row) => (
          <span className="tabular-nums font-medium">{row.activeOpportunities}</span>
        ),
        exportValue: (row) => String(row.activeOpportunities),
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        defaultOrder: 14,
        defaultWidth: 88,
        render: (row) => (
          <span
            className={cn(
              "text-[11px] font-medium uppercase tracking-wide",
              row.status === "active" ? "text-emerald-700" : "text-muted-foreground",
            )}
          >
            {row.status === "active" ? "Active" : "Inactive"}
          </span>
        ),
        exportValue: (row) => row.status,
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 border border-border/70 bg-card px-2 py-1.5">
        {ELD_LANDING_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setLandingTab(tab.id)}
            className={cn(
              "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
              landingTab === tab.id
                ? "border-teal-500/50 bg-teal-500/15 text-foreground"
                : "border-transparent text-muted-foreground hover:border-border/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {landingTab === "employees" ? (
        <EldLenderEmployeesPanel />
      ) : (
      <>
      <div className="flex flex-wrap items-center justify-between gap-2 border border-border/70 bg-muted/20 px-2 py-1.5 text-[11px] text-muted-foreground">
        <p>
          Operational directory of{" "}
          <span className="font-medium text-foreground">Enterprise Lender Registry</span>{" "}
          lenders. Product parameters come from published programmes — never hardcoded. Click a
          row to open the workspace panel.
        </p>
        <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
          <Link href={ROUTES.ADMIN_LENDER_REGISTRY}>Admin · Lender Registry</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border border-border/70 bg-card px-2 py-1.5">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => patchFilters({ search: e.target.value })}
            placeholder="Search lender, product, short name…"
            className="h-8 border-border/60 pl-7 text-xs"
          />
        </div>
        <Select
          value={filters.category}
          onValueChange={(v) =>
            patchFilters({
              category: v as EnterpriseLenderDirectoryCategoryId | "all",
            })
          }
        >
          <SelectTrigger className="h-8 w-[11rem] text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {ELD_CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.product}
          onValueChange={(v) => patchFilters({ product: v })}
        >
          <SelectTrigger className="h-8 w-[11rem] text-xs">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All products
            </SelectItem>
            {ELW_DIRECTORY_PRODUCTS.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.region}
          onValueChange={(v) => patchFilters({ region: v })}
        >
          <SelectTrigger className="h-8 w-[10rem] text-xs">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All regions
            </SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r} className="text-xs">
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-[11px]"
          onClick={() => {
            setSortMode("smart");
            setSortDir("asc");
            setPage(1);
          }}
        >
          Smart sort
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-[11px]"
          disabled={filteredSorted.length === 0}
          onClick={() =>
            downloadCsv(
              exportEnterpriseLenderDirectoryCsv(filteredSorted),
              "enterprise-lender-directory.csv",
            )
          }
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
        {(filters.search ||
          filters.category !== "all" ||
          filters.product !== "all" ||
          filters.region !== "all") && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-[11px]"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <EnterpriseDataGrid
          className="min-h-0 flex-1"
          storageKey="catalyst.eld.lender-directory.v1"
          userId={user?.id}
          density="dense"
          fillViewport
          columns={columns}
          rows={pageRows}
          rowKey={(r) => r.lenderId}
          emptyMessage="No lenders match the current filters."
          toolbarLabel={`Lenders (${filteredSorted.length})`}
          sortColumnId={
            sortMode === "smart"
              ? null
              : Object.entries(SORT_FIELD).find(([, v]) => v === sortMode)?.[0]
          }
          sortDirection={sortDir}
          onSort={handleSort}
          onRowClick={openLender}
          highlightedRowKey={panelOpen ? selected?.lenderId : null}
          maxHeightClassName="h-full max-h-none min-h-0 flex-1"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border border-border/60 px-2 py-1.5 text-[11px] text-muted-foreground">
        <span>
          {filteredSorted.length} lender{filteredSorted.length === 1 ? "" : "s"}
          {loading ? " · Loading…" : ""}
          {sortMode === "smart" ? " · Smart default sort" : ""}
        </span>
        <div className="flex items-center gap-1.5">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v) as (typeof ELD_PAGE_SIZES)[number]);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-7 w-[4.5rem] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ELD_PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <span className="tabular-nums">
            {safePage} / {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <EnterpriseLenderDirectorySlideOver
        open={panelOpen}
        onOpenChange={setPanelOpen}
        row={selected}
      />
      </>
      )}
    </div>
  );
}
