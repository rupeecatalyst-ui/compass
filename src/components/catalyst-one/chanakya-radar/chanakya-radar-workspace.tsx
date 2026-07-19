"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Columns3, Radar, X } from "lucide-react";
import { ChanakyaRadarActionTable } from "@/components/catalyst-one/chanakya-radar/chanakya-radar-action-table";
import {
  ChanakyaRadarKanban,
  groupRadarCardsForKanban,
} from "@/components/catalyst-one/chanakya-radar/chanakya-radar-kanban";
import { ChanakyaRadarVisual } from "@/components/catalyst-one/chanakya-radar/chanakya-radar-visual";
import { useAuthContext } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  canUseRadarScope,
  CHANAKYA_RADAR_ACTION_TABS,
  CHANAKYA_RADAR_OFFICIAL_NAME,
  CHANAKYA_RADAR_QUADRANTS,
  CHANAKYA_RADAR_QUICK_ACTIONS,
  CHANAKYA_RADAR_SCOPES,
  CHANAKYA_RADAR_STATUS_LINE,
  type ChanakyaOperationalQuadrantId,
  type ChanakyaRadarActionTabId,
  type ChanakyaRadarScopeId,
} from "@/constants/chanakya-radar";
import { ROUTES } from "@/constants/routes";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import {
  buildChanakyaRadarDashboard,
  filterRowsByActionTab,
  type ChanakyaRadarDealRow,
} from "@/lib/chanakya-radar/derive-dashboard";
import {
  filterChanakyaRadarCards,
  listChanakyaRadarCards,
  type ChanakyaRadarCard,
} from "@/lib/chanakya-radar";
import {
  defaultRadarScope,
  filterFilesByRadarScope,
  resolveRadarActorName,
} from "@/lib/chanakya-radar/portfolio-scope";
import { rememberChanakyaRadarViewState } from "@/lib/chanakya-radar/view-state";
import { cn } from "@/lib/utils";

function openOpportunityWorkspace(
  router: ReturnType<typeof useRouter>,
  row: ChanakyaRadarDealRow,
) {
  setActiveOpportunityContext({
    fileId: row.fileId,
    opportunityId: row.dealId,
    customerName: row.borrower,
    product: row.product,
    label: row.dealId,
  });
  router.push(
    buildJourneyHref(ROUTES.OPPORTUNITY_WORKSPACE, {
      fileId: row.fileId,
      opportunityId: row.dealId,
    }),
  );
}

/** CHANAKYA opens the Active Workspace for this deal — restored Kanban behaviour. */
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
 * CO-SPRINT-100 / 100A — CHANAKYA Radar Operational Intelligence + restored Kanban.
 */
