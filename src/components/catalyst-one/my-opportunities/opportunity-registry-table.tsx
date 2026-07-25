"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, FilterX, RefreshCw, Search } from "lucide-react";
import {
  EnterpriseDataGrid,
  type EnterpriseGridColumnDef,
} from "@/components/catalyst-one/enterprise-grid";
import { RegistryRowActionsMenu } from "@/components/catalyst-one/shared/registry-row-actions-menu";
import { AssignedUsersCell } from "@/components/catalyst-one/shared/assigned-users-cell";
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
import {
  filterOpportunityRegistryRows,
  sortOpportunityRegistryRows,
  uniqueOpportunityValues,
} from "@/lib/my-opportunities/opportunity-registry";
import { displayOpportunityRequirementStageLabel } from "@/lib/lead-opportunity-journey/opportunity-field-display";
import {
  EMPTY_OPPORTUNITY_REGISTRY_FILTERS,
  OPPORTUNITY_REGISTRY_PAGE_SIZES,
  type OpportunityRegistryFilters,
  type OpportunityRegistryRow,
  type OpportunityRegistrySortDir,
  type OpportunityRegistrySortField,
} from "@/types/opportunity-registry";
import { cn } from "@/lib/utils";

const SORT_MAP: Record<string, OpportunityRegistrySortField> = {
  opportunityNumber: "opportunityNumber",
  customerName: "customerName",
  product: "product",
  opportunityStage: "opportunityStageLabel",
  assignedUsers: "owner",
  owner: "owner",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  status: "status",
};

interface OpportunityRegistryTableProps {
  rows: OpportunityRegistryRow[];
  loading?: boolean;
  onOpenOpportunity: (row: OpportunityRegistryRow) => void;
  onEditOpportunity: (row: OpportunityRegistryRow) => void;
  onDeleteOpportunity: (row: OpportunityRegistryRow) => void | Promise<void>;
  onAssignUsers: (row: OpportunityRegistryRow, users: AssignedUserRef[]) => void | Promise<void>;
  onRefresh: () => void;
}

/**
 * CO-ARCH-003 — Enterprise Opportunity Registry table (My Opportunities).
 * BAT #15 — row Actions (Open / Edit / Delete).
 */
