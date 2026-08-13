"use client";

/**
 * CO-C1-DEALS-JOURNEY-001 — My Deals Lender Journey board.
 * Replaces the Opportunity-grouped table presentation with journey cards.
 * Reuses Deal Registry rows + filterDealRegistryRows (no new data engine).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, FilterX } from "lucide-react";
import { OpportunityLenderJourneyCard } from "@/components/catalyst-one/my-deals/opportunity-lender-journey-card";
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
import { formatINRCompact } from "@/lib/format-currency";
import {
  filterDealRegistryRows,
  uniqueDealValues,
} from "@/lib/my-deals/deal-registry";
import {
  formatLoanValueTotal,
  groupDealRowsByOpportunity,
  sortOpportunityGroups,
  type OpportunityRegistryGroup,
} from "@/lib/my-deals/group-opportunities";
import { deriveJourneyProgressSegments } from "@/constants/enterprise-deal-journey-progress";
import { cn } from "@/lib/utils";
import {
  EMPTY_DEAL_REGISTRY_FILTERS,
  type DealRegistryFilters,
  type DealRegistryRow,
} from "@/types/deal-registry";

interface DealLenderJourneyBoardProps {
  rows: DealRegistryRow[];
  currentRm: string;
  onOpenOpportunity: (group: OpportunityRegistryGroup) => void;
  onOpenDeal: (row: DealRegistryRow, group: OpportunityRegistryGroup) => void;
  initialScope?: DealRegistryFilters["scope"];
  initialSearch?: string;
  initialGrossStage?: string;
  onFiltersChanged?: (filters: DealRegistryFilters) => void;
}

function countByJourney(rows: DealRegistryRow[]) {
  let inApproval = 0;
  let disbursed = 0;
  let lostHold = 0;
  let actionRequired = 0;
  for (const row of rows) {
    const prog = deriveJourneyProgressSegments({
      pipelineStage: row.grossStage,
      lenderCaseStage: row.lenderCaseStage,
      status: String(row.status),
    });
    if (prog.overlay === "lost" || prog.overlay === "hold") {
      lostHold += 1;
      actionRequired += 1;
      continue;
    }
    if (prog.segmentId === "disbursed") {
      disbursed += 1;
      continue;
    }
    if (
      prog.segmentId === "soft_approved" ||
      prog.segmentId === "final_approved" ||
      prog.segmentId === "closure_wip"
    ) {
      inApproval += 1;
    }
    if (row.riskIndicator === "High" || row.documentsPending > 0) {
      actionRequired += 1;
    }
  }
  return { inApproval, disbursed, lostHold, actionRequired };
}

export function DealLenderJourneyBoard({
  rows: allRows,
  currentRm,
  onOpenOpportunity,
  onOpenDeal,
  initialScope = "my_team",
  initialSearch = "",
  initialGrossStage = "all",
  onFiltersChanged,
}: DealLenderJourneyBoardProps) {
  const [filters, setFilters] = useState<DealRegistryFilters>(() => ({
    ...EMPTY_DEAL_REGISTRY_FILTERS,
    scope: initialScope,
    search: initialSearch,
    grossStage: initialGrossStage || "all",
  }));
  const [filtersVisible, setFiltersVisible] = useState(true);

  useEffect(() => {
    onFiltersChanged?.(filters);
  }, [filters, onFiltersChanged]);

  const patchFilters = useCallback((patch: Partial<DealRegistryFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const filteredRows = useMemo(
    () => filterDealRegistryRows(allRows, filters, currentRm),
    [allRows, filters, currentRm],
  );

  const groups = useMemo(
    () =>
      sortOpportunityGroups(
        groupDealRowsByOpportunity(filteredRows),
        "lastActivity",
        "desc",
      ),
    [filteredRows],
  );

  const products = useMemo(() => uniqueDealValues(allRows, "product"), [allRows]);
  const lenders = useMemo(() => uniqueDealValues(allRows, "selectedLender"), [allRows]);
  const sources = useMemo(() => uniqueDealValues(allRows, "source"), [allRows]);

  const kpis = useMemo(() => {
    const journey = countByJourney(filteredRows);
    const loanValue = formatLoanValueTotal(filteredRows);
    return {
      opportunities: groups.length,
      activeDeals: filteredRows.length,
      loanValueLabel: formatINRCompact(loanValue),
      ...journey,
    };
  }, [filteredRows, groups]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-surface="deal-lender-journey">
      <div className="shrink-0 space-y-2 border-b border-zinc-800 px-2 pb-2 pt-1.5">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Opportunities", value: String(kpis.opportunities) },
            { label: "Active Deals", value: String(kpis.activeDeals) },
            { label: "Loan Value", value: kpis.loanValueLabel },
            { label: "In Approval", value: String(kpis.inApproval) },
            { label: "Disbursed", value: String(kpis.disbursed) },
            { label: "Lost / Hold", value: String(kpis.lostHold) },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-2.5 py-1.5"
            >
              <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                {kpi.label}
              </p>
              <p className="truncate text-sm font-semibold tabular-nums text-zinc-100">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px] text-zinc-400"
            onClick={() => setFiltersVisible((v) => !v)}
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
              onClick={() =>
                setFilters({
                  ...EMPTY_DEAL_REGISTRY_FILTERS,
                  scope: initialScope,
                })
              }
            >
              Clear
            </Button>
          ) : null}
          <span className="ml-auto text-[10px] tabular-nums text-zinc-500">
            {groups.length} opportunities · {filteredRows.length} deals
          </span>
        </div>

        {filtersVisible ? (
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
              placeholder="Search customer, opportunity, lender…"
              className={cn(controlH, "w-[min(100%,20rem)] min-w-[12rem] flex-1")}
              aria-label="Search"
            />
            <Select
              value={filters.product}
              onValueChange={(v) => patchFilters({ product: v })}
            >
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
              value={filters.lender}
              onValueChange={(v) => patchFilters({ lender: v })}
            >
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
            <Select
              value={filters.grossStage}
              onValueChange={(v) => patchFilters({ grossStage: v })}
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
            <Select
              value={filters.source}
              onValueChange={(v) => patchFilters({ source: v })}
            >
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

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-16 text-center">
            <p className="text-sm font-medium text-zinc-200">No opportunities to show</p>
            <p className="mt-1 max-w-md text-[12px] text-zinc-500">
              Adjust filters or create lender Deals under Opportunities. My Deals is the
              Enterprise Deal Registry journey view.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
            {groups.map((group) => (
              <OpportunityLenderJourneyCard
                key={group.key}
                group={group}
                onOpenOpportunity={onOpenOpportunity}
                onOpenDeal={onOpenDeal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
