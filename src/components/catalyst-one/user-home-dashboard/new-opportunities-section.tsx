"use client";

/**
 * CO-C1-DASH-001 — New Opportunities (first operational dashboard section).
 * createdAt-filtered feed with attention summary + auto-scroll ticker.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMMAND_CENTER_DATE_PRESETS,
  NEW_ARRIVALS_DEFAULT_PRESET,
} from "@/constants/user-home-dashboard/new-arrivals";
import {
  defaultNewArrivalsDateRange,
  resolveNewArrivalsDateRange,
} from "@/lib/user-home-dashboard/new-arrivals/date-range";
import {
  formatNewOpportunityAmount,
  loadNewOpportunitiesFeed,
} from "@/lib/user-home-dashboard/command-center";
import { subscribeOpportunitiesUpdated } from "@/lib/enterprise-opportunity/opportunity-data-sync";
import { cn } from "@/lib/utils";
import type {
  NewOpportunityAttentionStatus,
  NewOpportunityFeedRow,
  NewOpportunitySectionSummary,
} from "@/types/dashboard-command-center";
import type { NewArrivalsDatePresetId } from "@/types/user-home-new-arrivals";

function attentionMeta(status: NewOpportunityAttentionStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "actioned":
      return {
        label: "Actioned",
        className: "text-emerald-700 dark:text-emerald-300",
      };
    case "pending":
      return {
        label: "Pending",
        className: "text-amber-700 dark:text-amber-300",
      };
    default:
      return {
        label: "Unattended",
        className: "text-rose-700 dark:text-rose-300",
      };
  }
}

function FeedRow({
  row,
  onInteract,
}: {
  row: NewOpportunityFeedRow;
  onInteract: () => void;
}) {
  const attention = attentionMeta(row.attention);
  return (
    <Link
      href={row.workspaceHref}
      onClick={onInteract}
      onFocus={onInteract}
      className="block border-b border-border/60 px-3 py-1.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            {row.isNewIndicator ? (
              <span className="rounded border border-teal-600/40 bg-teal-600/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-200">
                New
              </span>
            ) : null}
            <span className={cn("text-[11px] font-semibold", attention.className)}>
              ● {attention.label}
            </span>
          </div>
          <p className="truncate text-[13px] font-semibold leading-snug text-foreground">
            {row.customerName}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {row.opportunityNumber} · {row.product} ·{" "}
            {formatNewOpportunityAmount(row.requestedAmount)}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            Source: {row.sourceLabel} · {row.sourceName}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            Stage: {row.stageLabel} · Assigned: {row.assignedLabel}
          </p>
          <p className="truncate text-[11px] tabular-nums text-muted-foreground">
            Created: {row.createdDateLabel}
            <span className="mx-1.5 text-border">·</span>
            Last Updated: {row.lastUpdatedLabel}
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-primary">Open →</span>
      </div>
    </Link>
  );
}

export function NewOpportunitiesSection() {
  const [preset, setPreset] = useState<NewArrivalsDatePresetId>(NEW_ARRIVALS_DEFAULT_PRESET);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NewOpportunityFeedRow[]>([]);
  const [summary, setSummary] = useState<NewOpportunitySectionSummary>({
    total: 0,
    unattended: 0,
    actioned: 0,
    pending: 0,
  });
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const expandBtnRef = useRef<HTMLButtonElement>(null);
  const interactPauseUntil = useRef(0);
  const wasExpanded = useRef(false);
  const [placeholderHeight, setPlaceholderHeight] = useState<number>();

  const range = useMemo(
    () => resolveNewArrivalsDateRange({ preset, customFrom, customTo }),
    [preset, customFrom, customTo],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadNewOpportunitiesFeed(range);
      setRows(result.rows);
      setSummary(result.summary);
    } catch {
      setRows([]);
      setSummary({ total: 0, unattended: 0, actioned: 0, pending: 0 });
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void refresh();
    const unsub = subscribeOpportunitiesUpdated(() => {
      void refresh();
    });
    return () => unsub();
  }, [refresh]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || rows.length === 0) return;
    el.scrollTop = 0;
  }, [rows]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (paused || Date.now() < interactPauseUntil.current) return;
      const node = viewportRef.current;
      if (!node) return;
      const max = node.scrollHeight - node.clientHeight;
      if (max <= 0) return;
      const next = node.scrollTop + 1;
      node.scrollTop = next >= max ? 0 : next;
    }, 60);
    return () => window.clearInterval(tick);
  }, [rows, paused]);

  const collapse = useCallback(() => {
    setExpanded(false);
  }, []);

  const expand = useCallback(() => {
    const el = shellRef.current;
    if (el) setPlaceholderHeight(el.getBoundingClientRect().height);
    setExpanded(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-radix-select-content], [role='listbox']")) return;
      event.preventDefault();
      collapse();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, collapse]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [expanded]);

  useLayoutEffect(() => {
    if (expanded) {
      wasExpanded.current = true;
      shellRef.current?.focus();
      return;
    }
    if (wasExpanded.current) {
      expandBtnRef.current?.focus();
    }
  }, [expanded]);

  const onInteract = () => {
    interactPauseUntil.current = Date.now() + 4000;
  };

  const onPresetChange = (value: string) => {
    const next = value as NewArrivalsDatePresetId;
    setPreset(next);
    if (next === "custom") {
      const fallback = defaultNewArrivalsDateRange();
      setCustomFrom((prev) => prev || fallback.from);
      setCustomTo((prev) => prev || fallback.to);
    }
  };

  const expandLabel = expanded ? "Collapse Live Feed" : "Expand Live Feed";

  return (
    <>
      {expanded ? (
        <div
          className="pointer-events-none w-full shrink-0"
          style={{ minHeight: placeholderHeight }}
          aria-hidden
        />
      ) : null}
      {expanded ? (
        <button
          type="button"
          className="fixed inset-0 z-[45] cursor-default bg-background sm:bg-black/50"
          aria-label="Close expanded Live Feed"
          onClick={collapse}
        />
      ) : null}
      <section
        ref={shellRef}
        aria-label="New Opportunities"
        aria-modal={expanded || undefined}
        data-widget-slot="new_opportunities"
        data-sprint="CO-C1-DASH-001"
        data-live-feed-expanded={expanded ? "true" : "false"}
        role={expanded ? "dialog" : undefined}
        tabIndex={expanded ? -1 : undefined}
        className={cn(
          "flex h-full min-h-0 w-full flex-1 flex-col gap-2 outline-none",
          expanded &&
            "fixed inset-0 z-[46] gap-3 overflow-hidden bg-background p-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-2xl sm:inset-3 sm:rounded-xl sm:border sm:p-4 md:inset-5 lg:inset-6",
        )}
      >
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight">New Opportunities</h2>
            <p className="text-[11px] text-muted-foreground">
              Opportunities created in the selected period (createdAt — not last updated).
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label
                htmlFor="new-opportunities-period"
                className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Period
              </label>
              <Select value={preset} onValueChange={onPresetChange}>
                <SelectTrigger
                  id="new-opportunities-period"
                  className="h-9 w-[min(100%,11.5rem)] text-xs"
                  aria-label="New Opportunities date filter"
                >
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent className="z-[80]">
                  {COMMAND_CENTER_DATE_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {preset === "custom" ? (
              <>
                <div className="space-y-1">
                  <label htmlFor="new-opp-from" className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    From
                  </label>
                  <Input
                    id="new-opp-from"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-9 w-[9.5rem] text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="new-opp-to" className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    To
                  </label>
                  <Input
                    id="new-opp-to"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-9 w-[9.5rem] text-xs"
                  />
                </div>
              </>
            ) : null}
            {expanded ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Close expanded Live Feed"
                title="Close"
                onClick={collapse}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-4">
          {[
            { label: "Total New Opportunities", value: summary.total },
            { label: "Unattended", value: summary.unattended },
            { label: "Actioned", value: summary.actioned },
            { label: "Pending", value: summary.pending },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-border/80 bg-card/60 px-2.5 py-1.5"
            >
              {loading ? (
                <span className="block h-6 w-10 animate-pulse rounded bg-muted" />
              ) : (
                <p className="text-xl font-semibold tabular-nums leading-tight">{kpi.value}</p>
              )}
              <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/80 bg-card/40"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Live feed · {range.label}
            </p>
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="hidden text-[10px] text-muted-foreground sm:block">
                {paused ? "Paused" : "Auto-scroll"} · hover to pause
              </p>
              <p className="text-[10px] text-muted-foreground sm:hidden">
                {paused ? "Paused" : "Auto-scroll"}
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    ref={expandBtnRef}
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
                    aria-label={expandLabel}
                    aria-expanded={expanded}
                    title={expandLabel}
                    onClick={expanded ? collapse : expand}
                  >
                    {expanded ? <Minimize2 /> : <Maximize2 />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="z-[90]">{expandLabel}</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div
            ref={viewportRef}
            className={cn(
              "min-h-0 overflow-y-auto",
              expanded
                ? "flex-1"
                : "max-h-[min(24rem,55dvh)] lg:max-h-none lg:flex-1",
            )}
            aria-live="polite"
          >
            {loading && rows.length === 0 ? (
              <div className="space-y-1.5 p-2" aria-busy>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-md bg-muted/60" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No new Opportunities in this period.
              </p>
            ) : (
              rows.map((row) => (
                <FeedRow key={row.id} row={row} onInteract={onInteract} />
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
