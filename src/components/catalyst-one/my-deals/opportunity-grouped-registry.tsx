"use client";

/**
 * CO-UX-020 — Opportunity-grouped Enterprise Deal Registry (virtualised).
 * Registry = compact scan. Collapsed by default. Operational intelligence on expand only.
 * Not a dashboard. No nested scroll inside row cards.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import { ChevronRight } from "lucide-react";
import { LoanJourneyProgressCapsule } from "@/components/catalyst-one/my-deals/loan-journey-progress-capsule";
import {
  deriveJourneyProgressSegments,
  getJourneySegmentColor,
} from "@/constants/enterprise-deal-journey-progress";
import type { OpportunityRegistryGroup } from "@/lib/my-deals/group-opportunities";
import type { OpportunityHealthBand } from "@/lib/my-deals/derive-opportunity-executive-summary";
import { cn } from "@/lib/utils";
import type { DealRegistryRow } from "@/types/deal-registry";

/** Compact registry row — scan hundreds of Opportunities. */
const COLLAPSED_H = 52;
const LENDER_ROW_H = 28;
/** Expanded: compact header + intelligence strip + lender lines (no inner scroll). */
const EXPANDED_INTEL_H = 72;
const OVERSCAN = 8;

function estimateGroupHeight(group: OpportunityRegistryGroup, expanded: boolean): number {
  if (!expanded) return COLLAPSED_H;
  return (
    COLLAPSED_H +
    EXPANDED_INTEL_H +
    Math.max(1, group.deals.length) * LENDER_ROW_H +
    8
  );
}

function healthTone(band: OpportunityHealthBand): {
  text: string;
  badge: string;
  bar: string;
} {
  switch (band) {
    case "healthy":
      return {
        text: "text-emerald-300",
        badge: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
        bar: "bg-emerald-500",
      };
    case "needs_attention":
      return {
        text: "text-amber-300",
        badge: "bg-amber-500/15 text-amber-100 border-amber-500/30",
        bar: "bg-amber-500",
      };
    default:
      return {
        text: "text-red-300",
        badge: "bg-red-500/15 text-red-200 border-red-500/30",
        bar: "bg-red-500",
      };
  }
}

interface OpportunityGroupedRegistryProps {
  groups: OpportunityRegistryGroup[];
  expandedKeys: Set<string>;
  selectedKeys: Set<string>;
  focusedKey: string | null;
  scrollTop: number;
  onScrollTopChange: (top: number) => void;
  onToggleExpand: (key: string) => void;
  onToggleSelect: (key: string) => void;
  onFocusGroup: (key: string | null) => void;
  onOpenOpportunity: (group: OpportunityRegistryGroup) => void;
  className?: string;
}

