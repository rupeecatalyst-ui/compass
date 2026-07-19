"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Columns3, Radar, X } from "lucide-react";
import { ChanakyaRadarActionTable } from "@/components/catalyst-one/chanakya-radar/chanakya-radar-action-table";
import {
  ChanakyaRadarKanban,
  groupRadarCardsForKanban,
} from "@/components/catalyst-one/chanakya-radar/chanakya-radar-kanban";
import { ChanakyaRadarOpportunityPreview } from "@/components/catalyst-one/chanakya-radar/chanakya-radar-opportunity-preview";
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
  mapLoanFileToRadarCard,
  type ChanakyaRadarCard,
} from "@/lib/chanakya-radar";
import {
  defaultRadarScope,
  filterFilesByRadarScope,
  resolveRadarActorName,
} from "@/lib/chanakya-radar/portfolio-scope";
import { rememberChanakyaRadarViewState } from "@/lib/chanakya-radar/view-state";
import type { LoanFile } from "@/types/catalyst-one";
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
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
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

  const selectedPreview = useMemo(() => {
    if (!selectedFileId) return null;
    const file = scopedFiles.find((f) => f.id === selectedFileId);
    if (!file) return null;
    return { card: mapLoanFileToRadarCard(file), file };
  }, [selectedFileId, scopedFiles]);

  const setOpportunityContext = useCallback((file: LoanFile, card: ChanakyaRadarCard) => {
    setActiveOpportunityContext({
      fileId: file.id,
      opportunityId: card.opportunityNumber,
      customerName: card.borrower,
      product: card.product,
      label: card.opportunityNumber,
    });
  }, []);

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

  const handleBlipClick = useCallback((row: ChanakyaRadarDealRow) => {
    setSelectedFileId(row.fileId);
  }, []);

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      {/* Executive summary — fluid, workflow-first (Enterprise Screen UX) */}
      <section className="flex flex-col gap-2.5 p-3 md:gap-3 md:p-4">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-1.5">
              <Radar className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight md:text-lg">
                {CHANAKYA_RADAR_OFFICIAL_NAME}
              </h1>
              <p className="text-[11px] text-muted-foreground">{CHANAKYA_RADAR_STATUS_LINE}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Scope
            </span>
            <Select
              value={scope}
              onValueChange={(v) => setScope(v as ChanakyaRadarScopeId)}
            >
              <SelectTrigger className="h-7 w-[160px] rounded-md text-[11px]">
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

        <div className="grid shrink-0 grid-cols-2 gap-1.5 lg:grid-cols-4">
          {model.kpis.map((kpi) => {
            const active = kanbanFocus === kpi.id;
            return (
              <button
                key={kpi.id}
                type="button"
                onClick={() => handleQuadrantClick(kpi.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-left transition-colors",
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
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold tabular-nums md:text-xl">{kpi.count}</span>
                  <span className="text-[11px] text-muted-foreground">{kpi.percentage}%</span>
                  <span
                    className={cn(
                      "ml-auto text-[10px] tabular-nums",
                      kpi.dailyMovement > 0 && "text-emerald-400",
                      kpi.dailyMovement < 0 && "text-rose-400",
                      kpi.dailyMovement === 0 && "text-muted-foreground",
                    )}
                  >
                    {kpi.dailyMovement > 0 ? "+" : ""}
                    {kpi.dailyMovement}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(300px,0.95fr)_minmax(320px,1.05fr)] xl:items-stretch">
          <section className="flex min-h-0 flex-col rounded-lg border border-zinc-700 bg-zinc-950/60 p-2.5 md:p-3">
            <p className="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Operational Radar
            </p>
            <div className="mx-auto w-full min-h-0 max-h-[min(48vh,440px)] flex-1 xl:max-h-[min(52vh,520px)]">
              <ChanakyaRadarVisual
                vector={model.vector}
                rows={model.rows}
                activeQuadrant={kanbanFocus}
                onQuadrantClick={handleQuadrantClick}
                selectedRowId={selectedFileId}
                onBlipClick={handleBlipClick}
                hoverSummary={model.hoverSummary}
              />
            </div>
            <div className="mt-2 shrink-0 rounded-md border border-zinc-700/80 bg-zinc-900/30 px-2.5 py-1.5 text-[11px] md:text-[12px]">
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
          </section>

          <div className="min-h-[280px] xl:min-h-0">
            <ChanakyaRadarOpportunityPreview
              preview={selectedPreview}
              onClear={() => setSelectedFileId(null)}
              onOpenWorkspace={() => {
                if (!selectedPreview) return;
                setOpportunityContext(selectedPreview.file, selectedPreview.card);
                router.push(
                  buildJourneyHref(ROUTES.OPPORTUNITY_WORKSPACE, {
                    fileId: selectedPreview.file.id,
                    opportunityId: selectedPreview.card.opportunityNumber,
                  }),
                );
              }}
              onOpenTimeline={() => {
                if (!selectedPreview) return;
                setOpportunityContext(selectedPreview.file, selectedPreview.card);
                router.push(
                  buildJourneyHref(ROUTES.LOAN_FILES, {
                    fileId: selectedPreview.file.id,
                    opportunityId: selectedPreview.card.opportunityNumber,
                    tab: "timeline",
                  }),
                );
              }}
              onAddFollowUp={() => {
                if (!selectedPreview) return;
                setOpportunityContext(selectedPreview.file, selectedPreview.card);
                router.push(
                  buildJourneyHref(ROUTES.LOAN_FILES, {
                    fileId: selectedPreview.file.id,
                    opportunityId: selectedPreview.card.opportunityNumber,
                    tab: "tasks",
                  }),
                );
              }}
              onCallCustomer={() => {
                const mobile = selectedPreview?.file.customerMobile?.trim();
                if (!mobile) return;
                window.location.href = `tel:${mobile.replace(/\s+/g, "")}`;
              }}
              onViewDocuments={() => {
                if (!selectedPreview) return;
                setOpportunityContext(selectedPreview.file, selectedPreview.card);
                router.push(
                  buildJourneyHref(ROUTES.DOCUMENT_CENTER, {
                    fileId: selectedPreview.file.id,
                    opportunityId: selectedPreview.card.opportunityNumber,
                  }),
                );
              }}
            />
          </div>
        </div>

        {/* Intelligence + action table — same band so table stays in primary workflow */}
        <section className="grid shrink-0 gap-2.5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Today&apos;s Operational Intelligence
              </p>
              <div className="flex flex-wrap gap-1">
                {CHANAKYA_RADAR_QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="h-6 rounded-full border border-zinc-600 bg-zinc-900/60 px-2 text-[10px] font-medium text-muted-foreground transition-colors hover:border-zinc-500 hover:text-foreground"
                    onClick={() => {
                      setActionTab(a.tab);
                      if (a.tab === "at_risk") handleQuadrantClick("at_risk");
                      else if (a.tab === "follow_up_today") {
                        handleQuadrantClick("follow_up_required");
                      }
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {model.intelligence.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-zinc-700/80 bg-zinc-900/40 px-2 py-1.5"
                >
                  <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-base font-semibold tabular-nums md:text-lg",
                      item.tone === "danger" && "text-rose-400",
                      item.tone === "warning" && "text-amber-400",
                      item.tone === "success" && "text-emerald-400",
                      item.tone === "info" && "text-sky-400",
                    )}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap gap-1">
              {CHANAKYA_RADAR_ACTION_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActionTab(tab.id)}
                  className={cn(
                    "h-6 rounded-full px-2.5 text-[10px] font-medium transition-colors",
                    actionTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-zinc-600 text-muted-foreground hover:border-zinc-500 hover:text-foreground",
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

        <p className="shrink-0 text-center text-[11px] text-muted-foreground">
          Click a radar dot to preview · click a quadrant or KPI to filter Kanban
        </p>
      </section>

      {/* Operational Kanban — natural continuation; page remains scrollable */}
      <section
        ref={kanbanRef}
        className="border-t border-zinc-700 bg-background px-3 py-4 md:px-4"
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
