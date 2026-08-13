"use client";

/**
 * CO-C1-DASH-001 — New Opportunities (first operational dashboard section).
 * createdAt-filtered feed with attention summary + auto-scroll ticker.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const interactPauseUntil = useRef(0);

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

  return (
    <section
      aria-label="New Opportunities"
      data-widget-slot="new_opportunities"
      data-sprint="CO-C1-DASH-001"
      className="space-y-2"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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
              <SelectContent>
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
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
        className="overflow-hidden rounded-lg border border-border/80 bg-card/40"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Live feed · {range.label}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {paused ? "Paused" : "Auto-scroll"} · hover to pause
          </p>
        </div>
        <div
          ref={viewportRef}
          className="max-h-[13.5rem] overflow-y-auto"
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
  );
}