export function OpportunityRegistryTable({
  rows: allRows,
  loading = false,
  onOpenOpportunity,
  onEditOpportunity,
  onDeleteOpportunity,
  onAssignUsers,
  onRefresh,
}: OpportunityRegistryTableProps) {
  const { user } = useAuthContext();
  const canAssign = canManageRegistryAssignments(user?.role);
  const [filters, setFilters] = useState<OpportunityRegistryFilters>(
    EMPTY_OPPORTUNITY_REGISTRY_FILTERS,
  );
  const [sortField, setSortField] =
    useState<OpportunityRegistrySortField>("createdAt");
  const [sortDir, setSortDir] = useState<OpportunityRegistrySortDir>("desc");
  const [sortColumnId, setSortColumnId] = useState<string>("createdAt");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof OPPORTUNITY_REGISTRY_PAGE_SIZES)[number]>(50);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const stages = useMemo(
    () => uniqueOpportunityValues(allRows, "opportunityStage"),
    [allRows],
  );
  const statuses = useMemo(() => uniqueOpportunityValues(allRows, "status"), [allRows]);

  const filtered = useMemo(
    () => filterOpportunityRegistryRows(allRows, filters),
    [allRows, filters],
  );
  const sorted = useMemo(
    () => sortOpportunityRegistryRows(filtered, sortField, sortDir),
    [filtered, sortField, sortDir],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageSafe, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.stage, filters.status, pageSize]);

  const handleSort = (columnId: string) => {
    const field = SORT_MAP[columnId];
    if (!field) return;
    setSortColumnId(columnId);
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(field === "createdAt" || field === "updatedAt" ? "desc" : "asc");
      return field;
    });
    setPage(1);
  };

  const columns = useMemo<EnterpriseGridColumnDef<OpportunityRegistryRow>[]>(
    () => [
      {
        id: "opportunityNumber",
        label: "Opportunity Ref",
        frozen: true,
        sortable: true,
        defaultOrder: 1,
        defaultWidth: 130,
        render: (row) => (
          <span className="font-mono text-[11px] tabular-nums font-medium text-teal-800 dark:text-teal-300">
            {row.opportunityNumber}
          </span>
        ),
        exportValue: (row) => row.opportunityNumber,
      },
      {
        id: "customerName",
        label: "Customer Name",
        frozen: true,
        sortable: true,
        defaultOrder: 2,
        defaultWidth: 160,
        render: (row) => <span className="font-medium">{row.customerName}</span>,
        exportValue: (row) => row.customerName,
      },
      {
        id: "product",
        label: "Product",
        sortable: true,
        defaultOrder: 3,
        defaultWidth: 130,
        render: (row) => row.product,
        exportValue: (row) => row.product,
      },
      {
        id: "opportunityStage",
        label: "Opportunity Stage",
        sortable: true,
        defaultOrder: 4,
        defaultWidth: 140,
        render: (row) => (
          <span className="capitalize text-muted-foreground">{row.opportunityStageLabel}</span>
        ),
        exportValue: (row) => row.opportunityStageLabel,
      },
      {
        id: "assignedUsers",
        label: "Assigned Users",
        sortable: true,
        defaultOrder: 5,
        defaultWidth: 160,
        render: (row) => (
          <AssignedUsersCell
            users={row.assignedUsers ?? []}
            canEdit={canAssign}
            onSave={(next) => onAssignUsers(row, next)}
          />
        ),
        exportValue: (row) =>
          (row.assignedUsers ?? []).map((u) => u.name).join("; ") || row.owner,
      },
      {
        id: "createdAt",
        label: "Created Date & Time",
        sortable: true,
        defaultOrder: 6,
        defaultWidth: 160,
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.createdAtLabel}</span>
        ),
        exportValue: (row) => row.createdAtLabel,
      },
      {
        id: "updatedAt",
        label: "Last Updated",
        sortable: true,
        defaultOrder: 7,
        defaultWidth: 140,
        render: (row) => (
          <span className="tabular-nums text-muted-foreground">{row.updatedAtLabel}</span>
        ),
        exportValue: (row) => row.updatedAtLabel,
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        defaultOrder: 8,
        defaultWidth: 100,
        render: (row) => (
          <span
            className={cn(
              "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
              row.status === "active"
                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            {row.statusLabel}
          </span>
        ),
        exportValue: (row) => row.statusLabel,
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
            entityKind="Opportunity"
            recordLabel={row.opportunityNumber}
            onOpen={() => onOpenOpportunity(row)}
            onEdit={() => onEditOpportunity(row)}
            onDelete={() => onDeleteOpportunity(row)}
          />
        ),
        exportValue: () => "",
      },
    ],
    [canAssign, onAssignUsers, onDeleteOpportunity, onEditOpportunity, onOpenOpportunity],
  );

  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    filters.stage !== "all" ||
    filters.status !== "all";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <div className="relative min-w-[180px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search opportunity, customer, product…"
            className="h-8 pl-7 text-xs"
            aria-label="Enterprise search opportunities"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
        </Button>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setFilters(EMPTY_OPPORTUNITY_REGISTRY_FILTERS)}
          >
            <FilterX className="h-3.5 w-3.5" />
            Clear
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
        <p className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {filtered.length} of {allRows.length}
        </p>
      </div>

      {filtersOpen ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
          <Select
            value={filters.stage}
            onValueChange={(stage) => setFilters((f) => ({ ...f, stage }))}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {stages.map((s) => (
                <SelectItem key={s} value={s}>
                  {displayOpportunityRequirementStageLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(status) => setFilters((f) => ({ ...f, status }))}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <EnterpriseDataGrid
        className="min-h-0 flex-1"
        storageKey="catalyst.my-opportunities.registry.v3"
        userId={user?.id}
        density="dense"
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        emptyMessage={
          loading
            ? "Loading opportunities…"
            : "No opportunities found. Create one from Contacts → Start Journey."
        }
        toolbarLabel={`Opportunity Registry · ${filtered.length} opportunities`}
        sortColumnId={sortColumnId}
        sortDirection={sortDir}
        onSort={handleSort}
        onRowClick={onOpenOpportunity}
        maxHeightClassName="h-full max-h-none min-h-0 flex-1"
      />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) =>
              setPageSize(Number(v) as (typeof OPPORTUNITY_REGISTRY_PAGE_SIZES)[number])
            }
          >
            <SelectTrigger className="h-7 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPPORTUNITY_REGISTRY_PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
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
            className="h-7 text-xs"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <span className="tabular-nums">
            {pageSafe} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
