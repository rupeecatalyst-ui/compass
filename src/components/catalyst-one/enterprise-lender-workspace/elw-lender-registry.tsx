"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, X } from "lucide-react";
import {
  ELW_DIRECTORY_DEFAULT_PRODUCT_ID,
  ELW_DIRECTORY_PAGE_SIZES,
  ELW_DIRECTORY_PRODUCTS,
} from "@/constants/enterprise-lender-directory";
import { buildElwWorkspaceHref } from "@/constants/enterprise-lender-workspace";
import {
  EMPTY_LENDER_DIRECTORY_FILTERS,
  exportLenderProgramsCsv,
  filterLenderPrograms,
  listLenderProgramsForProduct,
  sortLenderPrograms,
  uniqueCities,
  uniqueStates,
  type LenderDirectoryFilters,
  type LenderDirectorySortField,
} from "@/lib/enterprise-lender-directory";
import { downloadCsv } from "@/lib/loan-files-utils";
import type { ElwLenderProgramRow } from "@/types/enterprise-lender-directory";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
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

type SortState =
  | { field: "default"; direction: "asc" }
  | { field: LenderDirectorySortField; direction: "asc" | "desc" };

const SCORE_FIELD: Record<string, LenderDirectorySortField> = {
  lender: "lenderName",
  programName: "programName",
  roi: "roi",
  lenderScore: "lenderScore",
  contactScore: "contactScore",
  maxFunding: "maxFundingAmount",
  maxTenure: "maxTenureLabel",
  processingFee: "processingFeePct",
  averageTat: "averageTatDays",
  status: "status",
};

function ScoreCell({ value }: { value: number }) {
  const tone =
    value >= 85 ? "text-emerald-700" : value >= 70 ? "text-foreground" : "text-amber-700";
  return <span className={cn("font-semibold tabular-nums", tone)}>{value}</span>;
}

/**
 * Enterprise Lender Directory — Enterprise Table Standard.
 * Dense spreadsheet listing for operational comparison; no decorative cards.
 */
