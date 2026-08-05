"use client";

/**
 * CO-ARCH-ELD-EMP — Lender Employees registry tab.
 * SSOT: ECM (lender_employee) · ELR institutions · Product Master · Deal pipeline projection.
 */

import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import {
  ELD_EMPLOYEE_PERFORMANCE_FILTER_OPTIONS,
  ELD_EMPLOYEE_STATUS_OPTIONS,
  ELD_PAGE_SIZES,
} from "@/constants/enterprise-lender-directory";
import {
  EMPTY_ELD_EMPLOYEE_FILTERS,
  composeEldLenderEmployeeRows,
  exportEldLenderEmployeesCsv,
  filterEldLenderEmployeeRows,
  loadEldLenderEmployeeContacts,
  sortEldLenderEmployeeRows,
  uniqueEmployeeFilterValues,
} from "@/lib/enterprise-lender-directory";
import { subscribeEcmContactRegistry } from "@/lib/enterprise-contact-master";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { ensureEnterpriseRegistryHydrated } from "@/lib/enterprise-registry/hydrate";
import {
  lenderRegistryClient,
  subscribeLenderRegistryUpdated,
} from "@/lib/enterprise-lender-registry";
import { useProductMasterOptions } from "@/lib/enterprise-product-master";
import { downloadCsv } from "@/lib/loan-files-utils";
import type {
  EldLenderEmployeeFilters,
  EldLenderEmployeeRow,
  EldLenderEmployeeSortMode,
  EldLenderEmployeeStatus,
} from "@/types/enterprise-lender-directory-ops";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
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
import { EldLenderEmployeeSlideOver } from "./eld-employee-slide-over";

const SORT_FIELD: Record<string, EldLenderEmployeeSortMode> = {
  employeeName: "employeeName",
  institutionName: "institutionName",
  designationLabel: "designationLabel",
  cityLabel: "cityLabel",
  performanceScore: "performanceScore",
  activeOpportunities: "activeOpportunities",
  activeDeals: "activeDeals",
  status: "status",
};

