"use client";

/**
 * CO-C1-ACTIVITY-DIALOGUE-TIMELINE-010
 * Organisation-wide Activity & Dialogue transaction timeline (EAR reader).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  UserRound,
  Cog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActivityTimelineDetailsDrawer } from "@/components/catalyst-one/activity/activity-timeline-details-drawer";
import {
  ACTIVITY_DIALOGUE_TIMELINE_PAGE_SIZE,
  ACTIVITY_DIALOGUE_TIMELINE_SPRINT,
  DETAILED_TIMELINE_EVENT_TYPE_LABELS,
  DETAILED_TIMELINE_STATUS_LABELS,
} from "@/constants/activity-dialogue-timeline";
import { DETAILED_TIMELINE_EVENT_TYPES } from "@/types/activity-dialogue-timeline";
import type {
  DetailedTimelineCounts,
  DetailedTimelineEventType,
  DetailedTimelineFilters,
  DetailedTimelineRow,
  DetailedTimelineStatusFilter,
} from "@/types/activity-dialogue-timeline";
import { listDetailedActivityDialogueTimeline } from "@/lib/enterprise-activity-registry/api-client";
import {
  emptyDetailedTimelineFilters,
  groupDetailedTimelineRowsByDay,
  toAuthorisedTimelineExportRows,
} from "@/lib/enterprise-activity-registry/detailed-timeline";
import {
  buildActivityTimelineHref,
  loadDetailedTimelineRestoreState,
  saveDetailedTimelineRestoreState,
  withReturnToActivityTimeline,
} from "@/lib/enterprise-activity-registry/detailed-timeline-state";
import { downloadCsv } from "@/lib/loan-files-utils";
import { useAuthContext } from "@/components/providers/auth-provider";
import { ROLES } from "@/constants/roles";
import { cn } from "@/lib/utils";

const EMPTY_COUNTS: DetailedTimelineCounts = {
  total: 0,
  communications: 0,
  stageChanges: 0,
  documents: 0,
  tasks: 0,
  needsAttention: 0,
  capped: false,
  complete: true,
};

function CountChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function DetailedActivityDialogueTimeline({
  initialFilters,
  focusEventId,
}: {
  initialFilters?: Partial<DetailedTimelineFilters>;
  focusEventId?: string | null;
}) {
  const router = useRouter();
  const { user } = useAuthContext();
  const canSeeTechnical =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const [filters, setFilters] = useState<DetailedTimelineFilters>(() => ({
    ...emptyDetailedTimelineFilters(),
    ...initialFilters,
  }));
  const [items, setItems] = useState<DetailedTimelineRow[]>([]);
  const [counts, setCounts] = useState<DetailedTimelineCounts>(EMPTY_COUNTS);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [selected, setSelected] = useState<DetailedTimelineRow | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const restoredScroll = useRef(false);

  const persist = useCallback(
    (nextFilters: DetailedTimelineFilters, extra?: { selectedEventId?: string | null }) => {
      saveDetailedTimelineRestoreState({
        filters: nextFilters,
        scrollY: typeof window === "undefined" ? 0 : window.scrollY,
        expandedDays: [...expandedDays],
        selectedEventId: extra?.selectedEventId ?? selected?.id ?? null,
      });
      router.replace(
        buildActivityTimelineHref(nextFilters, {
          eventId: extra?.selectedEventId ?? selected?.id ?? null,
        }),
        { scroll: false },
      );
    },
    [expandedDays, router, selected?.id],
  );

  const load = useCallback(
    async (mode: "replace" | "append", cursor?: string | null) => {
      if (mode === "replace") {
        setLoading(true);
        setError(null);
        setForbidden(false);
      } else {
        setLoadingMore(true);
      }
      try {
        const page = await listDetailedActivityDialogueTimeline({
          filters,
          cursor: cursor ?? null,
          limit: ACTIVITY_DIALOGUE_TIMELINE_PAGE_SIZE,
        });
        setCounts(page.counts);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setItems((prev) => (mode === "append" ? [...prev, ...page.items] : page.items));
        if (mode === "replace") {
          setExpandedDays((prev) => {
            if (prev.size) return prev;
            const first = page.items[0]?.when.dayGroupKey;
            return first ? new Set([first]) : prev;
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load timeline";
        if (/403|401|unauthor/i.test(message)) setForbidden(true);
        setError(message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters],
  );

  const urlOpportunityId = initialFilters?.opportunityId ?? null;
  const urlDealId = initialFilters?.dealId ?? null;

  useEffect(() => {
    void load("replace");
  }, [load]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      opportunityId: urlOpportunityId,
      dealId: urlDealId,
    }));
  }, [urlOpportunityId, urlDealId]);

  useEffect(() => {
    const saved = loadDetailedTimelineRestoreState();
    if (!saved) return;
    if (saved.expandedDays.length) setExpandedDays(new Set(saved.expandedDays));
    if (!restoredScroll.current && saved.scrollY) {
      restoredScroll.current = true;
      window.requestAnimationFrame(() => window.scrollTo(0, saved.scrollY));
    }
  }, []);

  useEffect(() => {
    if (!focusEventId || !items.length) return;
    const match = items.find((row) => row.id === focusEventId);
    if (match) setSelected(match);
  }, [focusEventId, items]);

  const groups = useMemo(() => groupDetailedTimelineRowsByDay(items), [items]);

  function patchFilters(patch: Partial<DetailedTimelineFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    persist(next);
  }

  function toggleDay(dayKey: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      saveDetailedTimelineRestoreState({
        filters,
        scrollY: window.scrollY,
        expandedDays: [...next],
        selectedEventId: selected?.id ?? null,
      });
      return next;
    });
  }

  function openRow(row: DetailedTimelineRow) {
    setSelected(row);
    persist(filters, { selectedEventId: row.id });
  }

  function exportVisible() {
    const table = toAuthorisedTimelineExportRows(items);
    const csv = table
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadCsv(csv, `activity-dialogue-timeline-${Date.now()}.csv`);
  }

  return (
    <div
      className="space-y-4"
      data-sprint={ACTIVITY_DIALOGUE_TIMELINE_SPRINT}
      data-activity-dialogue-timeline=""
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <CountChip label="Total events" value={counts.total} />
        <CountChip label="Communications" value={counts.communications} />
        <CountChip label="Stage changes" value={counts.stageChanges} />
        <CountChip label="Documents" value={counts.documents} />
        <CountChip label="Tasks" value={counts.tasks} />
        <CountChip label="Needs attention" value={counts.needsAttention} />
      </div>
      {counts.complete === false || counts.capped ? (
        <p className="text-[11px] text-muted-foreground">
          Summary counts are incomplete because the durable Enterprise Activity Registry is
          unavailable. They are not the full authorised organisation timeline.
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border/70 bg-muted/15 p-3">
        <label className="space-y-1 text-[11px] text-muted-foreground">
          From
          <Input
            type="datetime-local"
            className="h-8 w-[11.5rem] text-xs"
            value={filters.since ? filters.since.slice(0, 16) : ""}
            onChange={(e) =>
              patchFilters({ since: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          To
          <Input
            type="datetime-local"
            className="h-8 w-[11.5rem] text-xs"
            value={filters.until ? filters.until.slice(0, 16) : ""}
            onChange={(e) =>
              patchFilters({ until: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          Opportunity ID
          <Input
            className="h-8 w-40 text-xs"
            value={filters.opportunityId || ""}
            onChange={(e) => patchFilters({ opportunityId: e.target.value.trim() || null })}
            placeholder="Canonical id"
          />
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          Deal ID
          <Input
            className="h-8 w-40 text-xs"
            value={filters.dealId || ""}
            onChange={(e) => patchFilters({ dealId: e.target.value.trim() || null })}
            placeholder="Canonical id"
          />
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          Customer / company ID
          <Input
            className="h-8 w-40 text-xs"
            value={filters.contactId || filters.companyId || ""}
            onChange={(e) => {
              const v = e.target.value.trim() || null;
              patchFilters({ contactId: v, companyId: null });
            }}
            placeholder="Canonical id"
          />
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          Employee / actor ID
          <Input
            className="h-8 w-40 text-xs"
            value={filters.actorUserId || ""}
            onChange={(e) => patchFilters({ actorUserId: e.target.value.trim() || null })}
            placeholder="Canonical id"
          />
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          Lender ID
          <Input
            className="h-8 w-40 text-xs"
            value={filters.lenderId || ""}
            onChange={(e) => patchFilters({ lenderId: e.target.value.trim() || null })}
            placeholder="Canonical id"
          />
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          Product
          <Input
            className="h-8 w-36 text-xs"
            value={filters.product || ""}
            onChange={(e) => patchFilters({ product: e.target.value.trim() || null })}
          />
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          Event type
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={filters.eventType}
            onChange={(e) =>
              patchFilters({
                eventType: e.target.value as DetailedTimelineEventType | "all",
              })
            }
          >
            <option value="all">{DETAILED_TIMELINE_EVENT_TYPE_LABELS.all}</option>
            {DETAILED_TIMELINE_EVENT_TYPES.map((id) => (
              <option key={id} value={id}>
                {DETAILED_TIMELINE_EVENT_TYPE_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          Source workspace
          <Input
            className="h-8 w-40 text-xs"
            value={filters.sourceWorkspace || ""}
            onChange={(e) => patchFilters({ sourceWorkspace: e.target.value.trim() || null })}
            placeholder="Deal Control"
          />
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          Status
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            value={filters.status}
            onChange={(e) =>
              patchFilters({ status: e.target.value as DetailedTimelineStatusFilter })
            }
          >
            {Object.entries(DETAILED_TIMELINE_STATUS_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-[11px] text-muted-foreground">
          Search
          <Input
            className="h-8 w-48 text-xs"
            value={filters.search}
            onChange={(e) => patchFilters({ search: e.target.value })}
            placeholder="Search this view"
            aria-label="Search Activity & Dialogue"
          />
        </label>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => void load("replace")}
            disabled={loading}
          >
            <RefreshCw className={cn("mr-1 h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={exportVisible}
            disabled={!items.length}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-2" aria-busy>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : null}

      {forbidden ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
          You do not have permission to view this Activity & Dialogue history.
        </p>
      ) : null}

      {error && !forbidden ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
          <p>{error}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2 h-8 text-xs"
            onClick={() => void load("replace")}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-6 text-sm text-muted-foreground">
          No authorised Activity & Dialogue events match this filter.
        </p>
      ) : null}

      <div className="space-y-3">
        {groups.map((group) => {
          const open = expandedDays.has(group.dayKey);
          return (
            <section key={group.dayKey} className="rounded-xl border border-border/70">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                aria-expanded={open}
                onClick={() => toggleDay(group.dayKey)}
              >
                {open ? (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                )}
                {group.dayLabel}
                <span className="ml-auto tabular-nums">{group.items.length}</span>
              </button>
              {open ? (
                <ul className="space-y-2 border-t border-border/60 p-2">
                  {group.items.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => openRow(row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openRow(row);
                          }
                        }}
                        className={cn(
                          "w-full rounded-lg border bg-card/60 px-3 py-2.5 text-left transition-colors",
                          "hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          row.needsAttention
                            ? "border-amber-500/50"
                            : "border-border/70",
                        )}
                      >
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            {row.isSystemActor ? (
                              <Cog className="h-3.5 w-3.5" aria-hidden />
                            ) : (
                              <UserRound className="h-3.5 w-3.5" aria-hidden />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span className="tabular-nums">
                                {row.when.timeWithSeconds} · {row.when.timezone}
                              </span>
                              <span className="rounded border px-1.5 py-px text-[10px] font-semibold uppercase">
                                {row.eventTypeLabel}
                              </span>
                              {row.needsAttention ? (
                                <span className="rounded border border-amber-500/40 px-1.5 py-px text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                                  Needs attention
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
                              {row.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                              {row.explanation}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">
                              {[
                                row.customerLabel || row.companyLabel,
                                row.lenderLabel,
                                row.productLabel,
                                row.loanAmountLabel,
                                row.opportunityId,
                                row.dealId,
                                row.currentStage,
                                row.actorLabel,
                                row.actorRole,
                                row.sourceWorkspace,
                                row.deliveryStatus,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {row.beforeValue || row.afterValue ? (
                              <p className="mt-0.5 text-[11px] tabular-nums">
                                {row.beforeValue || "—"} → {row.afterValue || "—"}
                              </p>
                            ) : null}
                            {row.hrefs.openTransaction ? (
                              <Link
                                href={withReturnToActivityTimeline(row.hrefs.openTransaction)}
                                className="mt-1 inline-flex text-[11px] font-medium text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Open transaction
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-xs"
            disabled={loadingMore}
            onClick={() => void load("append", nextCursor)}
          >
            {loadingMore ? "Loading…" : "Load earlier activity"}
          </Button>
        </div>
      ) : null}

      <ActivityTimelineDetailsDrawer
        row={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        canSeeTechnical={canSeeTechnical}
      />
    </div>
  );
}
