"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Columns3,
  Moon,
  Percent,
  Radar,
  RefreshCw,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  canUseRadarScope,
  CHANAKYA_RADAR_OFFICIAL_NAME,
  CHANAKYA_RADAR_QUADRANTS,
  CHANAKYA_RADAR_SCOPES,
  type ChanakyaOperationalQuadrantId,
  type ChanakyaRadarScopeId,
} from "@/constants/chanakya-radar";
import { ROUTES } from "@/constants/routes";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { loadLoanFiles } from "@/lib/loan-files-storage";
import { subscribeLoanFilesUpdated } from "@/lib/loan-data-sync";
import {
  buildChanakyaRadarDashboard,
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
import type { LucideIcon } from "lucide-react";

type WorkspaceTab = "radar" | "kanban";

type SnapshotKpiId =
  | "total"
  | "on_track"
  | "needs_attention"
  | "at_risk"
  | "dormant"
  | "avg_health"
  | "conversion";

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

function filterRowsForSnapshot(
  rows: ChanakyaRadarDealRow[],
  id: SnapshotKpiId,
): ChanakyaRadarDealRow[] {
  switch (id) {
    case "total":
    case "avg_health":
      return rows;
    case "on_track":
      return rows.filter((r) => r.quadrant === "on_track");
    case "needs_attention":
      return rows.filter((r) => r.quadrant === "needs_attention");
    case "at_risk":
      return rows.filter((r) => r.quadrant === "at_risk");
    case "dormant":
      return rows.filter((r) => r.idleDays >= 7 || r.quadrant === "follow_up_required");
    case "conversion":
      return rows.filter((r) => r.quadrant === "on_track");
    default:
      return rows;
  }
}

/** Decorative sparkline — visual only, derived from existing percentage/movement. */
function MiniSpark({
  seed,
  tone,
}: {
  seed: number;
  tone: string;
}) {
  const points = useMemo(() => {
    const vals = [0.35, 0.45, 0.4, 0.55, 0.5, 0.62, 0.58, 0.7].map(
      (v, i) => v + ((seed + i * 13) % 17) / 100,
    );
    return vals
      .map((v, i) => `${(i / (vals.length - 1)) * 40},${18 - v * 14}`)
      .join(" ");
  }, [seed]);

  return (
    <svg width="40" height="18" viewBox="0 0 40 18" className="shrink-0 opacity-80" aria-hidden>
      <polyline
        fill="none"
        stroke={tone}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/**
 * CO-SPRINT-103 UI redesign — Mission Control (reference-aligned).
 * Tabs: Radar View | Kanban View. Business logic unchanged.
 */
export function ChanakyaRadarWorkspace() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [tick, setTick] = useState(0);
  const [scope, setScope] = useState<ChanakyaRadarScopeId>(() =>
    defaultRadarScope(user?.role),
  );
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("radar");
  const [radarFocus, setRadarFocus] = useState<ChanakyaOperationalQuadrantId | null>(null);
  const [expandedKpi, setExpandedKpi] = useState<SnapshotKpiId | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
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
    const bump = () => setTick((t) => t + 1);
    const unsubscribe = subscribeLoanFilesUpdated(bump);
    window.addEventListener("storage", bump);
    const id = window.setInterval(bump, 60_000);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", bump);
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
    return {
      card: mapLoanFileToRadarCard(file),
      file,
      portfolioHealthScore: model.vector.healthScore,
    };
  }, [selectedFileId, scopedFiles, model.vector.healthScore]);

  const kpiById = useMemo(() => {
    const map = Object.fromEntries(model.kpis.map((k) => [k.id, k])) as Record<
      ChanakyaOperationalQuadrantId,
      (typeof model.kpis)[number]
    >;
    return map;
  }, [model.kpis]);

  const dormantCount = useMemo(
    () =>
      model.rows.filter((r) => r.idleDays >= 7 || r.quadrant === "follow_up_required").length,
    [model.rows],
  );

  const conversionPct = useMemo(() => {
    const total = model.activeCount || 1;
    const onTrack = kpiById.on_track?.count ?? 0;
    return Math.round((onTrack / total) * 100);
  }, [model.activeCount, kpiById.on_track?.count]);

  const snapshotKpis: {
    id: SnapshotKpiId;
    label: string;
    value: string | number;
    pct?: number;
    tone: string;
    icon: LucideIcon;
  }[] = [
    {
      id: "total",
      label: "Total Opportunities",
      value: model.activeCount,
      pct: 100,
      tone: "#22C55E",
      icon: Target,
    },
    {
      id: "on_track",
      label: "On Track",
      value: kpiById.on_track?.count ?? 0,
      pct: kpiById.on_track?.percentage,
      tone: "#22C55E",
      icon: TrendingUp,
    },
    {
      id: "needs_attention",
      label: "Needs Attention",
      value: kpiById.needs_attention?.count ?? 0,
      pct: kpiById.needs_attention?.percentage,
      tone: "#FB923C",
      icon: Activity,
    },
    {
      id: "at_risk",
      label: "At Risk",
      value: kpiById.at_risk?.count ?? 0,
      pct: kpiById.at_risk?.percentage,
      tone: "#EF4444",
      icon: AlertTriangle,
    },
    {
      id: "dormant",
      label: "Dormant",
      value: dormantCount,
      pct: model.activeCount
        ? Math.round((dormantCount / model.activeCount) * 100)
        : 0,
      tone: "#94A3B8",
      icon: Moon,
    },
    {
      id: "avg_health",
      label: "Avg Health Score",
      value: `${model.vector.healthScore}/100`,
      pct: model.vector.healthScore,
      tone: "#A78BFA",
      icon: Activity,
    },
    {
      id: "conversion",
      label: "Conversion %",
      value: `${conversionPct}%`,
      pct: conversionPct,
      tone: "#38BDF8",
      icon: Percent,
    },
  ];

  const expandedRows = useMemo(() => {
    if (!expandedKpi) return [];
    return filterRowsForSnapshot(model.rows, expandedKpi);
  }, [expandedKpi, model.rows]);

  const selectedIndexInList = useMemo(() => {
    if (!selectedFileId || expandedRows.length === 0) return null;
    const idx = expandedRows.findIndex((r) => r.fileId === selectedFileId);
    return idx >= 0 ? idx + 1 : null;
  }, [selectedFileId, expandedRows]);

  const setOpportunityContext = useCallback((file: LoanFile, card: ChanakyaRadarCard) => {
    setActiveOpportunityContext({
      fileId: file.id,
      opportunityId: card.opportunityNumber,
      customerName: card.borrower,
      product: card.product,
      label: card.opportunityNumber,
    });
  }, []);

  const handleQuadrantClick = useCallback((id: ChanakyaOperationalQuadrantId) => {
    setRadarFocus((prev) => (prev === id ? null : id));
    const map: Partial<Record<ChanakyaOperationalQuadrantId, SnapshotKpiId>> = {
      on_track: "on_track",
      needs_attention: "needs_attention",
      at_risk: "at_risk",
      follow_up_required: "dormant",
    };
    const snap = map[id];
    if (snap) setExpandedKpi((prev) => (prev === snap ? null : snap));
  }, []);

  const handleKpiClick = useCallback((id: SnapshotKpiId) => {
    setExpandedKpi((prev) => (prev === id ? null : id));
    const qMap: Partial<Record<SnapshotKpiId, ChanakyaOperationalQuadrantId>> = {
      on_track: "on_track",
      needs_attention: "needs_attention",
      at_risk: "at_risk",
      dormant: "follow_up_required",
    };
    setRadarFocus(qMap[id] ?? null);
  }, []);

  const handleBlipClick = useCallback((row: ChanakyaRadarDealRow) => {
    setSelectedFileId(row.fileId);
  }, []);

  const handleBlipDoubleClick = useCallback(
    (row: ChanakyaRadarDealRow) => {
      openOpportunityWorkspace(router, row);
    },
    [router],
  );

  const drawerOpen = Boolean(selectedPreview);

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-zinc-950/30">
      <div className="flex flex-col gap-3 p-3 md:gap-4 md:p-4">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-1.5">
                <Radar className="h-4 w-4 text-emerald-400" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight md:text-xl">
                {CHANAKYA_RADAR_OFFICIAL_NAME} Workspace
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            </div>
            <p className="max-w-xl text-[12px] leading-snug text-muted-foreground md:text-[13px]">
              Real-time portfolio intelligence. Focus on what matters. Take action. Move forward.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={scope}
              onValueChange={(v) => setScope(v as ChanakyaRadarScopeId)}
            >
              <SelectTrigger className="h-8 w-[150px] rounded-md border-zinc-700 bg-zinc-900/80 text-[11px]">
                <SelectValue placeholder="Scope" />
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-zinc-700 text-[11px]"
              onClick={() => setTick((t) => t + 1)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </header>

        {/* Workspace tabs — preserve scope / KPI / selection across switch */}
        <div
          className="flex w-fit gap-1 rounded-lg border border-zinc-700 bg-zinc-900/60 p-1"
          role="tablist"
          aria-label="Workspace view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={workspaceTab === "radar"}
            onClick={() => setWorkspaceTab("radar")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
              workspaceTab === "radar"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-muted-foreground hover:bg-zinc-800 hover:text-foreground",
            )}
          >
            <Radar className="h-3.5 w-3.5" />
            Radar View
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceTab === "kanban"}
            onClick={() => setWorkspaceTab("kanban")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
              workspaceTab === "kanban"
                ? "bg-violet-600 text-white shadow-sm"
                : "text-muted-foreground hover:bg-zinc-800 hover:text-foreground",
            )}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Kanban View
          </button>
        </div>

        {workspaceTab === "radar" ? (
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,22%)_minmax(0,1fr)] lg:items-start">
            {/* ZONE 1 — Operational Snapshot (independently scrollable) */}
            <aside className="flex max-h-none flex-col gap-2 rounded-xl border border-zinc-700/90 bg-zinc-950/80 p-2.5 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
              <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Operational Snapshot
              </p>
              <div className="flex flex-col gap-1.5">
                {snapshotKpis.map((kpi) => {
                  const active = expandedKpi === kpi.id;
                  const Icon = kpi.icon;
                  return (
                    <button
                      key={kpi.id}
                      type="button"
                      onClick={() => handleKpiClick(kpi.id)}
                      className={cn(
                        "rounded-lg border px-2.5 py-2 text-left transition-all",
                        active
                          ? "border-violet-500/50 bg-violet-500/10 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-900",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: `${kpi.tone}22`, color: kpi.tone }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {kpi.label}
                            </span>
                            <MiniSpark
                              seed={typeof kpi.value === "number" ? kpi.value : kpi.pct ?? 0}
                              tone={kpi.tone}
                            />
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-1.5">
                            <span className="text-xl font-semibold tabular-nums leading-none tracking-tight">
                              {kpi.value}
                            </span>
                            {kpi.pct != null && kpi.id !== "avg_health" && kpi.id !== "conversion" ? (
                              <span className="text-[10px] tabular-nums text-muted-foreground">
                                {kpi.pct}%
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {expandedKpi ? (
                <div className="mt-1 flex min-h-0 flex-col rounded-lg border border-zinc-700/80 bg-zinc-900/50">
                  <div className="flex shrink-0 items-center justify-between border-b border-zinc-700/60 px-2.5 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/90">
                      {snapshotKpis.find((k) => k.id === expandedKpi)?.label} ({expandedRows.length})
                    </p>
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => setExpandedKpi(null)}
                    >
                      Collapse
                    </button>
                  </div>
                  <ul className="max-h-[min(42vh,380px)] space-y-0.5 overflow-y-auto overscroll-contain p-1.5">
                    {expandedRows.length === 0 ? (
                      <li className="px-2 py-4 text-center text-[11px] text-muted-foreground">
                        No opportunities in this view
                      </li>
                    ) : (
                      expandedRows.map((row) => (
                        <li key={row.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedFileId(row.fileId)}
                            onDoubleClick={() => openOpportunityWorkspace(router, row)}
                            className={cn(
                              "flex w-full items-start justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900",
                              selectedFileId === row.fileId &&
                                "border-violet-500/40 bg-violet-500/10",
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-medium">{row.borrower}</p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {row.product} · {row.stageLabel}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                              {row.daysInStage}d
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ) : null}
            </aside>

            {/* ZONE 2 — Hero Radar */}
            <section className="flex min-w-0 flex-col rounded-xl border border-zinc-700/90 bg-zinc-950/80 p-3 md:p-5">
              <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Operational Radar
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Click preview · Double-click open workspace · {model.activeCount} opportunities
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <span className="text-muted-foreground">
                    Direction{" "}
                    <span className="font-medium text-emerald-300">{model.vector.direction}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Trend{" "}
                    <span
                      className={cn(
                        "font-medium",
                        model.vector.trend === "Improving" && "text-emerald-400",
                        model.vector.trend === "Declining" && "text-rose-400",
                        model.vector.trend === "Stable" && "text-foreground",
                      )}
                    >
                      {model.vector.trend}
                    </span>
                  </span>
                </div>
              </div>

              <div className="mx-auto w-full flex-1 py-2 md:py-3">
                <ChanakyaRadarVisual
                  vector={model.vector}
                  rows={model.rows}
                  activeQuadrant={radarFocus}
                  onQuadrantClick={handleQuadrantClick}
                  selectedRowId={selectedFileId}
                  onBlipClick={handleBlipClick}
                  onBlipDoubleClick={handleBlipDoubleClick}
                  hoverSummary={model.hoverSummary}
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {model.intelligence.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-2"
                  >
                    <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-lg font-semibold tabular-nums",
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
            </section>
          </div>
        ) : (
          /* Kanban View — primary workspace */
          <section className="rounded-xl border border-zinc-700/90 bg-zinc-950/80 p-3 md:p-4">
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
              {radarFocus ? (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground">
                    Focus{" "}
                    <span className="font-medium text-foreground">
                      {CHANAKYA_RADAR_QUADRANTS.find((q) => q.id === radarFocus)?.label}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => setRadarFocus(null)}
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              ) : null}
            </div>
            <ChanakyaRadarKanban
              groups={kanbanGroups}
              healthFocus={radarFocus}
              columnRefs={columnRefs}
              onOpen={(card) => openActiveWorkspace(router, card)}
            />
          </section>
        )}
      </div>

      {/* ZONE 3 — Slide-over Opportunity Preview (never shrinks Radar layout) */}
      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedFileId(null);
        }}
      >
        <SheetContent
          side="right"
          allowOutsideClose
          overlayClassName="bg-black/45"
          className="flex w-[min(35vw,440px)] max-w-[min(35vw,440px)] flex-col gap-0 overflow-hidden border-l border-zinc-700 p-0 sm:max-w-[min(35vw,440px)]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Opportunity Preview</SheetTitle>
            <SheetDescription>
              Selected opportunity summary from CHANAKYA Radar
            </SheetDescription>
          </SheetHeader>
          {selectedPreview ? (
            <ChanakyaRadarOpportunityPreview
              preview={selectedPreview}
              variant="drawer"
              listPosition={
                selectedIndexInList && expandedRows.length
                  ? { index: selectedIndexInList, total: expandedRows.length }
                  : undefined
              }
              onClear={() => setSelectedFileId(null)}
              onOpenWorkspace={() => {
                setOpportunityContext(selectedPreview.file, selectedPreview.card);
                router.push(
                  buildJourneyHref(ROUTES.OPPORTUNITY_WORKSPACE, {
                    fileId: selectedPreview.file.id,
                    opportunityId: selectedPreview.card.opportunityNumber,
                  }),
                );
              }}
              onOpenTimeline={() => {
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
                const mobile = selectedPreview.file.customerMobile?.trim();
                if (!mobile) return;
                window.location.href = `tel:${mobile.replace(/\s+/g, "")}`;
              }}
              onViewDocuments={() => {
                setOpportunityContext(selectedPreview.file, selectedPreview.card);
                router.push(
                  buildJourneyHref(ROUTES.DOCUMENT_CENTER, {
                    fileId: selectedPreview.file.id,
                    opportunityId: selectedPreview.card.opportunityNumber,
                  }),
                );
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