export function ElwLenderRegistry() {
  const router = useRouter();
  const [productId, setProductId] = useState(ELW_DIRECTORY_DEFAULT_PRODUCT_ID);
  const [filters, setFilters] = useState<LenderDirectoryFilters>(EMPTY_LENDER_DIRECTORY_FILTERS);
  const [sort, setSort] = useState<SortState>({ field: "default", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof ELW_DIRECTORY_PAGE_SIZES)[number]>(20);

  const productPrograms = useMemo(() => listLenderProgramsForProduct(productId), [productId]);

  const states = useMemo(() => uniqueStates(productPrograms), [productPrograms]);
  const cities = useMemo(
    () => uniqueCities(productPrograms, filters.state),
    [productPrograms, filters.state],
  );

  const filteredSorted = useMemo(() => {
    const filtered = filterLenderPrograms(productPrograms, filters);
    return sortLenderPrograms(filtered, sort.field, sort.direction);
  }, [productPrograms, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectProduct = (id: string) => {
    setProductId(id);
    setFilters(EMPTY_LENDER_DIRECTORY_FILTERS);
    setSort({ field: "default", direction: "asc" });
    setPage(1);
  };

  const patchFilters = (patch: Partial<LenderDirectoryFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const handleSort = (columnId: string) => {
    const field = SCORE_FIELD[columnId];
    if (!field) return;
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      const defaultDir: "asc" | "desc" =
        field === "roi" || field === "processingFeePct" || field === "averageTatDays"
          ? "asc"
          : field === "lenderScore" || field === "contactScore" || field === "maxFundingAmount"
            ? "desc"
            : "asc";
      return { field, direction: defaultDir };
    });
    setPage(1);
  };

  const columns = useMemo<EnterpriseGridColumnDef<ElwLenderProgramRow>[]>(
    () => [
      {
        id: "lender",
        label: "Lender",
        frozen: true,
        sortable: true,
        defaultOrder: 1,
        defaultWidth: 160,
        render: (row) => <span className="font-medium">{row.lenderName}</span>,
        exportValue: (row) => row.lenderName,
      },
      {
        id: "programName",
        label: "Program Name",
        sortable: true,
        defaultOrder: 2,
        defaultWidth: 200,
        render: (row) => <span className="text-muted-foreground">{row.programName}</span>,
        exportValue: (row) => row.programName,
      },
      {
        id: "roi",
        label: "Interest Rate (ROI)",
        sortable: true,
        defaultOrder: 3,
        defaultWidth: 130,
        align: "right",
        render: (row) => <span className="font-medium tabular-nums">{row.roiLabel}</span>,
        exportValue: (row) => row.roiLabel,
      },
      {
        id: "lenderScore",
        label: "Lender Score",
        sortable: true,
        defaultOrder: 4,
        defaultWidth: 96,
        align: "center",
        render: (row) => <ScoreCell value={row.lenderScore} />,
        exportValue: (row) => String(row.lenderScore),
      },
      {
        id: "contactScore",
        label: "Contact Score",
        sortable: true,
        defaultOrder: 5,
        defaultWidth: 96,
        align: "center",
        render: (row) => <ScoreCell value={row.contactScore} />,
        exportValue: (row) => String(row.contactScore),
      },
      {
        id: "maxFunding",
        label: "Maximum Funding / LTV",
        sortable: true,
        defaultOrder: 6,
        defaultWidth: 150,
        render: (row) => <span className="tabular-nums">{row.maxFundingLabel}</span>,
        exportValue: (row) => row.maxFundingLabel,
      },
      {
        id: "maxTenure",
        label: "Maximum Tenure",
        sortable: true,
        defaultOrder: 7,
        defaultWidth: 118,
        render: (row) => row.maxTenureLabel,
        exportValue: (row) => row.maxTenureLabel,
      },
      {
        id: "processingFee",
        label: "Processing Fee",
        sortable: true,
        defaultOrder: 8,
        defaultWidth: 118,
        render: (row) => <span className="tabular-nums">{row.processingFeeLabel}</span>,
        exportValue: (row) => row.processingFeeLabel,
      },
      {
        id: "averageTat",
        label: "Average TAT",
        sortable: true,
        defaultOrder: 9,
        defaultWidth: 92,
        align: "right",
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.averageTatDays}d</span>
        ),
        exportValue: (row) => `${row.averageTatDays} days`,
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        defaultOrder: 10,
        defaultWidth: 88,
        render: (row) => (
          <span
            className={cn(
              "tabular-nums text-[11px] font-medium uppercase tracking-wide",
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

  const hasFilters =
    filters.search ||
    filters.state !== "all" ||
    filters.city !== "all" ||
    filters.institutionType !== "all" ||
    filters.status !== "all" ||
    filters.employment !== "all" ||
    filters.roiMin ||
    filters.roiMax ||
    filters.minCibil ||
    filters.feeMin ||
    filters.feeMax ||
    filters.columnLender ||
    filters.columnProgram;

  const activeProduct = ELW_DIRECTORY_PRODUCTS.find((p) => p.id === productId);

  return (
    <div className="space-y-2">
      {/* Product Selection Bar — navigation strip (not decorative cards) */}
      <div className="border border-slate-300 bg-slate-50/80 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Product
          </span>
          {ELW_DIRECTORY_PRODUCTS.map((product) => {
            const active = product.id === productId;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => selectProduct(product.id)}
                className={cn(
                  "border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900"
                    : "border-slate-300 bg-white text-foreground hover:bg-slate-100 dark:border-zinc-600 dark:bg-zinc-950 dark:hover:bg-zinc-800",
                )}
              >
                {product.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact filter toolbar */}
      <div className="space-y-1.5 border border-slate-300 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-card">
        <div className="flex flex-wrap gap-1.5">
          <Input
            value={filters.search}
            onChange={(e) => patchFilters({ search: e.target.value })}
            placeholder="Search lender, program, city…"
            className="h-7 w-[200px] rounded-sm text-[11px]"
          />
          <Input
            value={filters.columnLender}
            onChange={(e) => patchFilters({ columnLender: e.target.value })}
            placeholder="Column: Lender"
            className="h-7 w-[130px] rounded-sm text-[11px]"
          />
          <Input
            value={filters.columnProgram}
            onChange={(e) => patchFilters({ columnProgram: e.target.value })}
            placeholder="Column: Program"
            className="h-7 w-[140px] rounded-sm text-[11px]"
          />
          <Select value={filters.state} onValueChange={(v) => patchFilters({ state: v, city: "all" })}>
            <SelectTrigger className="h-7 w-[120px] rounded-sm text-[11px]">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.city} onValueChange={(v) => patchFilters({ city: v })}>
            <SelectTrigger className="h-7 w-[120px] rounded-sm text-[11px]">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.institutionType}
            onValueChange={(v) =>
              patchFilters({ institutionType: v as LenderDirectoryFilters["institutionType"] })
            }
          >
            <SelectTrigger className="h-7 w-[140px] rounded-sm text-[11px]">
              <SelectValue placeholder="Institution" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bank / NBFC / HFC</SelectItem>
              <SelectItem value="Bank">Bank</SelectItem>
              <SelectItem value="NBFC">NBFC</SelectItem>
              <SelectItem value="HFC">HFC</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) => patchFilters({ status: v as LenderDirectoryFilters["status"] })}
          >
            <SelectTrigger className="h-7 w-[120px] rounded-sm text-[11px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Active / Inactive</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.employment}
            onValueChange={(v) =>
              patchFilters({ employment: v as LenderDirectoryFilters["employment"] })
            }
          >
            <SelectTrigger className="h-7 w-[150px] rounded-sm text-[11px]">
              <SelectValue placeholder="Employment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Salaried / Self-employed</SelectItem>
              <SelectItem value="salaried">Salaried</SelectItem>
              <SelectItem value="self_employed">Self-employed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            ROI
          </span>
          <Input
            value={filters.roiMin}
            onChange={(e) => patchFilters({ roiMin: e.target.value })}
            placeholder="Min %"
            className="h-7 w-[64px] rounded-sm text-[11px]"
            inputMode="decimal"
          />
          <span className="text-[11px] text-muted-foreground">–</span>
          <Input
            value={filters.roiMax}
            onChange={(e) => patchFilters({ roiMax: e.target.value })}
            placeholder="Max %"
            className="h-7 w-[64px] rounded-sm text-[11px]"
            inputMode="decimal"
          />
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Min CIBIL
          </span>
          <Input
            value={filters.minCibil}
            onChange={(e) => patchFilters({ minCibil: e.target.value })}
            placeholder="700"
            className="h-7 w-[72px] rounded-sm text-[11px]"
            inputMode="numeric"
          />
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Fee %
          </span>
          <Input
            value={filters.feeMin}
            onChange={(e) => patchFilters({ feeMin: e.target.value })}
            placeholder="Min"
            className="h-7 w-[56px] rounded-sm text-[11px]"
            inputMode="decimal"
          />
          <span className="text-[11px] text-muted-foreground">–</span>
          <Input
            value={filters.feeMax}
            onChange={(e) => patchFilters({ feeMax: e.target.value })}
            placeholder="Max"
            className="h-7 w-[56px] rounded-sm text-[11px]"
            inputMode="decimal"
          />
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => {
                setFilters(EMPTY_LENDER_DIRECTORY_FILTERS);
                setPage(1);
              }}
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <EnterpriseDataGrid
        storageKey="catalyst.elw.lender-directory.v2"
        density="compact"
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        emptyMessage={`No lender programs for ${activeProduct?.label ?? "this product"}.`}
        toolbarLabel={`${activeProduct?.label ?? "Programs"} · ${filteredSorted.length} programs`}
        sortColumnId={sort.field === "default" ? "roi" : Object.entries(SCORE_FIELD).find(([, f]) => f === sort.field)?.[0]}
        sortDirection={sort.field === "default" ? "asc" : sort.direction}
        onSort={handleSort}
        onRowClick={(row) => {
          router.push(
            buildElwWorkspaceHref(row.lenderId, {
              from: "lenders",
              returnTo: "/lenders",
            }),
          );
        }}
        toolbarActions={
          <>
            <p className="hidden text-[10px] text-muted-foreground xl:block">
              Sort: ROI ↑ · Lender Score ↓ · Contact Score ↓
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-md text-[11px]"
              onClick={() => {
                const csv = exportLenderProgramsCsv(filteredSorted);
                downloadCsv(
                  csv,
                  `lender-programs-${productId}-${new Date().toISOString().slice(0, 10)}.csv`,
                );
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Export to Excel
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-300 bg-slate-50/80 px-2.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {filteredSorted.length === 0
            ? "0 programs"
            : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredSorted.length)} of ${filteredSorted.length}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v) as (typeof ELW_DIRECTORY_PAGE_SIZES)[number]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-[72px] rounded-sm text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ELW_DIRECTORY_PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-sm px-2 text-[11px]"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-[11px] tabular-nums">
              {safePage}/{totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-sm px-2 text-[11px]"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