export function ChanakyaRadarWorkspace() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [tick, setTick] = useState(0);
  const [scope, setScope] = useState<ChanakyaRadarScopeId>(() =>
    defaultRadarScope(user?.role),
  );
  const [kanbanFocus, setKanbanFocus] = useState<ChanakyaOperationalQuadrantId | null>(
    null,
  );
  const [actionTab, setActionTab] = useState<ChanakyaRadarActionTabId>("at_risk");
  const kanbanRef = useRef<HTMLElement | null>(null);
  const columnRefs = useRef<
    Partial<Record<ChanakyaOperationalQuadrantId, HTMLElement | null>>
  >({});

  useEffect(() => {
    setScope((prev) => (canUseRadarScope(prev, user?.role) ? prev : defaultRadarScope(user?.role)));
  }, [user?.role]);

  useEffect(() => {
    rememberChanakyaRadarViewState({
      view: "dashboard",
      filters: {
        relationshipManager: "all",
        product: "all",
        source: "all",
      },
    });
  }, [scope]);

  useEffect(() => {
    const onStorage = () => setTick((t) => t + 1);
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, []);

  const actorRm = resolveRadarActorName(user);

  const scopedFiles = useMemo(() => {
    void tick;
    return filterFilesByRadarScope(loadLoanFiles(), scope, {
      actorRm,
      role: user?.role,
    });
  }, [tick, scope, actorRm, user?.role]);

  const model = useMemo(() => buildChanakyaRadarDashboard(scopedFiles), [scopedFiles]);

  const tabRows = useMemo(
    () => filterRowsByActionTab(model.rows, actionTab, scopedFiles),
    [model.rows, actionTab, scopedFiles],
  );

  const kanbanCards = useMemo(() => {
    const cards = listChanakyaRadarCards(scopedFiles);
    return filterChanakyaRadarCards(cards, {
      relationshipManager: "all",
      product: "all",
      source: "all",
    });
  }, [scopedFiles]);

  const kanbanGroups = useMemo(
    () => groupRadarCardsForKanban(kanbanCards),
    [kanbanCards],
  );

  const scrollToKanban = useCallback(() => {
    requestAnimationFrame(() => {
      kanbanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  /** Dashboard → Kanban: select category and navigate to operational board. */
  const handleQuadrantClick = useCallback(
    (id: ChanakyaOperationalQuadrantId) => {
      setKanbanFocus(id);
      if (id === "at_risk") setActionTab("at_risk");
      if (id === "follow_up_required") setActionTab("follow_up_today");
      scrollToKanban();
    },
    [scrollToKanban],
  );

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      {/* Executive summary — ~one viewport */}
      <section className="flex min-h-[calc(100vh-3.5rem)] flex-col gap-3 p-3 md:p-4">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="mt-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-1.5">
              <Radar className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight md:text-lg">
                {CHANAKYA_RADAR_OFFICIAL_NAME}
              </h1>
              <p className="text-[11px] text-muted-foreground">{CHANAKYA_RADAR_STATUS_LINE}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Scope
            </span>
            <Select
              value={scope}
              onValueChange={(v) => setScope(v as ChanakyaRadarScopeId)}
            >
              <SelectTrigger className="h-8 w-[180px] rounded-md text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANAKYA_RADAR_SCOPES.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    disabled={!canUseRadarScope(s.id, user?.role)}
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
          {model.kpis.map((kpi) => {
            const active = kanbanFocus === kpi.id;
            return (
              <button
                key={kpi.id}
                type="button"
                onClick={() => handleQuadrantClick(kpi.id)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : "border-zinc-700 bg-zinc-950/50 hover:bg-zinc-900",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {kpi.label}
                  </span>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: kpi.tone }}
                  />
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-semibold tabular-nums">{kpi.count}</span>
                  <span className="text-[11px] text-muted-foreground">{kpi.percentage}%</span>
                </div>
                <p
                  className={cn(
                    "mt-0.5 text-[11px] tabular-nums",
                    kpi.dailyMovement > 0 && "text-emerald-400",
                    kpi.dailyMovement < 0 && "text-rose-400",
                    kpi.dailyMovement === 0 && "text-muted-foreground",
                  )}
                >
                  {kpi.dailyMovement > 0 ? "+" : ""}
                  {kpi.dailyMovement} today
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(280px,420px)_1fr]">
          <section className="rounded-lg border border-zinc-700 bg-zinc-950/60 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Operational Radar
            </p>
            <ChanakyaRadarVisual
              vector={model.vector}
              rows={model.rows}
              activeQuadrant={kanbanFocus}
              onQuadrantClick={handleQuadrantClick}
              hoverSummary={model.hoverSummary}
            />
          </section>

          <section className="flex min-h-0 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Today&apos;s Operational Intelligence
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CHANAKYA_RADAR_QUICK_ACTIONS.map((a) => (
                  <Button
                    key={a.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md text-[11px]"
                    onClick={() => {
                      setActionTab(a.tab);
                      if (a.tab === "at_risk") handleQuadrantClick("at_risk");
                      else if (a.tab === "follow_up_today") {
                        handleQuadrantClick("follow_up_required");
                      } else if (a.tab === "document_pending") {
                        setActionTab(a.tab);
                      } else {
                        setActionTab(a.tab);
                      }
                    }}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {model.intelligence.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-zinc-700/80 bg-zinc-900/40 px-2.5 py-2"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-lg font-semibold tabular-nums",
                      item.tone === "danger" && "text-rose-400",
                      item.tone === "warning" && "text-amber-400",
                      item.tone === "success" && "text-emerald-400",
                      item.tone === "info" && "text-sky-400",
                    )}
                  >
                    {item.value}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{item.hint}</p>
                </div>
              ))}
            </div>

            <div className="mt-1 rounded-md border border-zinc-700/80 bg-zinc-900/30 px-3 py-2 text-[12px]">
              <span className="text-muted-foreground">Direction </span>
              <span className="font-medium text-emerald-300">{model.vector.direction}</span>
              <span className="mx-2 text-zinc-600">·</span>
              <span className="text-muted-foreground">Health </span>
              <span className="font-medium tabular-nums">{model.vector.healthScore}/100</span>
              <span className="mx-2 text-zinc-600">·</span>
              <span className="text-muted-foreground">Concern </span>
              <span className="font-medium text-amber-300">
                {
                  CHANAKYA_RADAR_QUADRANTS.find((q) => q.id === model.vector.largestConcern)
                    ?.label
                }
              </span>
            </div>

            <div className="mt-auto space-y-2 pt-2">
              <div className="flex flex-wrap gap-1 border-b border-zinc-700 pb-1.5">
                {CHANAKYA_RADAR_ACTION_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActionTab(tab.id)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                      actionTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <ChanakyaRadarActionTable
                rows={tabRows}
                onOpen={(row) => openOpportunityWorkspace(router, row)}
              />
            </div>
          </section>
        </div>

        <p className="shrink-0 pt-1 text-center text-[11px] text-muted-foreground">
          Scroll for Operational Kanban · click a quadrant or KPI to filter the board
        </p>
      </section>

      {/* Operational Kanban — restored below the radar dashboard */}
      <section
        ref={kanbanRef}
        className="min-h-[min(75vh,800px)] border-t border-zinc-700 bg-background px-3 py-4 md:px-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Columns3 className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Operational Kanban</h2>
              <p className="text-[11px] text-muted-foreground">
                Work queue by operational health · open a card to continue in Active Workspace
              </p>
            </div>
          </div>
          {kanbanFocus ? (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground">
                Focus{" "}
                <span className="font-medium text-foreground">
                  {CHANAKYA_RADAR_QUADRANTS.find((q) => q.id === kanbanFocus)?.label}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                onClick={() => setKanbanFocus(null)}
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            </div>
          ) : null}
        </div>
        <ChanakyaRadarKanban
          groups={kanbanGroups}
          healthFocus={kanbanFocus}
          columnRefs={columnRefs}
          onOpen={(card) => openActiveWorkspace(router, card)}
        />
      </section>
    </div>
  );
}
