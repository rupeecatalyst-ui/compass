"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { Button } from "@/components/ui/button";
import {
  CHANAKYA_RADAR_COLUMNS,
  CHANAKYA_RADAR_OFFICIAL_NAME,
  CHANAKYA_RADAR_STATUS_LINE,
  CHANAKYA_RADAR_WORKSPACES,
  type ChanakyaDealHealthId,
} from "@/constants/chanakya-radar";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import {
  groupRadarCardsByHealth,
  listChanakyaRadarCards,
  summarizeRadarHealth,
  type ChanakyaRadarCard,
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
 * CHANAKYA Radar — AI Deal Health Board (Sprint 2).
 * Kanban only. Cards are never draggable. Classification is CHANAKYA-owned.
 */
export function ChanakyaRadarWorkspace() {
  const router = useRouter();
  const [tick, setTick] = useState(0);

  const cards = useMemo(() => {
    void tick;
    return listChanakyaRadarCards(loadLoanFiles());
  }, [tick]);

  const groups = useMemo(() => groupRadarCardsByHealth(cards), [cards]);
  const summary = useMemo(() => summarizeRadarHealth(cards), [cards]);

  return (
    <div className="flex h-[calc(100dvh-4.5rem)] flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-3">
        <PageHeader
          title={CHANAKYA_RADAR_OFFICIAL_NAME}
          description={CHANAKYA_RADAR_STATUS_LINE}
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setTick((t) => t + 1)}
            >
              <Radar className="h-3.5 w-3.5" />
              Refresh intelligence
            </Button>
          }
        />

        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {summary.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {s.label}
              </p>
              <p
                className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
                style={{ color: s.tone }}
              >
                {s.count}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1">
        {CHANAKYA_RADAR_COLUMNS.map((col) => {
          const items = groups[col.id] ?? [];
          return (
            <section
              key={col.id}
              className="flex h-full w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/15"
              aria-label={`${col.label} deals`}
            >
              <header
                className={cn(
                  "flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3",
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

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 pt-2 scrollbar-thin">
                {items.map((card) => (
                  <RadarCard
                    key={card.id}
                    card={card}
                    health={col.id}
                    onOpen={() => openActiveWorkspace(router, card)}
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
      {/* Identity */}
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

      {/* Waiting On */}
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

      {/* Next Workspace */}
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

      {/* Active lenders */}
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

      {/* CHANAKYA Says */}
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
