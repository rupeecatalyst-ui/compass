"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Columns3, Radar, Sparkles } from "lucide-react";
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
  CHANAKYA_RADAR_WORKSPACES,
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
 * One shared filtered dataset drives Matrix (executive) and Kanban (operational).
 */
export function ChanakyaRadarWorkspace() {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [view, setView] = useState<ChanakyaRadarViewId>("matrix");
  const [filters, setFilters] = useState<ChanakyaRadarFilters>(DEFAULT_CHANAKYA_RADAR_FILTERS);
  const [healthFocus, setHealthFocus] = useState<ChanakyaDealHealthId | null>(null);
  const columnRefs = useRef<Partial<Record<ChanakyaDealHealthId, HTMLElement | null>>>({});
  const kanbanScrollerRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (view !== "kanban" || !healthFocus) return;
    const scroller = kanbanScrollerRef.current;
    const target = columnRefs.current[healthFocus];
    if (!scroller || !target) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const delta =
      targetRect.left + targetRect.width / 2 - (scrollerRect.left + scrollerRect.width / 2);
    const nextLeft = scroller.scrollLeft + delta;
    const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    scroller.scrollTo({ left: Math.max(0, Math.min(maxLeft, nextLeft)), behavior: "smooth" });
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

        {/* View switcher + global filters — one toolbar */}
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
          {healthFocus ? (
            <>
              {" · "}
              Showing{" "}
              <span className="font-medium text-foreground">
                {CHANAKYA_RADAR_COLUMNS.find((c) => c.id === healthFocus)?.label}
              </span>
              <button
                type="button"
                className="ml-1.5 text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
                onClick={() => setHealthFocus(null)}
              >
                Clear focus
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
          scrollerRef={kanbanScrollerRef}
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
  scrollerRef,
  onOpen,
}: {
  groups: Record<ChanakyaDealHealthId, ChanakyaRadarCard[]>;
  healthFocus: ChanakyaDealHealthId | null;
  columnRefs: React.MutableRefObject<Partial<Record<ChanakyaDealHealthId, HTMLElement | null>>>;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  onOpen: (card: ChanakyaRadarCard) => void;
}) {
  const columns = healthFocus
    ? CHANAKYA_RADAR_COLUMNS.filter((c) => c.id === healthFocus)
    : CHANAKYA_RADAR_COLUMNS;

  return (
    <div ref={scrollerRef} className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1">
      {columns.map((col) => {
        const items = groups[col.id] ?? [];
        return (
          <section
            key={col.id}
            ref={(el) => {
              columnRefs.current[col.id] = el;
            }}
            className="flex h-full w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/15"
            aria-label={`${col.label} deals`}
          >
            <header
              className={cn(
                "flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3",
                col.headerClass,
              )}
            >
              <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold tracking-tight">
                <span className="shrink-0 text-sm leading-none" aria-hidden>
                  {col.emoji}
                </span>
                <span className="truncate">{col.label}</span>
              </p>
              <span
                className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums leading-none text-white"
                style={{ backgroundColor: col.tone }}
                aria-label={`${items.length} deals`}
              >
                {items.length}
              </span>
            </header>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin">
              {items.map((card) => (
                <RadarCard
                  key={card.id}
                  card={card}
                  health={col.id}
                  onOpen={() => onOpen(card)}
                />
              ))}
              {items.length === 0 ? (
                <p className="px-2 py-10 text-center text-[11px] text-muted-foreground">
                  No deals in this health state
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RadarCard({
  card,
  health,
  onOpen,
}: {
  card: ChanakyaRadarCard;
  health: ChanakyaDealHealthId;
  onOpen: () => void;
}) {
  const workspaceTone = CHANAKYA_RADAR_WORKSPACES[card.nextWorkspace.id].toneClass;
  const priorityClass =
    card.aiPriority === "high"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
      : card.aiPriority === "medium"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100"
        : "border-border bg-muted/40 text-muted-foreground";

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
        "cursor-pointer rounded-lg border border-border/70 bg-card p-3 text-left shadow-sm",
        "transition-colors hover:border-teal-500/35 hover:bg-teal-500/[0.03]",
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
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">{card.borrower}</p>
          <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-teal-800 dark:text-teal-200">
            {card.opportunityNumber}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
              priorityClass,
            )}
          >
            {card.aiPriority}
          </span>
          <span className="rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-muted-foreground">
            {card.ageingLabel}
          </span>
        </div>
      </div>

      <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
        {card.product} · {card.loanAmountLabel}
      </p>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
        <span className={cn("font-medium", momentumClass)}>{card.momentumLabel}</span>
        <span className="text-muted-foreground">Last · {card.lastActivityLabel}</span>
      </div>

      <div className="mt-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Waiting On
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-foreground">
          <span className="mr-1" aria-hidden>
            {card.waitingOn.emoji}
          </span>
          {card.waitingOn.label}
        </p>
      </div>

      <div
        className={cn("mt-2 rounded-md border px-2 py-1.5", workspaceTone)}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        role="presentation"
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] opacity-80">
          Next Workspace
        </p>
        <p className="mt-0.5 text-[11px] font-semibold">
          <span className="mr-1" aria-hidden>
            {card.nextWorkspace.emoji}
          </span>
          {card.nextWorkspace.label}
        </p>
      </div>

      {card.activeLenders.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {card.activeLenders.map((l) => (
            <li
              key={`${card.id}-${l.lender}`}
              className="flex items-center justify-between gap-2 text-[10px]"
            >
              <span className="truncate font-medium text-foreground">{l.lender}</span>
              <span className="shrink-0 text-muted-foreground">{l.stageLabel}</span>
            </li>
          ))}
          {card.extraActiveLenders > 0 ? (
            <li className="text-[10px] font-medium text-teal-700 dark:text-teal-300">
              +{card.extraActiveLenders} Active
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-2 text-[10px] leading-snug text-amber-800/90 dark:text-amber-200/90">
          {card.lendersInsight}
        </p>
      )}

      <div className="mt-2.5 rounded-md border border-violet-500/20 bg-violet-500/[0.06] px-2 py-1.5">
        <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-800 dark:text-violet-200">
          <Sparkles className="h-3 w-3" aria-hidden />
          CHANAKYA Says
        </p>
        <p className="mt-1 text-[11px] leading-snug text-foreground/90">{card.chanakyaSays}</p>
      </div>

      <div className="mt-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Why?
        </p>
        <ul className="mt-1 space-y-0.5">
          {card.why.map((w) => (
            <li key={w} className="text-[11px] leading-snug text-foreground/85">
              · {w}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-200">
          CHANAKYA Recommends
        </p>
        <ul className="mt-1 space-y-0.5">
          {card.recommends.map((r) => (
            <li key={r} className="text-[11px] leading-snug text-foreground/85">
              → {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-2 rounded-md border border-teal-500/20 bg-teal-500/[0.05] px-2 py-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-200">
          Expected Outcome
        </p>
        <p className="mt-1 text-[11px] leading-snug text-foreground/90">{card.expectedOutcome}</p>
      </div>

      <p className="mt-2.5 text-[9px] text-muted-foreground">
        Confidence{" "}
        <span className="font-semibold tabular-nums text-foreground/80">{card.confidence}%</span>
      </p>
    </article>
  );
}
