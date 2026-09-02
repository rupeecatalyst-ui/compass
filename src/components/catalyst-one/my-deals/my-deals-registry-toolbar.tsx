"use client";

import { Filter, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LENDER_CASE_STAGES } from "@/constants/lender-pipeline";
import { PIPELINE_STAGES } from "@/constants/loan-stage-master";
import type { DealActivityFilter } from "@/lib/my-deals/classify-deal-activity";
import { rememberMyDealsUiPrefs } from "@/lib/my-deals/view-state";
import { uniqueDealValues } from "@/lib/my-deals/deal-registry";
import type { DealRegistryFilters, DealRegistryRow } from "@/types/deal-registry";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export function MyDealsRegistryToolbar({
  allRows,
  filteredCount,
  opportunityCount,
  filters,
  onPatchFilters,
  onResetFilters,
  filtersVisible,
  onToggleFiltersVisible,
  showStageSelect,
}: {
  allRows: DealRegistryRow[];
  filteredCount: number;
  opportunityCount: number;
  filters: DealRegistryFilters;
  onPatchFilters: (patch: Partial<DealRegistryFilters>) => void;
  onResetFilters: () => void;
  filtersVisible: boolean;
  onToggleFiltersVisible: (next: boolean) => void;
  showStageSelect: boolean;
}) {
  const products = useMemo(() => uniqueDealValues(allRows, "product"), [allRows]);
  const lenders = useMemo(() => uniqueDealValues(allRows, "selectedLender"), [allRows]);
  const sources = useMemo(() => uniqueDealValues(allRows, "source"), [allRows]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.activity !== "active") n += 1;
    if (filters.search.trim()) n += 1;
    if (filters.product !== "all") n += 1;
    if (filters.grossStage !== "all") n += 1;
    if (filters.lender !== "all") n += 1;
    if (filters.source !== "all") n += 1;
    if (filters.scope !== "my_team") n += 1;
    return n;
  }, [filters]);

  const selectClass =
    "h-7 w-[128px] border-zinc-700 bg-zinc-900/80 text-[11px] text-zinc-200";
  const controlH = "h-7 border-zinc-700 bg-zinc-900/80 text-[11px] text-zinc-200";

  return (
    <div className="shrink-0 space-y-1.5 px-2 pb-2 pt-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px] text-zinc-400"
          onClick={() => {
            const next = !filtersVisible;
            onToggleFiltersVisible(next);
            rememberMyDealsUiPrefs({ filtersVisible: next });
          }}
        >
          {filtersVisible ? <FilterX className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
          Filters
          {activeFilterCount > 0 ? (
            <span className="rounded bg-teal-900/60 px-1 text-[10px] text-teal-300">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
        {activeFilterCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-zinc-400"
            onClick={() => {
              rememberMyDealsUiPrefs({ activityFilter: "active" });
              onResetFilters();
            }}
          >
            Clear
          </Button>
        ) : null}
        <span className="ml-auto text-[10px] tabular-nums text-zinc-500">
          {opportunityCount} opportunities · {filteredCount} deals
        </span>
      </div>

      {filtersVisible ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            value={filters.activity}
            onValueChange={(v) => onPatchFilters({ activity: v as DealActivityFilter })}
          >
            <SelectTrigger className={cn(selectClass, "w-[108px]")} aria-label="Activity">
              <SelectValue placeholder="Activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="all">All Deals</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.scope}
            onValueChange={(v) =>
              onPatchFilters({ scope: v as DealRegistryFilters["scope"] })
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
            onChange={(e) => onPatchFilters({ search: e.target.value })}
            placeholder="Search customer, opportunity, lender…"
            className={cn(controlH, "w-[min(100%,20rem)] min-w-[12rem] flex-1")}
            aria-label="Search"
          />
          <Select value={filters.product} onValueChange={(v) => onPatchFilters({ product: v })}>
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
          <Select value={filters.lender} onValueChange={(v) => onPatchFilters({ lender: v })}>
            <SelectTrigger className={selectClass} aria-label="Lender">
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
          {showStageSelect ? (
            <Select
              value={filters.grossStage}
              onValueChange={(v) => onPatchFilters({ grossStage: v })}
            >
              <SelectTrigger className={selectClass} aria-label="Deal Stage">
                <SelectValue placeholder="Deal Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deal Stages</SelectItem>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
                {LENDER_CASE_STAGES.filter(
                  (s) => !PIPELINE_STAGES.some((p) => p.id === s.id),
                ).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Select value={filters.source} onValueChange={(v) => onPatchFilters({ source: v })}>
            <SelectTrigger className={selectClass} aria-label="Source">
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
      ) : null}
    </div>
  );
}
