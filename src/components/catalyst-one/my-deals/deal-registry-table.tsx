"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Filter, FilterX, X } from "lucide-react";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
import { RegistryRowActionsMenu } from "@/components/catalyst-one/shared/registry-row-actions-menu";
import { AssignedUsersCell } from "@/components/catalyst-one/shared/assigned-users-cell";
import { StatusPill } from "@/components/design-system/status-pill";
import { useAuthContext } from "@/components/providers/auth-provider";
import { canManageRegistryAssignments } from "@/lib/assigned-users";
import type { AssignedUserRef } from "@/types/assigned-users";
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
import {
  readMyDealsUiPrefs,
  rememberMyDealsUiPrefs,
} from "@/lib/my-deals/view-state";
import { downloadCsv } from "@/lib/loan-files-utils";
import { CreateTaskActionButton } from "@/components/catalyst-one/tasks/create-task-action-button";
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
  opportunityNumber: "opportunityNumber",
  borrowerName: "borrowerName",
  product: "product",
  loanAmount: "loanAmount",
  assignedUsers: "assignedRm",
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
  onEditDeal: (row: DealRegistryRow) => void;
  onDeleteDeal: (row: DealRegistryRow) => void | Promise<void>;
  onAssignUsers: (row: DealRegistryRow, users: AssignedUserRef[]) => void | Promise<void>;
  initialScope?: DealRegistryFilters["scope"];
  initialSearch?: string;
  /** CO-UX-002 — seed stage filter from Loan Journey (e.g. disbursed → won). */
  initialGrossStage?: string;
  onFiltersChanged?: (filters: DealRegistryFilters) => void;
}

/**
 * CO-SPRINT-098 — Enterprise Deal Registry (My Deals) — Enterprise Table Standard.
 * CO-SPRINT-120 — Compact filter toolbar + dense grid (UX only).
 */