export function EldLenderEmployeesPanel() {
  const { user } = useAuthContext();
  const { options: productOptions } = useProductMasterOptions(true);
  const [rows, setRows] = useState<EldLenderEmployeeRow[]>([]);
  const [lenders, setLenders] = useState<EnterpriseLenderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [filters, setFilters] = useState<EldLenderEmployeeFilters>(EMPTY_ELD_EMPLOYEE_FILTERS);
  const [sortMode, setSortMode] = useState<EldLenderEmployeeSortMode>("employeeName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof ELD_PAGE_SIZES)[number]>(25);
  const [selected, setSelected] = useState<EldLenderEmployeeRow | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const productKey = productOptions.map((p) => p.code).join("|");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        await ensureEnterpriseRegistryHydrated(false).catch(() => undefined);
        const [contacts, lendersResult, dealsResult] = await Promise.all([
          loadEldLenderEmployeeContacts(),
          lenderRegistryClient.queryLenders({
            status: "active",
            enabled: true,
            pageSize: 500,
          }),
          enterpriseDealApiClient
            .searchDeals({ archived: false, pageSize: 200, view: "full" })
            .catch(() => ({ items: [] as Awaited<
              ReturnType<typeof enterpriseDealApiClient.searchDeals>
            >["items"] })),
        ]);
        if (cancelled) return;
        const lenderItems = lendersResult.items ?? [];
        setLenders(lenderItems);
        setRows(
          composeEldLenderEmployeeRows({
            contacts,
            lenders: lenderItems,
            deals: dealsResult.items ?? [],
            productOptions,
          }),
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
  // productKey stabilizes Product Master option identity without array-ref loops
  // eslint-disable-next-line react-hooks/exhaustive-deps -- productOptions consumed via productKey
  }, [reloadToken, productKey]);

  useEffect(() => subscribeEcmContactRegistry(() => setReloadToken((n) => n + 1)), []);
  useEffect(
    () => subscribeLenderRegistryUpdated(() => setReloadToken((n) => n + 1)),
    [],
  );

  const filterOptions = useMemo(() => uniqueEmployeeFilterValues(rows), [rows]);

  const filteredSorted = useMemo(() => {
    const filtered = filterEldLenderEmployeeRows(rows, filters);
    return sortEldLenderEmployeeRows(filtered, sortMode, sortDir);
  }, [rows, filters, sortMode, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const patchFilters = (patch: Partial<EldLenderEmployeeFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const openEmployee = (row: EldLenderEmployeeRow) => {
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
        field === "activeOpportunities" ||
          field === "activeDeals" ||
          field === "performanceScore"
          ? "desc"
          : "asc",
      );
      return field;
    });
    setPage(1);
  };

  const columns = useMemo<EnterpriseGridColumnDef<EldLenderEmployeeRow>[]>(
    () => [
      {
        id: "employeeName",
        label: "Employee Name",
        frozen: true,
        sortable: true,
        defaultOrder: 1,
        defaultWidth: 150,
        render: (row) => <span className="font-medium">{row.employeeName}</span>,
        exportValue: (row) => row.employeeName,
      },
      {
        id: "institutionName",
        label: "Institution",
        sortable: true,
        defaultOrder: 2,
        defaultWidth: 150,
        render: (row) => (
          <span className="text-[11px] text-muted-foreground">{row.institutionName}</span>
        ),
        exportValue: (row) => row.institutionName,
      },
      {
        id: "branchLabel",
        label: "Branch",
        defaultOrder: 3,
        defaultWidth: 110,
        render: (row) => (
          <span className="text-[11px] text-muted-foreground">{row.branchLabel}</span>
        ),
        exportValue: (row) => row.branchLabel,
      },
      {
        id: "cityLabel",
        label: "City",
        sortable: true,
        defaultOrder: 4,
        defaultWidth: 100,
        render: (row) => (
          <span className="text-[11px] text-muted-foreground">{row.cityLabel}</span>
        ),
        exportValue: (row) => row.cityLabel,
      },
      {
        id: "designationLabel",
        label: "Designation",
        sortable: true,
        defaultOrder: 5,
        defaultWidth: 130,
        render: (row) => <span className="text-[11px]">{row.designationLabel}</span>,
        exportValue: (row) => row.designationLabel,
      },
      {
        id: "productsHandled",
        label: "Products Handled",
        defaultOrder: 6,
        defaultWidth: 160,
        render: (row) => (
          <span className="line-clamp-2 text-[11px] text-muted-foreground">
            {row.productsHandledLabel}
          </span>
        ),
        exportValue: (row) => row.productsHandledLabel,
      },
      {
        id: "mobile",
        label: "Mobile Number",
        defaultOrder: 7,
        defaultWidth: 120,
        render: (row) => <span className="tabular-nums text-[11px]">{row.mobile}</span>,
        exportValue: (row) => row.mobile,
      },
      {
        id: "email",
        label: "Email Address",
        defaultOrder: 8,
        defaultWidth: 160,
        render: (row) => (
          <span className="truncate text-[11px] text-muted-foreground">{row.email}</span>
        ),
        exportValue: (row) => row.email,
      },
      {
        id: "performanceScore",
        label: "Performance Score",
        sortable: true,
        defaultOrder: 9,
        defaultWidth: 120,
        align: "right",
        render: (row) => (
          <span className="tabular-nums text-[11px] text-muted-foreground">
            {row.performanceScoreLabel}
          </span>
        ),
        exportValue: (row) => row.performanceScoreLabel,
      },
      {
        id: "activeOpportunities",
        label: "Active Opportunities",
        sortable: true,
        defaultOrder: 10,
        defaultWidth: 120,
        align: "right",
        render: (row) => (
          <span className="tabular-nums font-medium">{row.activeOpportunities}</span>
        ),
        exportValue: (row) => String(row.activeOpportunities),
      },
      {
        id: "activeDeals",
        label: "Active Deals",
        sortable: true,
        defaultOrder: 11,
        defaultWidth: 100,
        align: "right",
        render: (row) => (
          <span className="tabular-nums font-medium">{row.activeDeals}</span>
        ),
        exportValue: (row) => String(row.activeDeals),
      },
      {
        id: "totalSanctions",
        label: "Total Sanctions",
        defaultOrder: 12,
        defaultWidth: 110,
        align: "right",
        render: (row) => (
          <span className="tabular-nums">{row.totalSanctions}</span>
        ),
        exportValue: (row) => String(row.totalSanctions),
      },
      {
        id: "totalDisbursements",
        label: "Total Disbursements",
        defaultOrder: 13,
        defaultWidth: 130,
        align: "right",
        render: (row) => (
          <span className="tabular-nums">{row.totalDisbursements}</span>
        ),
        exportValue: (row) => String(row.totalDisbursements),
      },
      {
        id: "averageTat",
        label: "Average TAT",
        defaultOrder: 14,
        defaultWidth: 100,
        align: "right",
        render: (row) => (
          <span className="tabular-nums text-[11px] text-muted-foreground">
            {row.averageTatLabel}
          </span>
        ),
        exportValue: (row) => row.averageTatLabel,
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        defaultOrder: 15,
        defaultWidth: 96,
        render: (row) => (
          <span
            className={cn(
              "text-[11px] font-medium uppercase tracking-wide",
              row.status === "active"
                ? "text-emerald-700"
                : row.status === "provisional"
                  ? "text-amber-700"
                  : "text-muted-foreground",
            )}
          >
            {row.statusLabel}
          </span>
        ),
        exportValue: (row) => row.statusLabel,
      },
    ],
    [],
  );

  const filtersActive =
    Boolean(filters.search) ||
    filters.lenderId !== "all" ||
    filters.product !== "all" ||
    filters.designation !== "all" ||
    filters.city !== "all" ||
    filters.region !== "all" ||
    filters.status !== "all" ||
    filters.performance !== "all";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-border/70 bg-muted/20 px-2 py-1.5 text-[11px] text-muted-foreground">
        <p>
          Central registry of{" "}
          <span className="font-medium text-foreground">Lender Contacts</span> from Enterprise
          Contact Registry (role = Lender Contact). Institution from Lender Registry · products from
          Product Master. Click a row to open the employee workspace.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border border-border/70 bg-card px-2 py-1.5">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => patchFilters({ search: e.target.value })}
            placeholder="Search name, mobile, email, institution, designation…"
            className="h-8 border-border/60 pl-7 text-xs"
          />
        </div>
        <Select
          value={filters.lenderId}
          onValueChange={(v) => patchFilters({ lenderId: v })}
        >
          <SelectTrigger className="h-8 w-[11rem] text-xs">
            <SelectValue placeholder="Lender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All lenders
            </SelectItem>
            {lenders.map((l) => (
              <SelectItem key={l.id} value={l.id} className="text-xs">
                {l.label}
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
            {productOptions.map((p) => (
              <SelectItem key={p.code} value={p.code} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.designation}
          onValueChange={(v) => patchFilters({ designation: v })}
        >
          <SelectTrigger className="h-8 w-[11rem] text-xs">
            <SelectValue placeholder="Designation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All designations
            </SelectItem>
            {filterOptions.designations.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-xs">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.city} onValueChange={(v) => patchFilters({ city: v })}>
          <SelectTrigger className="h-8 w-[9rem] text-xs">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All cities
            </SelectItem>
            {filterOptions.cities.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.region}
          onValueChange={(v) => patchFilters({ region: v })}
        >
          <SelectTrigger className="h-8 w-[9rem] text-xs">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All regions
            </SelectItem>
            {filterOptions.regions.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-xs">
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(v) =>
            patchFilters({ status: v as EldLenderEmployeeStatus | "all" })
          }
        >
          <SelectTrigger className="h-8 w-[9rem] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {ELD_EMPLOYEE_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.performance}
          onValueChange={(v) =>
            patchFilters({
              performance: v as EldLenderEmployeeFilters["performance"],
            })
          }
        >
          <SelectTrigger className="h-8 w-[11rem] text-xs">
            <SelectValue placeholder="Performance" />
          </SelectTrigger>
          <SelectContent>
            {ELD_EMPLOYEE_PERFORMANCE_FILTER_OPTIONS.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-[11px]"
          disabled={filteredSorted.length === 0}
          onClick={() =>
            downloadCsv(
              exportEldLenderEmployeesCsv(filteredSorted),
              "lender-employees.csv",
            )
          }
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
        {filtersActive ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-[11px]"
            onClick={() => {
              setFilters(EMPTY_ELD_EMPLOYEE_FILTERS);
              setPage(1);
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1">
        <EnterpriseDataGrid
          className="min-h-0 flex-1"
          storageKey="catalyst.eld.lender-employees.v1"
          userId={user?.id}
          density="dense"
          fillViewport
          columns={columns}
          rows={pageRows}
          rowKey={(r) => r.contactId}
          emptyMessage="No lender employees match the current filters."
          toolbarLabel={`Lender Employees (${filteredSorted.length})`}
          sortColumnId={
            Object.entries(SORT_FIELD).find(([, v]) => v === sortMode)?.[0] ?? null
          }
          sortDirection={sortDir}
          onSort={handleSort}
          onRowClick={openEmployee}
          highlightedRowKey={panelOpen ? selected?.contactId : null}
          maxHeightClassName="h-full max-h-none min-h-0 flex-1"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border border-border/60 px-2 py-1.5 text-[11px] text-muted-foreground">
        <span>
          {filteredSorted.length} employee{filteredSorted.length === 1 ? "" : "s"}
          {loading ? " · Loading…" : ""}
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

      <EldLenderEmployeeSlideOver
        open={panelOpen}
        onOpenChange={setPanelOpen}
        row={selected}
        onSaved={() => {
          setReloadToken((n) => n + 1);
          setPanelOpen(false);
        }}
      />
    </div>
  );
}
