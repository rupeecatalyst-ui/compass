"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Columns3, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHANAKYA_RADAR_COLUMNS,
  CHANAKYA_RADAR_FILTER_ALL,
  CHANAKYA_RADAR_MATRIX_CARDS,
  CHANAKYA_RADAR_OFFICIAL_NAME,
  CHANAKYA_RADAR_STATUS_LINE,
  CHANAKYA_RADAR_VIEWS,
  type ChanakyaDealHealthId,
  type ChanakyaRadarMatrixHealthId,
  type ChanakyaRadarViewId,
} from "@/constants/chanakya-radar";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import {
  DEFAULT_CHANAKYA_RADAR_FILTERS,
  filterChanakyaRadarCards,
  groupRadarCardsByHealth,
  listChanakyaRadarCards,
  listChanakyaRadarFilterOptions,
  readChanakyaRadarViewState,
  rememberChanakyaRadarViewState,
  type ChanakyaRadarCard,
  type ChanakyaRadarFilters,
} from "@/lib/chanakya-radar";
import { cn } from "@/lib/utils";

/** Enterprise Kanban board columns — same four healths as Matrix. */
const KANBAN_BOARD_COLUMNS = CHANAKYA_RADAR_MATRIX_CARDS.map((card) => {
  const col = CHANAKYA_RADAR_COLUMNS.find((c) => c.id === card.id)!;
  return col;
});

/** CHANAKYA opens the Active Workspace for this deal — never a generic dump page. */
function openActiveWorkspace(
  router: ReturnType<typeof useRouter>,
  card: ChanakyaRadarCard,
) {
  setActiveOpportunityContext({
    fileId: card.fileId,
    opportunityId: card.opportunityNumber,
    customerName: card.borrower,
    product: card.product,
    label: card.opportunityNumber,
  });
  router.push(
    buildJourneyHref(card.nextWorkspace.href, {
      fileId: card.fileId,
      opportunityId: card.opportunityNumber,
    }),
  );
}

/**
 * CHANAKYA Radar — Dual View Framework.
 * Matrix (executive) + enterprise Kanban board share one filtered dataset.
 */