export function DealRegistryTable({
  rows: allRows,
  currentRm,
  onOpenDeal,
  onEditDeal,
  onDeleteDeal,
  onAssignUsers,
  initialScope = "my_team",
  initialSearch = "",
  initialGrossStage = "all",
  onFiltersChanged,
}: DealRegistryTableProps) {
  const { user } = useAuthContext();
  const canAssign = canManageRegistryAssignments(user?.role);
  const [filters, setFilters] = useState<DealRegistryFilters>(() => ({
    ...EMPTY_DEAL_REGISTRY_FILTERS,
    scope: initialScope,
    search: initialSearch,
    grossStage: initialGrossStage || "all",
  }));
  const [sortField, setSortField] = useState<DealRegistrySortField>("dateCreated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof DEAL_REGISTRY_PAGE_SIZES)[number]>(50);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  useEffect(() => {
    const prefs = readMyDealsUiPrefs();
    setFiltersVisible(prefs.filtersVisible);
    setMoreFiltersOpen(prefs.moreFiltersOpen);
  }, []);

  const setFiltersVisiblePref = (visible: boolean) => {
    setFiltersVisible(visible);
    rememberMyDealsUiPrefs({ filtersVisible: visible });
  };

  const setMoreFiltersOpenPref = (open: boolean) => {
    setMoreFiltersOpen(open);
    rememberMyDealsUiPrefs({ moreFiltersOpen: open });
  };

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
        id: "opportunityNumber",
        label: "Opportunity",
        frozen: true,
        sortable: true,
        defaultOrder: 2,
        defaultWidth: 120,
        render: (row) => (
          <span className="font-mono text-[11px] tabular-nums text-teal-800 dark:text-teal-300">
            {row.opportunityNumber}
          </span>
        ),
        exportValue: (row) => row.opportunityNumber,
      },
      {
        id: "borrowerName",
        label: "Borrower Name",
        frozen: true,
        sortable: true,
        defaultOrder: 3,
        defaultWidth: 150,
        render: (row) => <span className="font-medium">{row.borrowerName}</span>,
        exportValue: (row) => row.borrowerName,
      },
      {
        id: "product",
        label: "Product",
        sortable: true,
        defaultOrder: 4,
        defaultWidth: 110,
        render: (row) => row.product,
        exportValue: (row) => row.product,
      },
      {
        id: "loanAmount",
        label: "Loan Amount",
        sortable: true,
        defaultOrder: 5,
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
        id: "assignedUsers",
        label: "Assigned Users",
        sortable: true,
        defaultOrder: 6,
        defaultWidth: 160,
        render: (row) => (
          <AssignedUsersCell
            users={row.assignedUsers ?? []}
            canEdit={canAssign}
            onSave={(next) => onAssignUsers(row, next)}
          />
        ),
        exportValue: (row) =>
          (row.assignedUsers ?? []).map((u) => u.name).join("; ") || row.assignedRm,
      },
      {
        id: "grossStage",
        label: "Gross Stage",
        sortable: true,
        defaultOrder: 7,
        defaultWidth: 120,
        render: (row) => row.grossStageLabel,
        exportValue: (row) => row.grossStageLabel,
      },
      {
        id: "subStage",
        label: "Sub Stage",
        sortable: true,
        defaultOrder: 8,
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
        defaultOrder: 9,
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
        defaultOrder: 10,
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
        defaultOrder: 11,
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
        defaultOrder: 12,
        defaultWidth: 120,
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.lastActivityLabel}</span>
        ),
        exportValue: (row) => row.lastActivityLabel,
      },
      {
        id: "dateCreated",
        label: "Created Date & Time",
        sortable: true,
        defaultOrder: 13,
        defaultWidth: 160,
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
      {
        id: "actions",
        label: "Actions",
        sortable: false,
        defaultOrder: 999,
        defaultWidth: 72,
        align: "right",
        render: (row) => (
          <RegistryRowActionsMenu
            entityKind="Deal"
            recordLabel={row.dealId}
            onOpen={() => onOpenDeal(row)}
            onEdit={() => onEditDeal(row)}
            onDelete={() => onDeleteDeal(row)}
            deleteDisabled={!row.enterpriseDealId && !row.id}
            deleteDisabledReason="Deal identity unavailable for delete."
          />
        ),
        exportValue: () => "",
      },
    ],
    [canAssign, onAssignUsers, onDeleteDeal, onEditDeal, onOpenDeal],
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

  const hasAdvancedFilters =
    filters.subStage !== "all" ||
    filters.lender !== "all" ||
    filters.branch !== "all" ||
    filters.city !== "all" ||
    filters.state !== "all" ||
    filters.priority !== "all" ||
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
    Boolean(filters.columnDealId);

  const sortColumnId =
    Object.entries(SORT_MAP).find(([, f]) => f === sortField)?.[0] ?? "dateCreated";

  const selectClass = "h-7 w-[118px] rounded-sm text-[11px]";
  const controlH = "h-7 rounded-sm text-[11px]";

  const resetFilters = () => {
    const next = { ...EMPTY_DEAL_REGISTRY_FILTERS };
    setFilters(next);
    onFiltersChanged?.(next);
    setPage(1);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5" data-sprint="CO-SPRINT-120">
      <div className="shrink-0 border border-slate-300 bg-white dark:border-zinc-700 dark:bg-card">
        <div className="flex flex-wrap items-center gap-1.5 px-1.5 py-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => setFiltersVisiblePref(!filtersVisible)}
            aria-expanded={filtersVisible}
            aria-controls="my-deals-filter-toolbar"
          >
            {filtersVisible ? (
              <FilterX className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Filter className="h-3.5 w-3.5" aria-hidden />
            )}
            {filtersVisible ? "Hide Filters" : "Show Filters"}
          </Button>
          {hasFilters ? (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Filtered
            </span>
          ) : null}
          {!filtersVisible ? (
            <p className="text-[11px] text-muted-foreground">
              Filters hidden — more rows visible in the deal grid.
            </p>
          ) : null}
        </div>

        {filtersVisible ? (
          <div
            id="my-deals-filter-toolbar"
            className="space-y-1 border-t border-border/70 px-1.5 pb-1.5 pt-1"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <Select
                value={filters.scope}
                onValueChange={(v) =>
                  patchFilters({ scope: v as DealRegistryFilters["scope"] })
                }
              >
                <SelectTrigger className={cn(selectClass, "w-[110px]")} aria-label="Scope">
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
                placeholder="Search…"
                className={cn(controlH, "w-[min(100%,12rem)] min-w-[9rem] flex-1 sm:flex-none")}
                aria-label="Search deals"
              />
              <Select
                value={filters.grossStage}
                onValueChange={(v) => patchFilters({ grossStage: v, subStage: "all" })}
              >
                <SelectTrigger className={selectClass} aria-label="Stage">
                  <SelectValue placeholder="Stage" />
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
              <Select value={filters.product} onValueChange={(v) => patchFilters({ product: v })}>
                <SelectTrigger className={selectClass} aria-label="Product">
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
                value={filters.assignedRm}
                onValueChange={(v) => patchFilters({ assignedRm: v })}
              >
                <SelectTrigger className={cn(selectClass, "w-[130px]")} aria-label="Assigned Users">
                  <SelectValue placeholder="Assigned Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  {rms.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(v) => patchFilters({ status: v })}>
                <SelectTrigger className={selectClass} aria-label="Status">
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
              <Button
                type="button"
                variant={moreFiltersOpen || hasAdvancedFilters ? "secondary" : "outline"}
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() => setMoreFiltersOpenPref(!moreFiltersOpen)}
                aria-expanded={moreFiltersOpen}
                aria-controls="my-deals-more-filters"
              >
                More Filters
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    moreFiltersOpen && "rotate-180",
                  )}
                  aria-hidden
                />
                {hasAdvancedFilters ? (
                  <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                ) : null}
              </Button>
              {hasFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={resetFilters}
                >
                  <X className="mr-1 h-3 w-3" />
                  Reset
                </Button>
              ) : null}
            </div>

            {moreFiltersOpen ? (
              <div
                id="my-deals-more-filters"
                className="space-y-1.5 rounded-sm border border-dashed border-border/80 bg-muted/20 p-1.5"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Input
                    value={filters.columnDealId}
                    onChange={(e) => patchFilters({ columnDealId: e.target.value })}
                    placeholder="Deal ID"
                    className={cn(controlH, "w-[110px]")}
                  />
                  <Input
                    value={filters.columnBorrower}
                    onChange={(e) => patchFilters({ columnBorrower: e.target.value })}
                    placeholder="Borrower"
                    className={cn(controlH, "w-[120px]")}
                  />
                  <Select
                    value={filters.subStage}
                    onValueChange={(v) => patchFilters({ subStage: v })}
                  >
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
                    <SelectTrigger className={cn(selectClass, "w-[110px]")}>
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
                    <SelectTrigger className={cn(selectClass, "w-[110px]")}>
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
                    value={filters.priority}
                    onValueChange={(v) => patchFilters({ priority: v })}
                  >
                    <SelectTrigger className={cn(selectClass, "w-[100px]")}>
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
                    className={cn(controlH, "w-[68px]")}
                    inputMode="numeric"
                  />
                  <span className="text-[11px] text-muted-foreground">–</span>
                  <Input
                    value={filters.amountMax}
                    onChange={(e) => patchFilters({ amountMax: e.target.value })}
                    placeholder="Max"
                    className={cn(controlH, "w-[68px]")}
                    inputMode="numeric"
                  />
                  <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Revenue
                  </span>
                  <Input
                    value={filters.revenueMin}
                    onChange={(e) => patchFilters({ revenueMin: e.target.value })}
                    placeholder="Min"
                    className={cn(controlH, "w-[68px]")}
                    inputMode="numeric"
                  />
                  <span className="text-[11px] text-muted-foreground">–</span>
                  <Input
                    value={filters.revenueMax}
                    onChange={(e) => patchFilters({ revenueMax: e.target.value })}
                    placeholder="Max"
                    className={cn(controlH, "w-[68px]")}
                    inputMode="numeric"
                  />
                  <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Created
                  </span>
                  <Input
                    type="date"
                    value={filters.dateCreatedFrom}
                    onChange={(e) => patchFilters({ dateCreatedFrom: e.target.value })}
                    className={cn(controlH, "w-[118px]")}
                    aria-label="Created from"
                  />
                  <span className="text-[11px] text-muted-foreground">–</span>
                  <Input
                    type="date"
                    value={filters.dateCreatedTo}
                    onChange={(e) => patchFilters({ dateCreatedTo: e.target.value })}
                    className={cn(controlH, "w-[118px]")}
                    aria-label="Created to"
                  />
                  <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Updated
                  </span>
                  <Input
                    type="date"
                    value={filters.lastUpdatedFrom}
                    onChange={(e) => patchFilters({ lastUpdatedFrom: e.target.value })}
                    className={cn(controlH, "w-[118px]")}
                    aria-label="Updated from"
                  />
                  <span className="text-[11px] text-muted-foreground">–</span>
                  <Input
                    type="date"
                    value={filters.lastUpdatedTo}
                    onChange={(e) => patchFilters({ lastUpdatedTo: e.target.value })}
                    className={cn(controlH, "w-[118px]")}
                    aria-label="Updated to"
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <EnterpriseDataGrid
        className="min-h-0 flex-1"
        storageKey="catalyst.my-deals.registry.v3"
        userId={user?.id}
        density="dense"
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        emptyMessage="No deals match the current filters."
        toolbarLabel={`Deal Registry · ${filteredSorted.length} deals`}
        sortColumnId={sortColumnId}
        sortDirection={sortDir}
        onSort={handleSort}
        onRowClick={onOpenDeal}
        maxHeightClassName="h-full max-h-none min-h-0 flex-1"
        toolbarActions={
          <div className="flex flex-wrap items-center gap-1.5">
            <CreateTaskActionButton
              allowEntityPicker
              className="h-6 gap-1.5 rounded-md px-2 text-[10px]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 gap-1.5 rounded-md px-2 text-[10px]"
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
          </div>
        }
      />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border border-slate-300 bg-slate-50/80 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {filteredSorted.length === 0
            ? "0 deals"
            : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredSorted.length)} of ${filteredSorted.length}`}
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
