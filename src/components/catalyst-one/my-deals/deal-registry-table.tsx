"use client";

import { useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
import { StatusPill } from "@/components/design-system/status-pill";
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
import { PIPELINE_STAGES } from "@/constants/loan-stage-master";
import { LOAN_FILE_PRIORITY_STYLES } from "@/constants/loan-status";
import {
  exportDealRegistryCsv,
  filterDealRegistryRows,
  sortDealRegistryRows,
  uniqueDealValues,
} from "@/lib/my-deals/deal-registry";
import { downloadCsv } from "@/lib/loan-files-utils";
import {
  DEAL_REGISTRY_PAGE_SIZES,
  EMPTY_DEAL_REGISTRY_FILTERS,
  type DealRegistryFilters,
  type DealRegistryRow,
  type DealRegistrySortField,
} from "@/types/deal-registry";
import { cn } from "@/lib/utils";

const SORT_MAP: Record<string, DealRegistrySortField> = {
  dealId: "dealId",
  borrowerName: "borrowerName",
  product: "product",
  loanAmount: "loanAmount",
  assignedRm: "assignedRm",
  grossStage: "grossStageLabel",
  subStage: "subStage",
  selectedLender: "selectedLender",
  expectedRevenue: "expectedRevenue",
  priority: "priority",
  lastActivity: "lastActivity",
  dateCreated: "dateCreated",
  status: "status",
  contactNumber: "contactNumber",
  city: "city",
  source: "source",
  channelPartner: "channelPartner",
  creditExecutive: "creditExecutive",
  operationsExecutive: "operationsExecutive",
  sanctionAmount: "sanctionAmount",
  disbursedAmount: "disbursedAmount",
  roi: "roi",
  tat: "tatDays",
  lastModified: "lastModified",
  nextFollowUp: "nextFollowUp",
  documentsPending: "documentsPending",
  tasksPending: "tasksPending",
  riskIndicator: "riskIndicator",
};

const PRIORITY_OPTIONS = ["urgent", "high", "medium", "low"] as const;

interface DealRegistryTableProps {
  rows: DealRegistryRow[];
  currentRm: string;
  onOpenDeal: (row: DealRegistryRow) => void;
  initialScope?: DealRegistryFilters["scope"];
  initialSearch?: string;
  onFiltersChanged?: (filters: DealRegistryFilters) => void;
}

/**
 * CO-SPRINT-098 â€” Enterprise Deal Registry (My Deals) â€” Enterprise Table Standard.
 */
export function DealRegistryTable({
  rows: allRows,
  currentRm,
  onOpenDeal,
  initialScope = "my_team",
  initialSearch = "",
  onFiltersChanged,
}: DealRegistryTableProps) {
  const { user } = useAuthContext();
  const [filters, setFilters] = useState<DealRegistryFilters>(() => ({
    ...EMPTY_DEAL_REGISTRY_FILTERS,
    scope: initialScope,
    search: initialSearch,
  }));
  const [sortField, setSortField] = useState<DealRegistrySortField>("lastActivity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof DEAL_REGISTRY_PAGE_SIZES)[number]>(20);

  const products = useMemo(() => uniqueDealValues(allRows, "product"), [allRows]);
  const rms = useMemo(() => uniqueDealValues(allRows, "assignedRm"), [allRows]);
  const lenders = useMemo(() => uniqueDealValues(allRows, "selectedLender"), [allRows]);
  const branches = useMemo(() => uniqueDealValues(allRows, "branch"), [allRows]);
  const cities = useMemo(() => uniqueDealValues(allRows, "city"), [allRows]);
  const states = useMemo(() => uniqueDealValues(allRows, "state"), [allRows]);
  const sources = useMemo(() => uniqueDealValues(allRows, "source"), [allRows]);
  const statuses = useMemo(() => uniqueDealValues(allRows, "status"), [allRows]);
  const subStages = useMemo(() => uniqueDealValues(allRows, "subStage"), [allRows]);

  const filteredSorted = useMemo(() => {
    const filtered = filterDealRegistryRows(allRows, filters, currentRm);
    return sortDealRegistryRows(filtered, sortField, sortDir);
  }, [allRows, filters, currentRm, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const patchFilters = (patch: Partial<DealRegistryFilters>) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      onFiltersChanged?.(next);
      return next;
    });
    setPage(1);
  };

  const handleSort = (columnId: string) => {
    const field = SORT_MAP[columnId];
    if (!field) return;
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return field;
      }
      const numericDesc =
        field === "loanAmount" ||
        field === "expectedRevenue" ||
        field === "lastActivity" ||
        field === "dateCreated" ||
        field === "lastModified" ||
        field === "sanctionAmount" ||
        field === "disbursedAmount" ||
        field === "roi" ||
        field === "tatDays" ||
        field === "documentsPending" ||
        field === "tasksPending";
      setSortDir(numericDesc ? "desc" : "asc");
      return field;
    });
    setPage(1);
  };

  const columns = useMemo<EnterpriseGridColumnDef<DealRegistryRow>[]>(
    () => [
      {
        id: "dealId",
        label: "Deal ID",
        frozen: true,
        sortable: true,
        defaultOrder: 1,
        defaultWidth: 100,
        render: (row) => (
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {row.dealId}
          </span>
        ),
        exportValue: (row) => row.dealId,
      },
      {
        id: "borrowerName",
        label: "Borrower Name",
        frozen: true,
        sortable: true,
        defaultOrder: 2,
        defaultWidth: 150,
        render: (row) => <span className="font-medium">{row.borrowerName}</span>,
        exportValue: (row) => row.borrowerName,
      },
      {
        id: "product",
        label: "Product",
        sortable: true,
        defaultOrder: 3,
        defaultWidth: 110,
        render: (row) => row.product,
        exportValue: (row) => row.product,
      },
      {
        id: "loanAmount",
        label: "Loan Amount",
        sortable: true,
        defaultOrder: 4,
        defaultWidth: 110,
        align: "right",
        render: (row) => (
          <span className="tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
            {row.loanAmountLabel}
          </span>
        ),
        exportValue: (row) => String(row.loanAmount),
      },
      {
        id: "assignedRm",
        label: "Assigned RM",
        sortable: true,
        defaultOrder: 5,
        defaultWidth: 120,
        render: (row) => row.assignedRm,
        exportValue: (row) => row.assignedRm,
      },
      {
        id: "grossStage",
        label: "Gross Stage",
        sortable: true,
        defaultOrder: 6,
        defaultWidth: 120,
        render: (row) => row.grossStageLabel,
        exportValue: (row) => row.grossStageLabel,
      },
      {
        id: "subStage",
        label: "Sub Stage",
        sortable: true,
        defaultOrder: 7,
        defaultWidth: 120,
        render: (row) => (
          <span className="truncate text-muted-foreground">{row.subStage}</span>
        ),
        exportValue: (row) => row.subStage,
      },
      {
        id: "selectedLender",
        label: "Selected Lender",
        sortable: true,
        defaultOrder: 8,
        defaultWidth: 130,
        render: (row) => (
          <span className="font-medium text-amber-700 dark:text-amber-400">
            {row.selectedLender}
          </span>
        ),
        exportValue: (row) => row.selectedLender,
      },
      {
        id: "expectedRevenue",
        label: "Expected Revenue",
        sortable: true,
        defaultOrder: 9,
        defaultWidth: 120,
        align: "right",
        render: (row) => (
          <span className="tabular-nums">{row.expectedRevenueLabel}</span>
        ),
        exportValue: (row) => String(row.expectedRevenue),
      },
      {
        id: "priority",
        label: "Priority",
        sortable: true,
        defaultOrder: 10,
        defaultWidth: 88,
        render: (row) => (
          <StatusPill
            className={cn(
              "capitalize",
              LOAN_FILE_PRIORITY_STYLES[row.priority]?.className,
            )}
          >
            {row.priority}
          </StatusPill>
        ),
        exportValue: (row) => row.priority,
      },
      {
        id: "lastActivity",
        label: "Last Activity",
        sortable: true,
        defaultOrder: 11,
        defaultWidth: 120,
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.lastActivityLabel}</span>
        ),
        exportValue: (row) => row.lastActivityLabel,
      },
      {
        id: "dateCreated",
        label: "Date Created",
        sortable: true,
        defaultOrder: 12,
        defaultWidth: 100,
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.dateCreatedLabel}</span>
        ),
        exportValue: (row) => row.dateCreatedLabel,
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        defaultOrder: 13,
        defaultWidth: 96,
        render: (row) => (
          <span className="capitalize text-muted-foreground">{row.statusLabel}</span>
        ),
        exportValue: (row) => row.statusLabel,
      },
      {
        id: "contactNumber",
        label: "Contact Number",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 20,
        defaultWidth: 118,
        render: (row) => <span className="tabular-nums">{row.contactNumber}</span>,
        exportValue: (row) => row.contactNumber,
      },
      {
        id: "city",
        label: "City",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 21,
        defaultWidth: 100,
        render: (row) => row.city,
        exportValue: (row) => row.city,
      },
      {
        id: "source",
        label: "Source",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 22,
        defaultWidth: 110,
        render: (row) => row.source,
        exportValue: (row) => row.source,
      },
      {
        id: "channelPartner",
        label: "Channel Partner",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 23,
        defaultWidth: 130,
        render: (row) => row.channelPartner,
        exportValue: (row) => row.channelPartner,
      },
      {
        id: "creditExecutive",
        label: "Credit Executive",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 24,
        defaultWidth: 120,
        render: (row) => row.creditExecutive,
        exportValue: (row) => row.creditExecutive,
      },
      {
        id: "operationsExecutive",
        label: "Operations Executive",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 25,
        defaultWidth: 140,
        render: (row) => row.operationsExecutive,
        exportValue: (row) => row.operationsExecutive,
      },
      {
        id: "sanctionAmount",
        label: "Sanction Amount",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 26,
        defaultWidth: 120,
        align: "right",
        render: (row) => (
          <span className="tabular-nums">{row.sanctionAmountLabel}</span>
        ),
        exportValue: (row) => String(row.sanctionAmount),
      },
      {
        id: "disbursedAmount",
        label: "Disbursed Amount",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 27,
        defaultWidth: 120,
        align: "right",
        render: (row) => (
          <span className="tabular-nums">{row.disbursedAmountLabel}</span>
        ),
        exportValue: (row) => String(row.disbursedAmount),
      },
      {
        id: "roi",
        label: "ROI",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 28,
        defaultWidth: 72,
        align: "right",
        render: (row) => <span className="tabular-nums">{row.roiLabel}</span>,
        exportValue: (row) => row.roiLabel,
      },
      {
        id: "tat",
        label: "TAT",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 29,
        defaultWidth: 64,
        align: "right",
        render: (row) => (
          <span className="tabular-nums">{row.tatDays ? `${row.tatDays}d` : "â€”"}</span>
        ),
        exportValue: (row) => String(row.tatDays),
      },
      {
        id: "lastModified",
        label: "Last Modified",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 30,
        defaultWidth: 110,
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.lastModifiedLabel}</span>
        ),
        exportValue: (row) => row.lastModifiedLabel,
      },
      {
        id: "nextFollowUp",
        label: "Next Follow-up",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 31,
        defaultWidth: 110,
        render: (row) => row.nextFollowUp,
        exportValue: (row) => row.nextFollowUp,
      },
      {
        id: "documentsPending",
        label: "Documents Pending",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 32,
        defaultWidth: 120,
        align: "right",
        render: (row) => <span className="tabular-nums">{row.documentsPending}</span>,
        exportValue: (row) => String(row.documentsPending),
      },
      {
        id: "tasksPending",
        label: "Tasks Pending",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 33,
        defaultWidth: 100,
        align: "right",
        render: (row) => <span className="tabular-nums">{row.tasksPending}</span>,
        exportValue: (row) => String(row.tasksPending),
      },
      {
        id: "riskIndicator",
        label: "Risk Indicator",
        sortable: true,
        defaultVisible: false,
        defaultOrder: 34,
        defaultWidth: 100,
        render: (row) => (
          <span
            className={cn(
              "font-medium",
              row.riskIndicator === "High" && "text-destructive",
              row.riskIndicator === "Medium" && "text-amber-600 dark:text-amber-400",
              row.riskIndicator === "Low" && "text-muted-foreground",
            )}
          >
            {row.riskIndicator}
          </span>
        ),
        exportValue: (row) => row.riskIndicator,
      },
    ],
    [],
  );

  const hasFilters =
    Boolean(filters.search) ||
    filters.product !== "all" ||
    filters.grossStage !== "all" ||
    filters.subStage !== "all" ||
    filters.assignedRm !== "all" ||
    filters.lender !== "all" ||
    filters.branch !== "all" ||
    filters.city !== "all" ||
    filters.state !== "all" ||
    filters.priority !== "all" ||
    filters.status !== "all" ||
    filters.source !== "all" ||
    Boolean(filters.amountMin) ||
    Boolean(filters.amountMax) ||
    Boolean(filters.revenueMin) ||
    Boolean(filters.revenueMax) ||
    Boolean(filters.dateCreatedFrom) ||
    Boolean(filters.dateCreatedTo) ||
    Boolean(filters.lastUpdatedFrom) ||
    Boolean(filters.lastUpdatedTo) ||
    Boolean(filters.columnBorrower) ||
    Boolean(filters.columnDealId) ||
    filters.scope !== "my_team";

  const sortColumnId =
    Object.entries(SORT_MAP).find(([, f]) => f === sortField)?.[0] ?? "lastActivity";

  const selectClass = "h-7 w-[128px] rounded-sm text-[11px]";

  return (
    <div className="space-y-2">
      <div className="space-y-1.5 border border-slate-300 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-card">
        <div className="flex flex-wrap gap-1.5">
          <Select
            value={filters.scope}
            onValueChange={(v) =>
              patchFilters({ scope: v as DealRegistryFilters["scope"] })
            }
          >
            <SelectTrigger className={cn(selectClass, "w-[120px]")}>
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="my_deals">My Deals</SelectItem>
              <SelectItem value="my_team">My Team</SelectItem>
              <SelectItem value="all">All Deals</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={filters.search}
            onChange={(e) => patchFilters({ search: e.target.value })}
            placeholder="Global searchâ€¦"
            className="h-7 w-[180px] rounded-sm text-[11px]"
          />
          <Input
            value={filters.columnDealId}
            onChange={(e) => patchFilters({ columnDealId: e.target.value })}
            placeholder="Column: Deal ID"
            className="h-7 w-[120px] rounded-sm text-[11px]"
          />
          <Input
            value={filters.columnBorrower}
            onChange={(e) => patchFilters({ columnBorrower: e.target.value })}
            placeholder="Column: Borrower"
            className="h-7 w-[130px] rounded-sm text-[11px]"
          />
          <Select value={filters.product} onValueChange={(v) => patchFilters({ product: v })}>
            <SelectTrigger className={selectClass}>
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.grossStage}
            onValueChange={(v) => patchFilters({ grossStage: v, subStage: "all" })}
          >
            <SelectTrigger className={selectClass}>
              <SelectValue placeholder="Gross Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.subStage} onValueChange={(v) => patchFilters({ subStage: v })}>
            <SelectTrigger className={selectClass}>
              <SelectValue placeholder="Sub Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sub Stages</SelectItem>
              {subStages.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.assignedRm}
            onValueChange={(v) => patchFilters({ assignedRm: v })}
          >
            <SelectTrigger className={cn(selectClass, "w-[140px]")}>
              <SelectValue placeholder="Assigned RM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All RMs</SelectItem>
              {rms.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.lender} onValueChange={(v) => patchFilters({ lender: v })}>
            <SelectTrigger className={selectClass}>
              <SelectValue placeholder="Lender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lenders</SelectItem>
              {lenders.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.branch} onValueChange={(v) => patchFilters({ branch: v })}>
            <SelectTrigger className={selectClass}>
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.state}
            onValueChange={(v) => patchFilters({ state: v, city: "all" })}
          >
            <SelectTrigger className={cn(selectClass, "w-[120px]")}>
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
            <SelectTrigger className={cn(selectClass, "w-[120px]")}>
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
          <Select value={filters.priority} onValueChange={(v) => patchFilters({ priority: v })}>
            <SelectTrigger className={cn(selectClass, "w-[110px]")}>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(v) => patchFilters({ status: v })}>
            <SelectTrigger className={cn(selectClass, "w-[120px]")}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.source} onValueChange={(v) => patchFilters({ source: v })}>
            <SelectTrigger className={selectClass}>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Loan amt
          </span>
          <Input
            value={filters.amountMin}
            onChange={(e) => patchFilters({ amountMin: e.target.value })}
            placeholder="Min"
            className="h-7 w-[72px] rounded-sm text-[11px]"
            inputMode="numeric"
          />
          <span className="text-[11px] text-muted-foreground">â€“</span>
          <Input
            value={filters.amountMax}
            onChange={(e) => patchFilters({ amountMax: e.target.value })}
            placeholder="Max"
            className="h-7 w-[72px] rounded-sm text-[11px]"
            inputMode="numeric"
          />
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Revenue
          </span>
          <Input
            value={filters.revenueMin}
            onChange={(e) => patchFilters({ revenueMin: e.target.value })}
            placeholder="Min"
            className="h-7 w-[72px] rounded-sm text-[11px]"
            inputMode="numeric"
          />
          <span className="text-[11px] text-muted-foreground">â€“</span>
          <Input
            value={filters.revenueMax}
            onChange={(e) => patchFilters({ revenueMax: e.target.value })}
            placeholder="Max"
            className="h-7 w-[72px] rounded-sm text-[11px]"
            inputMode="numeric"
          />
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Created
          </span>
          <Input
            type="date"
            value={filters.dateCreatedFrom}
            onChange={(e) => patchFilters({ dateCreatedFrom: e.target.value })}
            className="h-7 w-[128px] rounded-sm text-[11px]"
          />
          <span className="text-[11px] text-muted-foreground">â€“</span>
          <Input
            type="date"
            value={filters.dateCreatedTo}
            onChange={(e) => patchFilters({ dateCreatedTo: e.target.value })}
            className="h-7 w-[128px] rounded-sm text-[11px]"
          />
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Updated
          </span>
          <Input
            type="date"
            value={filters.lastUpdatedFrom}
            onChange={(e) => patchFilters({ lastUpdatedFrom: e.target.value })}
            className="h-7 w-[128px] rounded-sm text-[11px]"
          />
          <span className="text-[11px] text-muted-foreground">â€“</span>
          <Input
            type="date"
            value={filters.lastUpdatedTo}
            onChange={(e) => patchFilters({ lastUpdatedTo: e.target.value })}
            className="h-7 w-[128px] rounded-sm text-[11px]"
          />
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => {
                const next = { ...EMPTY_DEAL_REGISTRY_FILTERS };
                setFilters(next);
                onFiltersChanged?.(next);
                setPage(1);
              }}
            >
              <X className="mr-1 h-3 w-3" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      <EnterpriseDataGrid
        storageKey="catalyst.my-deals.registry.v1"
        userId={user?.id}
        density="compact"
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        emptyMessage="No deals match the current filters."
        toolbarLabel={`Deal Registry Â· ${filteredSorted.length} deals`}
        sortColumnId={sortColumnId}
        sortDirection={sortDir}
        onSort={handleSort}
        onRowClick={onOpenDeal}
        maxHeightClassName="max-h-[min(78vh,900px)]"
        toolbarActions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-md text-[11px]"
            onClick={() => {
              downloadCsv(
                exportDealRegistryCsv(filteredSorted),
                `deal-registry-${new Date().toISOString().slice(0, 10)}.csv`,
              );
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Export to Excel
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-300 bg-slate-50/80 px-2.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {filteredSorted.length === 0
            ? "0 deals"
            : `${(safePage - 1) * pageSize + 1}â€“${Math.min(safePage * pageSize, filteredSorted.length)} of ${filteredSorted.length}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v) as (typeof DEAL_REGISTRY_PAGE_SIZES)[number]);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-[72px] rounded-sm text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEAL_REGISTRY_PAGE_SIZES.map((size) => (
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
