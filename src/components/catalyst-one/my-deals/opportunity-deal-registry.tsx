"use client";

/**
 * CO-UX-003 — Enterprise Deal Registry shell: compact filters + Opportunity groups + status bar.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Filter, FilterX, X } from "lucide-react";
import { OpportunityGroupedRegistry } from "@/components/catalyst-one/my-deals/opportunity-grouped-registry";
import { CreateTaskActionButton } from "@/components/catalyst-one/tasks/create-task-action-button";
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
import { formatINRCompact } from "@/lib/format-currency";
import { downloadCsv } from "@/lib/loan-files-utils";
import {
  exportDealRegistryCsv,
  filterDealRegistryRows,
  uniqueDealValues,
} from "@/lib/my-deals/deal-registry";
import {
  formatLoanValueTotal,
  groupDealRowsByOpportunity,
  sortOpportunityGroups,
  type OpportunityRegistryGroup,
} from "@/lib/my-deals/group-opportunities";
import {
  readMyDealsRegistryUx,
  readMyDealsUiPrefs,
  rememberMyDealsRegistryUx,
  rememberMyDealsUiPrefs,
} from "@/lib/my-deals/view-state";
import { cn } from "@/lib/utils";
import {
  EMPTY_DEAL_REGISTRY_FILTERS,
  type DealRegistryFilters,
  type DealRegistryRow,
  type DealRegistrySortField,
} from "@/types/deal-registry";

const SORT_OPTIONS: { id: DealRegistrySortField; label: string }[] = [
  { id: "opportunityHealth", label: "Opportunity Health" },
  { id: "lastActivity", label: "Last activity" },
  { id: "expectedRevenue", label: "Expected Revenue" },
  { id: "activeDealCount", label: "Active Deals" },
  { id: "borrowerName", label: "Customer" },
  { id: "opportunityNumber", label: "Opportunity #" },
  { id: "loanAmount", label: "Loan amount" },
  { id: "grossStageLabel", label: "Progress" },
  { id: "dateCreated", label: "Created" },
  { id: "assignedRm", label: "Assigned RM" },
  { id: "product", label: "Product" },
];

interface OpportunityDealRegistryProps {
  rows: DealRegistryRow[];
  currentRm: string;
  onOpenOpportunity: (group: OpportunityRegistryGroup) => void;
  initialScope?: DealRegistryFilters["scope"];
  initialSearch?: string;
  initialGrossStage?: string;
  onFiltersChanged?: (filters: DealRegistryFilters) => void;
}

export function OpportunityDealRegistry({
  rows: allRows,
  currentRm,
  onOpenOpportunity,
  initialScope = "my_team",
  initialSearch = "",
  initialGrossStage = "all",
  onFiltersChanged,
}: OpportunityDealRegistryProps) {
  const [filters, setFilters] = useState<DealRegistryFilters>(() => ({
    ...EMPTY_DEAL_REGISTRY_FILTERS,
    scope: initialScope,
    search: initialSearch,
    grossStage: initialGrossStage || "all",
  }));
  const [sortField, setSortField] = useState<DealRegistrySortField>("lastActivity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [uxReady, setUxReady] = useState(false);

  useEffect(() => {
    const prefs = readMyDealsUiPrefs();
    setFiltersVisible(prefs.filtersVisible);
    setMoreFiltersOpen(prefs.moreFiltersOpen);
    const ux = readMyDealsRegistryUx();
    setExpandedKeys(new Set(ux.expandedKeys));
    setSelectedKeys(new Set(ux.selectedKeys));
    setFocusedKey(ux.selectedOpportunityKey);
    setScrollTop(ux.scrollTop);
    if (ux.sortField) setSortField(ux.sortField as DealRegistrySortField);
    if (ux.sortDir) setSortDir(ux.sortDir);
    setUxReady(true);
  }, []);

  useEffect(() => {
    if (!uxReady) return;
    rememberMyDealsRegistryUx({
      expandedKeys: [...expandedKeys],
      selectedKeys: [...selectedKeys],
      selectedOpportunityKey: focusedKey,
      scrollTop,
      sortField,
      sortDir,
    });
  }, [uxReady, expandedKeys, selectedKeys, focusedKey, scrollTop, sortField, sortDir]);

  const products = useMemo(() => uniqueDealValues(allRows, "product"), [allRows]);
  const rms = useMemo(() => uniqueDealValues(allRows, "assignedRm"), [allRows]);
  const lenders = useMemo(() => uniqueDealValues(allRows, "selectedLender"), [allRows]);
  const cities = useMemo(() => uniqueDealValues(allRows, "city"), [allRows]);
  const statuses = useMemo(() => uniqueDealValues(allRows, "status"), [allRows]);

  const filteredRows = useMemo(
    () => filterDealRegistryRows(allRows, filters, currentRm),
    [allRows, filters, currentRm],
  );

  const groups = useMemo(() => {
    const grouped = groupDealRowsByOpportunity(filteredRows);
    return sortOpportunityGroups(grouped, sortField, sortDir);
  }, [filteredRows, sortField, sortDir]);

  const totalLoanValue = useMemo(() => formatLoanValueTotal(filteredRows), [filteredRows]);
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const patchFilters = (patch: Partial<DealRegistryFilters>) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      onFiltersChanged?.(next);
      return next;
    });
  };

  const resetFilters = () => {
    const next = { ...EMPTY_DEAL_REGISTRY_FILTERS };
    setFilters(next);
    onFiltersChanged?.(next);
  };

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleOpen = useCallback(
    (group: OpportunityRegistryGroup) => {
      setFocusedKey(group.key);
      rememberMyDealsRegistryUx({ selectedOpportunityKey: group.key });
      onOpenOpportunity(group);
    },
    [onOpenOpportunity],
  );

  const selectClass = "h-7 w-[118px] rounded-sm text-[11px]";
  const controlH = "h-7 rounded-sm text-[11px]";
  const hasFilters = activeFilterCount > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5" data-sprint="CO-UX-003">
      {/* Compact header / filters */}
      <div className="shrink-0 rounded-md border border-zinc-800 bg-zinc-950/80">
        <div className="flex flex-wrap items-center gap-1.5 px-2 py-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => {
              const next = !filtersVisible;
              setFiltersVisible(next);
              rememberMyDealsUiPrefs({ filtersVisible: next });
            }}
            aria-expanded={filtersVisible}
          >
            {filtersVisible ? (
              <FilterX className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Filter className="h-3.5 w-3.5" aria-hidden />
            )}
            {filtersVisible ? "Hide Filters" : "Show Filters"}
          </Button>
          {hasFilters ? (
            <span className="rounded bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-medium text-teal-300">
              {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
            </span>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Select
              value={sortField}
              onValueChange={(v) => setSortField(v as DealRegistrySortField)}
            >
              <SelectTrigger className={cn(selectClass, "w-[140px]")} aria-label="Sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            >
              {sortDir === "asc" ? "Asc" : "Desc"}
            </Button>
            <CreateTaskActionButton
              allowEntityPicker
              className="h-7 gap-1.5 rounded-sm px-2 text-[10px]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-sm px-2 text-[10px]"
              onClick={() => {
                downloadCsv(
                  exportDealRegistryCsv(filteredRows),
                  `deal-registry-${new Date().toISOString().slice(0, 10)}.csv`,
                );
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>

        {filtersVisible ? (
          <div className="space-y-1 border-t border-zinc-800/80 px-2 pb-1.5 pt-1">
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
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={filters.search}
                onChange={(e) => patchFilters({ search: e.target.value })}
                placeholder="Search opportunities, customers, lenders…"
                className={cn(controlH, "w-[min(100%,18rem)] min-w-[12rem] flex-1")}
                aria-label="Search"
              />
              <Select
                value={filters.grossStage}
                onValueChange={(v) => patchFilters({ grossStage: v })}
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
                <SelectTrigger className={cn(selectClass, "w-[130px]")} aria-label="RM">
                  <SelectValue placeholder="Assigned" />
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
                variant={moreFiltersOpen ? "secondary" : "outline"}
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() => {
                  const next = !moreFiltersOpen;
                  setMoreFiltersOpen(next);
                  rememberMyDealsUiPrefs({ moreFiltersOpen: next });
                }}
              >
                More
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", moreFiltersOpen && "rotate-180")}
                />
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
              <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-dashed border-zinc-700/80 bg-zinc-900/40 p-1.5">
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
                <Input
                  value={filters.amountMin}
                  onChange={(e) => patchFilters({ amountMin: e.target.value })}
                  placeholder="Amt min"
                  className={cn(controlH, "w-[80px]")}
                  inputMode="numeric"
                />
                <Input
                  value={filters.amountMax}
                  onChange={(e) => patchFilters({ amountMax: e.target.value })}
                  placeholder="Amt max"
                  className={cn(controlH, "w-[80px]")}
                  inputMode="numeric"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Main Opportunity registry */}
      <OpportunityGroupedRegistry
        groups={groups}
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        focusedKey={focusedKey}
        scrollTop={scrollTop}
        onScrollTopChange={setScrollTop}
        onToggleExpand={toggleExpand}
        onToggleSelect={toggleSelect}
        onFocusGroup={setFocusedKey}
        onOpenOpportunity={handleOpen}
      />

      {/* Status bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-zinc-800 bg-zinc-950/90 px-2.5 py-1.5 text-[11px] tabular-nums text-zinc-400">
        <span>
          <span className="text-zinc-500">Opportunities</span>{" "}
          <span className="font-medium text-zinc-200">{groups.length}</span>
        </span>
        <span>
          <span className="text-zinc-500">Deals</span>{" "}
          <span className="font-medium text-zinc-200">{filteredRows.length}</span>
        </span>
        <span>
          <span className="text-zinc-500">Loan value</span>{" "}
          <span className="font-medium text-zinc-200">{formatINRCompact(totalLoanValue)}</span>
        </span>
        <span>
          <span className="text-zinc-500">Filters</span>{" "}
          <span className="font-medium text-zinc-200">{activeFilterCount || "None"}</span>
        </span>
        <span className="ml-auto">
          <span className="text-zinc-500">Selected</span>{" "}
          <span className="font-medium text-zinc-200">{selectedKeys.size}</span>
        </span>
      </div>
    </div>
  );
}

function countActiveFilters(filters: DealRegistryFilters): number {
  let n = 0;
  if (filters.search.trim()) n += 1;
  if (filters.product !== "all") n += 1;
  if (filters.grossStage !== "all") n += 1;
  if (filters.subStage !== "all") n += 1;
  if (filters.assignedRm !== "all") n += 1;
  if (filters.lender !== "all") n += 1;
  if (filters.branch !== "all") n += 1;
  if (filters.city !== "all") n += 1;
  if (filters.state !== "all") n += 1;
  if (filters.priority !== "all") n += 1;
  if (filters.status !== "all") n += 1;
  if (filters.source !== "all") n += 1;
  if (filters.amountMin) n += 1;
  if (filters.amountMax) n += 1;
  if (filters.revenueMin) n += 1;
  if (filters.revenueMax) n += 1;
  if (filters.dateCreatedFrom) n += 1;
  if (filters.dateCreatedTo) n += 1;
  if (filters.lastUpdatedFrom) n += 1;
  if (filters.lastUpdatedTo) n += 1;
  if (filters.columnBorrower) n += 1;
  if (filters.columnDealId) n += 1;
  if (filters.scope !== "my_team") n += 1;
  return n;
}