export function ChanakyaRadarWorkspace() {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [view, setView] = useState<ChanakyaRadarViewId>("matrix");
  const [filters, setFilters] = useState<ChanakyaRadarFilters>(DEFAULT_CHANAKYA_RADAR_FILTERS);
  const [healthFocus, setHealthFocus] = useState<ChanakyaDealHealthId | null>(null);
  const columnRefs = useRef<Partial<Record<ChanakyaDealHealthId, HTMLElement | null>>>({});
  const hydrated = useRef(false);

  useEffect(() => {
    const saved = readChanakyaRadarViewState();
    if (saved) {
      setView(saved.view);
      setFilters(saved.filters);
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    rememberChanakyaRadarViewState({ view, filters });
  }, [view, filters]);

  /** Single source of truth — scored once, then filtered for both views. */
  const allCards = useMemo(() => {
    void tick;
    return listChanakyaRadarCards(loadLoanFiles());
  }, [tick]);

  const filterOptions = useMemo(() => listChanakyaRadarFilterOptions(allCards), [allCards]);

  const cards = useMemo(
    () => filterChanakyaRadarCards(allCards, filters),
    [allCards, filters],
  );

  const groups = useMemo(() => groupRadarCardsByHealth(cards), [cards]);

  const secondaryCounts = useMemo(
    () => ({
      on_hold: groups.on_hold?.length ?? 0,
      completed: groups.completed?.length ?? 0,
    }),
    [groups],
  );

  useEffect(() => {
    if (view !== "kanban" || !healthFocus) return;
    const target = columnRefs.current[healthFocus];
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [view, healthFocus, cards]);

  const openMatrixDetails = (health: ChanakyaRadarMatrixHealthId) => {
    setHealthFocus(health);
    setView("kanban");
  };

  const patchFilter = <K extends keyof ChanakyaRadarFilters>(key: K, value: ChanakyaRadarFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setHealthFocus(null);
  };

  return (
    <div className="flex h-[calc(100dvh-4.5rem)] flex-col gap-2 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{CHANAKYA_RADAR_OFFICIAL_NAME}</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{CHANAKYA_RADAR_STATUS_LINE}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex h-8 items-stretch overflow-hidden rounded-lg border border-border bg-muted/30 p-0.5"
            role="group"
            aria-label="CHANAKYA Radar view"
          >
            {CHANAKYA_RADAR_VIEWS.map((v) => {
              const Icon = v.id === "matrix" ? LayoutGrid : Columns3;
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {v.label}
                </button>
              );
            })}
          </div>

          <FilterSelect
            label="Relationship Manager"
            value={filters.relationshipManager}
            allLabel="All Users"
            options={filterOptions.relationshipManagers}
            onChange={(v) => patchFilter("relationshipManager", v)}
          />
          <FilterSelect
            label="Product"
            value={filters.product}
            allLabel="All Products"
            options={filterOptions.products}
            onChange={(v) => patchFilter("product", v)}
          />
          <FilterSelect
            label="Source"
            value={filters.source}
            allLabel="All Sources"
            options={filterOptions.sources}
            onChange={(v) => patchFilter("source", v)}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto h-8 gap-1.5 text-xs"
            onClick={() => setTick((t) => t + 1)}
          >
            <Radar className="h-3.5 w-3.5" />
            Refresh Intelligence
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{cards.length}</span> deals
          in current filter
          {secondaryCounts.on_hold + secondaryCounts.completed > 0 ? (
            <>
              {" · "}
              <button
                type="button"
                className={cn(
                  "underline-offset-2 hover:underline",
                  healthFocus === "on_hold" ? "font-medium text-foreground" : "text-muted-foreground",
                )}
                onClick={() => {
                  setView("kanban");
                  setHealthFocus("on_hold");
                }}
              >
                {secondaryCounts.on_hold} On Hold
              </button>
              {" · "}
              <button
                type="button"
                className={cn(
                  "underline-offset-2 hover:underline",
                  healthFocus === "completed" ? "font-medium text-foreground" : "text-muted-foreground",
                )}
                onClick={() => {
                  setView("kanban");
                  setHealthFocus("completed");
                }}
              >
                {secondaryCounts.completed} Completed
              </button>
            </>
          ) : null}
          {healthFocus ? (
            <>
              {" · "}
              Focus{" "}
              <span className="font-medium text-foreground">
                {CHANAKYA_RADAR_COLUMNS.find((c) => c.id === healthFocus)?.label}
              </span>
              <button
                type="button"
                className="ml-1.5 text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
                onClick={() => setHealthFocus(null)}
              >
                Clear
              </button>
            </>
          ) : null}
        </p>
      </div>

      {view === "matrix" ? (
        <MatrixView groups={groups} onViewDetails={openMatrixDetails} />
      ) : (
        <KanbanView
          groups={groups}
          healthFocus={healthFocus}
          columnRefs={columnRefs}
          onOpen={(card) => openActiveWorkspace(router, card)}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[min(100%,160px)] text-[11px]" aria-label={label}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CHANAKYA_RADAR_FILTER_ALL} className="text-xs">
          {allLabel}
        </SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt} className="text-xs">
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MatrixView({
  groups,
  onViewDetails,
}: {
  groups: Record<ChanakyaDealHealthId, ChanakyaRadarCard[]>;
  onViewDetails: (health: ChanakyaRadarMatrixHealthId) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-0.5 scrollbar-thin">
      <div className="grid h-full min-h-[420px] grid-cols-1 gap-3 sm:grid-cols-2 sm:grid-rows-2">
        {CHANAKYA_RADAR_MATRIX_CARDS.map((card) => {
          const count = groups[card.id]?.length ?? 0;
          return (
            <section
              key={card.id}
              className={cn(
                "flex flex-col justify-between rounded-xl border p-5 shadow-sm",
                card.surfaceClass,
              )}
              aria-label={`${card.label}: ${count} deals`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-2 text-base font-semibold tracking-tight">
                    <span aria-hidden>{card.emoji}</span>
                    {card.label}
                  </p>
                  <span
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-sm font-bold tabular-nums text-white"
                    style={{ backgroundColor: card.tone }}
                  >
                    {count}
                  </span>
                </div>
                <p className="mt-3 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  {count === 0
                    ? "No deals in this health state for the current filter."
                    : `${count} transaction${count === 1 ? "" : "s"} match the current filter.`}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 text-xs"
                  onClick={() => onViewDetails(card.id)}
                >
                  View Details
                </Button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function KanbanView({
  groups,
  healthFocus,
  columnRefs,
  onOpen,
}: {
  groups: Record<ChanakyaDealHealthId, ChanakyaRadarCard[]>;
  healthFocus: ChanakyaDealHealthId | null;
  columnRefs: React.MutableRefObject<Partial<Record<ChanakyaDealHealthId, HTMLElement | null>>>;
  onOpen: (card: ChanakyaRadarCard) => void;
}) {
  const focusedSecondary =
    healthFocus === "on_hold" || healthFocus === "completed"
      ? CHANAKYA_RADAR_COLUMNS.find((c) => c.id === healthFocus)
      : null;

  const columns = focusedSecondary ? [focusedSecondary] : KANBAN_BOARD_COLUMNS;

  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 gap-2 overflow-hidden",
        columns.length === 1
          ? "grid-cols-1"
          : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
      )}
    >
      {columns.map((col) => {
        const items = groups[col.id] ?? [];
        const focused = healthFocus === col.id;
        return (
          <section
            key={col.id}
            ref={(el) => {
              columnRefs.current[col.id] = el;
            }}
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-muted/20",
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

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-1.5 scrollbar-thin">
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

/** Compact enterprise opportunity card — dense, action-oriented, no long AI narration. */
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
