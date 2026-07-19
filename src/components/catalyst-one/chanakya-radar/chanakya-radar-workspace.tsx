"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Columns3, Radar, X } from "lucide-react";
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
  CHANAKYA_RADAR_STATUS_LINE,
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

/**
 * CO-SPRINT-103 — CHANAKYA Radar Mission Control cockpit.
 * Zone 1 snapshot · Zone 2 hero Radar · Zone 3 slide-over preview.
 */
export function ChanakyaRadarWorkspace() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [tick, setTick] = useState(0);
  const [scope, setScope] = useState<ChanakyaRadarScopeId>(() =>
    defaultRadarScope(user?.role),
  );
  const [radarFocus, setRadarFocus] = useState<ChanakyaOperationalQuadrantId | null>(null);
  const [expandedKpi, setExpandedKpi] = useState<SnapshotKpiId | null>(null);
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
    tone: string;
    expandable: boolean;
  }[] = [
    {
      id: "total",
      label: "Total Opportunities",
      value: model.activeCount,
      tone: "#94A3B8",
      expandable: true,
    },
    {
      id: "on_track",
      label: "On Track",
      value: kpiById.on_track?.count ?? 0,
      tone: kpiById.on_track?.tone ?? "#22C55E",
      expandable: true,
    },
    {
      id: "needs_attention",
      label: "Needs Attention",
      value: kpiById.needs_attention?.count ?? 0,
      tone: "#FB923C",
      expandable: true,
    },
    {
      id: "at_risk",
      label: "At Risk",
      value: kpiById.at_risk?.count ?? 0,
      tone: kpiById.at_risk?.tone ?? "#EF4444",
      expandable: true,
    },
    {
      id: "dormant",
      label: "Dormant",
      value: dormantCount,
      tone: "#F59E0B",
      expandable: true,
    },
    {
      id: "avg_health",
      label: "Avg Health Score",
      value: `${model.vector.healthScore}/100`,
      tone: "#34D399",
      expandable: true,
    },
    {
      id: "conversion",
      label: "Conversion %",
      value: `${conversionPct}%`,
      tone: "#38BDF8",
      expandable: true,
    },
  ];

  const expandedRows = useMemo(() => {
    if (!expandedKpi) return [];
    return filterRowsForSnapshot(model.rows, expandedKpi);
  }, [expandedKpi, model.rows]);

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
    if (snap) {
      setExpandedKpi((prev) => (prev === snap ? null : snap));
    }
  }, []);

  const handleKpiClick = useCallback((id: SnapshotKpiId) => {
    setExpandedKpi((prev) => (prev === id ? null : id));
    const qMap: Partial<Record<SnapshotKpiId, ChanakyaOperationalQuadrantId>> = {
      on_track: "on_track",
      needs_attention: "needs_attention",
      at_risk: "at_risk",
      dormant: "follow_up_required",
    };
    const q = qMap[id];
    setRadarFocus(q ?? null);
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
    <div className="h-full min-h-0 overflow-y-auto">
      <section className="flex flex-col gap-3 p-3 md:p-4">
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

        {/* Mission Control — Zone 1 (snapshot) + Zone 2 (hero Radar) */}
        <div className="grid gap-3 lg:grid-cols-[minmax(200px,22%)_minmax(0,1fr)] lg:items-start">
          {/* ZONE 1 — Left Operational Snapshot */}
          <aside className="flex flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-950/60 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Operational Snapshot
            </p>
            <div className="flex flex-col gap-1.5">
              {snapshotKpis.map((kpi) => {
                const active = expandedKpi === kpi.id;
                return (
                  <button
                    key={kpi.id}
                    type="button"
                    onClick={() => handleKpiClick(kpi.id)}
                    className={cn(
                      "rounded-md border px-2.5 py-2 text-left transition-colors",
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
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: kpi.tone }}
                      />
                    </div>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums leading-none">
                      {kpi.value}
                    </p>
                  </button>
                );
              })}
            </div>

            {expandedKpi ? (
              <div className="mt-1 rounded-md border border-zinc-700/80 bg-zinc-900/40">
                <div className="flex items-center justify-between border-b border-zinc-700/60 px-2.5 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {snapshotKpis.find((k) => k.id === expandedKpi)?.label} · {expandedRows.length}
                  </p>
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => setExpandedKpi(null)}
                  >
                    Collapse
                  </button>
                </div>
                <ul className="max-h-[min(36vh,320px)] space-y-0.5 overflow-y-auto p-1.5">
                  {expandedRows.length === 0 ? (
                    <li className="px-2 py-3 text-center text-[11px] text-muted-foreground">
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
                            "w-full rounded border border-transparent px-2 py-1.5 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900",
                            selectedFileId === row.fileId &&
                              "border-emerald-500/40 bg-emerald-500/10",
                          )}
                        >
                          <p className="truncate text-[12px] font-medium">{row.borrower}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {row.product} · {row.loanAmountLabel}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground/80">
                            {row.quadrantLabel} · {row.stageLabel}
                          </p>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}
          </aside>

          {/* ZONE 2 — Centre CHANAKYA Radar (hero) */}
          <section className="flex min-w-0 flex-col rounded-lg border border-zinc-700 bg-zinc-950/60 p-3 md:p-4">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Operational Radar
              </p>
              <p className="text-[10px] text-muted-foreground">
                Click preview · Double-click open workspace
              </p>
            </div>
            <div className="mx-auto w-full py-1">
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
            <div className="mt-5 grid gap-3 rounded-md border border-zinc-700/80 bg-zinc-900/30 px-3.5 py-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Direction
                </p>
                <p className="text-[12px] font-medium leading-snug text-emerald-300 md:text-[13px]">
                  {model.vector.direction}
                </p>
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Health Score
                </p>
                <p className="text-[12px] font-medium tabular-nums leading-snug md:text-[13px]">
                  {model.vector.healthScore}/100
                </p>
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Largest Concern
                </p>
                <p className="text-[12px] font-medium leading-snug text-amber-300 md:text-[13px]">
                  {
                    CHANAKYA_RADAR_QUADRANTS.find((q) => q.id === model.vector.largestConcern)
                      ?.label
                  }
                </p>
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Trend
                </p>
                <p
                  className={cn(
                    "text-[12px] font-medium leading-snug md:text-[13px]",
                    model.vector.trend === "Improving" && "text-emerald-400",
                    model.vector.trend === "Declining" && "text-rose-400",
                    model.vector.trend === "Stable" && "text-muted-foreground",
                  )}
                >
                  {model.vector.trend}
                </p>
              </div>
            </div>

            {/* Compact operational metrics under radar */}
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {model.intelligence.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-zinc-700/80 bg-zinc-900/40 px-2 py-1.5"
                >
                  <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-base font-semibold tabular-nums",
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
      </section>

      {/* ZONE 3 — Opportunity Preview slide-over (collapsed by default) */}
      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedFileId(null);
        }}
      >
        <SheetContent
          side="right"
          allowOutsideClose
          overlayClassName="bg-black/40"
          className="flex w-[min(35vw,440px)] max-w-[min(35vw,440px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(35vw,440px)]"
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

      {/* Secondary operational board — below cockpit */}
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
    </div>
  );
}
