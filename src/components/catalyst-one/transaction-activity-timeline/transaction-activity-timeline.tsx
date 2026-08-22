"use client";

/**
 * CO-C1-DIALOGUE-002 / 002A — Unified Transaction Activity Timeline (EAR reader UI).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, UserRound, Cog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BusinessNotesActionButton,
  type BusinessNotesContext,
} from "@/components/catalyst-one/enterprise-business-notes";
import {
  TRANSACTION_TIMELINE_FILTERS,
  formatTimelineWhen,
  loadTransactionActivityTimeline,
  matchesTimelineFilter,
  subscribeEarUpdated,
  type TransactionTimelineFilterId,
  type TransactionTimelineItem,
  type TransactionTimelineScope,
} from "@/lib/enterprise-activity-registry";
import { cn } from "@/lib/utils";

type Props = {
  scope: TransactionTimelineScope;
  /** Optional Business Notes create context — preserves existing write pathway. */
  notesContext?: BusinessNotesContext;
  className?: string;
  compact?: boolean;
  title?: string;
  description?: string;
  /** When false, skip network load (Deal collapsible closed). */
  active?: boolean;
  /** When set, shows a top-right Close control and enables Escape to dismiss. */
  onClose?: () => void;
};

function categoryTone(category: TransactionTimelineItem["category"]): string {
  switch (category) {
    case "note":
    case "activity":
      return "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200";
    case "stage_change":
    case "approval":
    case "disbursement":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200";
    case "document":
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200";
    case "task":
      return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200";
    case "lender":
      return "border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-200";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

type DayGroup = { day: string; items: TransactionTimelineItem[] };

function groupByDay(items: TransactionTimelineItem[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of items) {
    const day = formatTimelineWhen(item.occurredAt).day;
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

export function TransactionActivityTimeline({
  scope,
  notesContext,
  className,
  compact = false,
  title = "Activity Timeline",
  description = "Chronological work history for this transaction.",
  active = true,
  onClose,
}: Props) {
  const [items, setItems] = useState<TransactionTimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TransactionTimelineFilterId>("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(80);

  const scopeKey =
    scope.mode === "opportunity"
      ? `opp:${scope.opportunityId}`
      : scope.mode === "contact"
        ? `contact:${scope.contactId}`
        : scope.mode === "lender"
          ? `lender:${scope.dealIds.join(",")}`
          : `deal:${scope.dealId}:${scope.opportunityId || ""}`;

  const opportunityId =
    scope.mode === "opportunity"
      ? scope.opportunityId
      : scope.mode === "deal"
        ? scope.opportunityId || null
        : null;
  const dealId = scope.mode === "deal" ? scope.dealId : null;
  const mode = scope.mode;

  const refresh = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const nextScope: TransactionTimelineScope =
        mode === "opportunity"
          ? { mode: "opportunity", opportunityId: opportunityId! }
          : {
              mode: "deal",
              dealId: dealId!,
              opportunityId,
            };
      const rows = await loadTransactionActivityTimeline(nextScope, { limit });
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load activity timeline.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [active, mode, opportunityId, dealId, limit]);

  useEffect(() => {
    if (!active) return;
    void refresh();
  }, [refresh, scopeKey, active]);

  useEffect(() => {
    if (!active) return;
    return subscribeEarUpdated(() => {
      void refresh();
    });
  }, [refresh, active]);

  useEffect(() => {
    if (!active || !onClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onClose]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!matchesTimelineFilter(item, filter)) return false;
      if (!q) return true;
      const hay = [
        item.title,
        item.description,
        item.actorLabel,
        item.categoryLabel,
        item.previousValue || "",
        item.newValue || "",
        item.entityLabel,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, filter, search]);

  const dayGroups = useMemo(() => groupByDay(visible), [visible]);

  if (!active) {
    return (
      <p className="px-1 py-2 text-[11px] text-muted-foreground">
        Expand to load transaction history.
      </p>
    );
  }

  return (
    <div
      className={cn("space-y-3", className)}
      data-sprint="CO-C1-DIALOGUE-002"
      data-timeline-scope={scopeKey}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {!compact ? (
            <>
              <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
              <p className="text-[12px] text-muted-foreground">{description}</p>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {notesContext ? (
            <BusinessNotesActionButton context={notesContext} onSaved={() => void refresh()} />
          ) : null}
          {onClose ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close Activity Timeline"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TRANSACTION_TIMELINE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
              filter === f.id
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border/70 bg-background text-muted-foreground hover:bg-muted/40",
            )}
          >
            {f.label}
          </button>
        ))}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search this history…"
          className="h-8 w-[min(100%,14rem)] text-xs"
          aria-label="Search this timeline locally"
        />
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-2" aria-busy>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          No activity recorded for this transaction yet. Add a Business Note to capture the
          discussion — it will appear here in chronological order.
        </p>
      ) : null}

      <div className={cn("space-y-4", compact ? "max-h-64 overflow-y-auto pr-1" : "")}>
        {dayGroups.map((group) => (
          <section key={group.day} className="space-y-2">
            <h4 className="sticky top-0 z-[1] bg-background/90 px-0.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
              {group.day}
            </h4>
            <ul className="space-y-2">
              {group.items.map((item) => {
                const when = formatTimelineWhen(item.occurredAt);
                const isSystem = item.actorLabel === "System";
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-border/80 bg-card/50 px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
                        {when.time || "—"}
                      </p>
                      <span
                        className={cn(
                          "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          categoryTone(item.category),
                        )}
                      >
                        {item.categoryLabel}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-start gap-2">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        {isSystem ? (
                          <Cog className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <UserRound className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-[12px] font-medium text-foreground">
                          {item.actorLabel}
                        </p>
                        <p className="text-sm font-semibold leading-snug text-foreground">
                          {item.title}
                        </p>
                        {item.description ? (
                          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">
                            {item.category === "note" || item.category === "activity"
                              ? item.description.startsWith('"')
                                ? item.description
                                : `"${item.description}"`
                              : item.description}
                          </p>
                        ) : null}
                        {item.previousValue || item.newValue ? (
                          <p className="text-[12px] tabular-nums text-foreground/90">
                            <span className="text-muted-foreground">
                              {item.previousValue || "—"}
                            </span>
                            <span className="mx-1.5 text-muted-foreground">→</span>
                            <span className="font-medium">{item.newValue || "—"}</span>
                          </p>
                        ) : null}
                        <p className="text-[10px] text-muted-foreground">{item.entityLabel}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {!loading && items.length >= limit ? (
        <div className="flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => setLimit((n) => Math.min(n + 40, 200))}
          >
            Load earlier activity
          </Button>
        </div>
      ) : null}
    </div>
  );
}