export function OpportunityGroupedRegistry({
  groups,
  expandedKeys,
  selectedKeys,
  focusedKey,
  scrollTop,
  onScrollTopChange,
  onToggleExpand,
  onToggleSelect,
  onFocusGroup,
  onOpenOpportunity,
  className,
}: OpportunityGroupedRegistryProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [viewportH, setViewportH] = useState(480);

  useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const measure = () => setViewportH(el.clientHeight || 480);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    if (Math.abs(el.scrollTop - scrollTop) > 2) {
      el.scrollTop = scrollTop;
    }
  }, [scrollTop, groups.length]);

  const offsets = useMemo(() => {
    const tops: number[] = [];
    const heights: number[] = [];
    let acc = 0;
    for (const g of groups) {
      tops.push(acc);
      const h = estimateGroupHeight(g, expandedKeys.has(g.key));
      heights.push(h);
      acc += h + 4;
    }
    return { tops, heights, total: acc };
  }, [groups, expandedKeys]);

  const { start, end } = useMemo(() => {
    const top = scrollTop;
    const bottom = scrollTop + viewportH;
    let s = 0;
    let e = groups.length;
    for (let i = 0; i < groups.length; i++) {
      const rowBottom = offsets.tops[i]! + offsets.heights[i]!;
      if (rowBottom >= top) {
        s = i;
        break;
      }
    }
    for (let i = s; i < groups.length; i++) {
      if (offsets.tops[i]! > bottom) {
        e = i;
        break;
      }
    }
    return {
      start: Math.max(0, s - OVERSCAN),
      end: Math.min(groups.length, e + OVERSCAN),
    };
  }, [scrollTop, viewportH, groups.length, offsets]);

  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      onScrollTopChange(e.currentTarget.scrollTop);
    },
    [onScrollTopChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (groups.length === 0) return;
      const keys = groups.map((g) => g.key);
      const idx = focusedKey ? keys.indexOf(focusedKey) : -1;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = keys[Math.min(keys.length - 1, Math.max(0, idx + 1))]!;
        onFocusGroup(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = keys[Math.max(0, idx <= 0 ? 0 : idx - 1)]!;
        onFocusGroup(next);
      } else if (e.key === "Enter" && focusedKey) {
        e.preventDefault();
        const g = groups.find((x) => x.key === focusedKey);
        if (g) onOpenOpportunity(g);
      } else if (e.key === " " && focusedKey) {
        e.preventDefault();
        onToggleExpand(focusedKey);
      } else if (e.key === "x" && focusedKey) {
        onToggleSelect(focusedKey);
      }
    },
    [focusedKey, groups, onFocusGroup, onOpenOpportunity, onToggleExpand, onToggleSelect],
  );

  if (groups.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 items-center justify-center rounded-md border border-dashed border-zinc-700 bg-zinc-950/40 px-6 py-16 text-center",
          className,
        )}
      >
        <p className="text-sm text-zinc-400">No opportunities match the current filters.</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-md border border-zinc-800 bg-zinc-950/60",
        className,
      )}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="list"
      aria-label="Opportunity registry"
      data-layout="registry"
      data-sprint="CO-UX-020"
    >
      <div className="relative w-full" style={{ height: offsets.total }}>
        {groups.slice(start, end).map((group, i) => {
          const index = start + i;
          const top = offsets.tops[index]!;
          const expanded = expandedKeys.has(group.key);
          return (
            <div
              key={group.key}
              role="listitem"
              className="absolute left-0 right-0 px-1.5"
              style={{ top, height: offsets.heights[index] }}
            >
              <OpportunityGroupBlock
                group={group}
                expanded={expanded}
                selected={selectedKeys.has(group.key)}
                focused={focusedKey === group.key}
                onToggleExpand={() => onToggleExpand(group.key)}
                onToggleSelect={() => onToggleSelect(group.key)}
                onFocus={() => onFocusGroup(group.key)}
                onOpen={() => onOpenOpportunity(group)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OpportunityGroupBlock({
  group,
  expanded,
  selected,
  focused,
  onToggleExpand,
  onToggleSelect,
  onFocus,
  onOpen,
}: {
  group: OpportunityRegistryGroup;
  expanded: boolean;
  selected: boolean;
  focused: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onFocus: () => void;
  onOpen: () => void;
}) {
  const ex = group.executive;
  const tone = healthTone(ex.healthBand);

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-md border border-zinc-800/90 bg-zinc-900/80",
        focused && "ring-1 ring-teal-500/50",
        selected && "border-teal-700/60",
        group.needsAttention && "border-l-2 border-l-amber-500",
      )}
    >
      {/* Collapsed / always-visible compact summary */}
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-transparent px-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 shrink-0 rounded border-zinc-600 bg-zinc-900"
          aria-label={`Select ${group.opportunityNumber}`}
        />
        <button
          type="button"
          className="shrink-0 text-zinc-500 hover:text-zinc-200"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse" : "Expand operational intelligence"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          <span className="inline-block w-3 text-[10px] font-bold">
            {expanded ? "▼" : "▶"}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpen}
          onFocus={onFocus}
          className="group/opp flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
          aria-label={`Open Deal Workspace for ${group.borrowerName}`}
        >
          <div className="min-w-0 flex-[1.2]">
            <p className="truncate text-[13px] font-semibold text-zinc-100 group-hover/opp:text-white">
              {group.borrowerName}
            </p>
            <p className="truncate text-[10px] text-zinc-500">
              <span className="font-mono">{group.opportunityNumber}</span>
              <span className="mx-1 text-zinc-700">·</span>
              {group.product}
              <span className="mx-1 text-zinc-700">·</span>
              <span className="tabular-nums text-zinc-400">{group.loanAmountLabel}</span>
            </p>
          </div>

          <div className="hidden min-w-0 shrink-0 items-center gap-2 sm:flex">
            <span
              className={cn(
                "rounded-full border px-1.5 py-px text-[9px] font-semibold tabular-nums",
                tone.badge,
              )}
              title="Opportunity Health"
            >
              {ex.healthScore}%
            </span>
            <span className="rounded bg-zinc-800 px-1.5 py-px text-[10px] tabular-nums text-zinc-400">
              {group.activeDealCount}d
            </span>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
            {ex.lenderChips.slice(0, 3).map((name) => (
              <span
                key={name}
                className="max-w-[7rem] truncate rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400"
              >
                {name}
              </span>
            ))}
            {ex.lenderChips.length > 3 ? (
              <span className="text-[10px] text-zinc-600">+{ex.lenderChips.length - 3}</span>
            ) : null}
          </div>

          <p className="hidden w-[7.5rem] shrink-0 truncate text-right text-[10px] text-zinc-500 lg:block">
            {group.assignedRm !== "—" ? group.assignedRm : "—"}
          </p>

          <ChevronRight
            className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover/opp:translate-x-0.5 group-hover/opp:text-teal-400"
            aria-hidden
          />
        </button>
      </div>

      {/* Expanded — operational intelligence (no nested scroll) */}
      {expanded ? (
        <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-800/90 bg-zinc-950/50">
          <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-3 lg:grid-cols-6">
            <IntelCell
              label="Health"
              value={`${ex.healthScore}% · ${ex.healthLabel}`}
              className={tone.text}
            />
            <IntelCell label="Progress" value={`${ex.progressPercent}%`} />
            <IntelCell label="Focus" value={ex.currentFocusLender} />
            <IntelCell
              label="Attention"
              value={String(ex.dealsRequiringAttention)}
            />
            <IntelCell label="Pending Docs" value={ex.pendingCustomerDocumentsLabel} />
            <IntelCell label="Revenue" value={ex.expectedRevenueLabel} />
          </div>
          <div className="mx-3 mb-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={cn("h-full rounded-full", tone.bar)}
              style={{ width: `${Math.max(6, Math.min(100, ex.progressPercent))}%` }}
            />
          </div>
          <p className="shrink-0 px-3 pb-1 text-[10px] text-zinc-500">
            {ex.totalDeals} Deal{ex.totalDeals === 1 ? "" : "s"}
            {ex.stageSummaryLines.length
              ? ` · ${ex.stageSummaryLines.join(" · ")}`
              : ""}
            <span className="mx-1 text-zinc-700">·</span>
            Last {ex.lastActivityLabel}
          </p>
          <ul className="shrink-0 px-2 pb-1.5">
            {group.deals.map((deal) => (
              <LenderSummaryRow key={deal.id} deal={deal} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function IntelCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-600">
        {label}
      </p>
      <p
        className={cn(
          "truncate text-[11px] font-medium text-zinc-200",
          className,
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function LenderSummaryRow({ deal }: { deal: DealRegistryRow }) {
  const progress = deriveJourneyProgressSegments({
    pipelineStage: deal.grossStage,
    status: String(deal.status),
  });
  const stageColor = getJourneySegmentColor(progress.segmentId);

  return (
    <li className="pointer-events-none flex h-7 items-center gap-2 rounded px-1.5 text-[11px] text-zinc-300">
      <span className="w-[28%] min-w-[100px] truncate font-medium text-zinc-200">
        {deal.selectedLender || "—"}
      </span>
      <LoanJourneyProgressCapsule
        pipelineStage={deal.grossStage}
        status={String(deal.status)}
        size="sm"
      />
      <span
        className="w-[22%] min-w-[88px] truncate font-medium"
        style={{ color: progress.overlayColor ?? stageColor }}
      >
        {deal.grossStageLabel}
        {progress.overlay !== "none"
          ? ` · ${progress.overlay === "hold" ? "Hold" : "Lost"}`
          : null}
      </span>
      <span className="ml-auto hidden tabular-nums text-zinc-500 xl:inline">
        {deal.lastActivityLabel}
      </span>
    </li>
  );
}
