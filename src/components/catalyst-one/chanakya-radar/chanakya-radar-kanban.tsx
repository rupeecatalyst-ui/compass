"use client";

import type { MutableRefObject } from "react";
import {
  CHANAKYA_RADAR_COLUMNS,
  type ChanakyaDealHealthId,
  type ChanakyaOperationalQuadrantId,
} from "@/constants/chanakya-radar";
import type { ChanakyaRadarCard } from "@/lib/chanakya-radar";
import { cn } from "@/lib/utils";

/** Enterprise Kanban board columns — operational order (restored board). */
export const CHANAKYA_RADAR_KANBAN_COLUMNS = (
  ["on_track", "needs_attention", "follow_up_required", "at_risk"] as const
).map((id) => CHANAKYA_RADAR_COLUMNS.find((c) => c.id === id)!);

/**
 * Map legacy Deal Health → operational quadrant for Kanban columns.
 * Preserves prior board behaviour while aligning with Radar quadrants.
 */
export function mapCardHealthToKanbanColumn(
  health: ChanakyaDealHealthId,
): ChanakyaOperationalQuadrantId | null {
  if (health === "completed") return null;
  if (health === "on_track") return "on_track";
  if (health === "needs_attention") return "needs_attention";
  if (health === "follow_up_required" || health === "dormant") return "follow_up_required";
  if (health === "at_risk" || health === "on_hold") return "at_risk";
  return "needs_attention";
}

export function groupRadarCardsForKanban(
  cards: ChanakyaRadarCard[],
): Record<ChanakyaOperationalQuadrantId, ChanakyaRadarCard[]> {
  const map: Record<ChanakyaOperationalQuadrantId, ChanakyaRadarCard[]> = {
    on_track: [],
    needs_attention: [],
    follow_up_required: [],
    at_risk: [],
  };
  for (const card of cards) {
    const q = mapCardHealthToKanbanColumn(card.health);
    if (q) map[q].push(card);
  }
  return map;
}

interface ChanakyaRadarKanbanProps {
  groups: Record<ChanakyaOperationalQuadrantId, ChanakyaRadarCard[]>;
  healthFocus: ChanakyaOperationalQuadrantId | null;
  columnRefs: MutableRefObject<
    Partial<Record<ChanakyaOperationalQuadrantId, HTMLElement | null>>
  >;
  onOpen: (card: ChanakyaRadarCard) => void;
}

/**
 * CO-SPRINT-100A — Restored enterprise Kanban (unchanged cards / behaviour).
 * When healthFocus is set, shows only that operational column.
 */
export function ChanakyaRadarKanban({
  groups,
  healthFocus,
  columnRefs,
  onOpen,
}: ChanakyaRadarKanbanProps) {
  const columns = healthFocus
    ? CHANAKYA_RADAR_KANBAN_COLUMNS.filter((c) => c.id === healthFocus)
    : CHANAKYA_RADAR_KANBAN_COLUMNS;

  return (
    <div
      className={cn(
        "grid gap-2",
        columns.length === 1
          ? "grid-cols-1"
          : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
      )}
    >
      {columns.map((col) => {
        const items = groups[col.id as ChanakyaOperationalQuadrantId] ?? [];
        const focused = healthFocus === col.id;
        return (
          <section
            key={col.id}
            ref={(el) => {
              columnRefs.current[col.id as ChanakyaOperationalQuadrantId] = el;
            }}
            className={cn(
              "flex min-w-0 flex-col rounded-lg border bg-muted/20",
              focused
                ? "border-teal-500/50 ring-1 ring-teal-500/30"
                : "border-border/70",
            )}
            aria-label={`${col.label} deals`}
          >
            <header
              className={cn(
                "flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-2.5",
                col.headerClass,
              )}
            >
              <p className="flex min-w-0 items-center gap-1.5 text-[12px] font-semibold tracking-tight">
                <span className="shrink-0 text-sm leading-none" aria-hidden>
                  {col.emoji}
                </span>
                <span className="truncate">{col.label}</span>
              </p>
              <span
                className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums leading-none text-white"
                style={{ backgroundColor: col.tone }}
                aria-label={`${items.length} deals`}
              >
                {items.length}
              </span>
            </header>

            <div className="space-y-1.5 p-1.5">
              {items.map((card) => (
                <RadarOpportunityCard
                  key={card.id}
                  card={card}
                  health={col.id}
                  onOpen={() => onOpen(card)}
                />
              ))}
              {items.length === 0 ? (
                <p className="px-2 py-12 text-center text-[11px] text-muted-foreground">
                  No deals in this column
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Compact enterprise opportunity card — dense, action-oriented (restored). */
function RadarOpportunityCard({
  card,
  health,
  onOpen,
}: {
  card: ChanakyaRadarCard;
  health: ChanakyaDealHealthId;
  onOpen: () => void;
}) {
  const priorityClass =
    card.aiPriority === "high"
      ? "border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-200"
      : card.aiPriority === "medium"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100"
        : "border-border bg-muted/50 text-muted-foreground";

  const momentumClass =
    card.momentum === "improving"
      ? "text-emerald-700 dark:text-emerald-300"
      : card.momentum === "declining"
        ? "text-rose-700 dark:text-rose-300"
        : "text-muted-foreground";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "cursor-pointer rounded-md border border-border/70 bg-card px-2.5 py-2 text-left shadow-sm",
        "transition-colors hover:border-teal-500/40 hover:bg-teal-500/[0.03]",
        "select-none",
      )}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      data-health={health}
      data-workspace={card.nextWorkspace.id}
      aria-grabbed={false}
      title={`Open ${card.nextWorkspace.label}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight tracking-tight">
            {card.borrower}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-semibold tabular-nums text-foreground/90">
            {card.loanAmountLabel}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{card.product}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
            priorityClass,
          )}
        >
          {card.aiPriority}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
        <span className="tabular-nums text-muted-foreground">{card.daysSinceActivityLabel}</span>
        <span className="text-border">·</span>
        <span className={cn("font-medium", momentumClass)}>{card.momentumLabel}</span>
      </div>

      <p className="mt-1 truncate text-[10px] text-muted-foreground">
        RM · <span className="font-medium text-foreground/85">{card.relationshipManager}</span>
      </p>

      <div className="mt-1.5 rounded border border-border/60 bg-muted/25 px-1.5 py-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {card.waitingOn.preamble}
        </p>
        <p className="truncate text-[11px] font-semibold leading-tight text-foreground">
          <span className="mr-1" aria-hidden>
            {card.waitingOn.emoji}
          </span>
          {card.waitingOn.party}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground/70">Pending Item</span>
          {" · "}
          {card.waitingOn.pendingItem}
        </p>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[10px] font-medium text-foreground/85">
          <span className="mr-1" aria-hidden>
            {card.nextWorkspace.emoji}
          </span>
          {card.nextWorkspace.label}
        </p>
        <span
          className="shrink-0 rounded border border-dashed border-border/80 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-muted-foreground"
          title="Opportunity Health Score — coming soon"
        >
          Health —
        </span>
      </div>

      <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-foreground/75">
        {card.executiveInsight}
      </p>

      <p className="mt-1 text-[9px] tabular-nums text-muted-foreground/80">
        {card.opportunityNumber}
      </p>
    </article>
  );
}
