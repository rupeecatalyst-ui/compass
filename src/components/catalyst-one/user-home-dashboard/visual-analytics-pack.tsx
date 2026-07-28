"use client";

/**
 * CO-UX-006 Part 5 — Visual Analytics pack for User Home Dashboard.
 * Opportunity-centric charts · EI premium canvas · drill-down to existing lists.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EiPremiumCanvas } from "@/components/catalyst-one/executive-intelligence/ei-premium-canvas";
import { EiTreemapChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-treemap-chart";
import { DashboardVizCard } from "@/components/catalyst-one/user-home-dashboard/charts/dashboard-viz-card";
import { DashboardDoughnutChart } from "@/components/catalyst-one/user-home-dashboard/charts/dashboard-doughnut-chart";
import {
  DashboardAgeingStackedBar,
  DashboardDisbursementBarChart,
  DashboardHorizontalBarChart,
  DashboardTrendLineChart,
} from "@/components/catalyst-one/user-home-dashboard/charts/dashboard-bar-charts";
import { formatINRCompact } from "@/lib/format-currency";
import { ROUTES } from "@/constants/routes";
import {
  buildAgeingDrillHref,
  buildLenderDrillHref,
  buildProductMixDrillHref,
  buildSourceMixDrillHref,
  buildStageDrillHref,
  loadDashboardVisualAnalytics,
} from "@/lib/user-home-dashboard/visual-analytics/load";
import { subscribeOpportunitiesUpdated } from "@/lib/enterprise-opportunity/opportunity-data-sync";
import type {
  DashboardTrendRangeId,
  DashboardVisualAnalyticsSnapshot,
} from "@/types/dashboard-visual-analytics";
import type { EiTreemapCell } from "@/types/executive-intelligence-platform";

const TREND_OPTIONS: ReadonlyArray<{ id: DashboardTrendRangeId; label: string }> = [
  { id: "30d", label: "Last 30 Days" },
  { id: "90d", label: "Last 90 Days" },
  { id: "fy", label: "This Financial Year" },
];

export function VisualAnalyticsPack() {
  const router = useRouter();
  const [trendRange, setTrendRange] = useState<DashboardTrendRangeId>("90d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardVisualAnalyticsSnapshot | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadDashboardVisualAnalytics(trendRange);
      setSnapshot(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [trendRange]);

  useEffect(() => {
    void refresh();
    return subscribeOpportunitiesUpdated(() => {
      void refresh();
    });
  }, [refresh]);

  const productTreemap: EiTreemapCell[] = (snapshot?.productMix ?? []).map((p, i) => ({
    name: p.label,
    size: Math.max(p.value, p.count * 1_000),
    count: p.count,
    fill: p.color || `hsl(${160 + i * 28} 55% 38%)`,
  }));

  return (
    <EiPremiumCanvas className="rounded-2xl border border-border/50 p-3 md:p-4">
      <section
        aria-label="Visual Analytics"
        data-widget-slot="visual_analytics"
        data-sprint="CO-UX-006"
        className="space-y-3"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="ei-eyebrow">Executive Business Intelligence</p>
            <h2 className="ei-display text-lg text-[var(--ei-ink)] md:text-xl">
              Visual Analytics
            </h2>
          </div>
          {snapshot ? (
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {snapshot.totals.activeOpportunities} active ·{" "}
              {formatINRCompact(snapshot.totals.opportunityValue)} book
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="text-xs text-amber-800 dark:text-amber-200" role="status">
            {error}
          </p>
        ) : null}

        {loading && !snapshot ? (
          <ChanakyaLoadingExperience
            module="dashboard"
            statusLabel="Preparing Executive KPIs..."
            density="panel"
            useEbiSignals
          />
        ) : snapshot ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DashboardVizCard title="Opportunity Source Mix" className="xl:col-span-1">
              <DashboardDoughnutChart
                slices={snapshot.sourceMix}
                centerLabel="Sources"
                centerValue={String(snapshot.sourceMix.length)}
                onSliceClick={(s) => router.push(buildSourceMixDrillHref(s.key))}
              />
            </DashboardVizCard>

            <DashboardVizCard title="Product Mix" className="xl:col-span-1">
              {productTreemap.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
                  No products
                </div>
              ) : (
                <div
                  className="cursor-pointer"
                  onClick={() => router.push(ROUTES.MY_OPPORTUNITIES)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(ROUTES.MY_OPPORTUNITIES);
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <EiTreemapChart
                    cells={productTreemap}
                    onHover={() => undefined}
                  />
                </div>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                {snapshot.productMix.slice(0, 6).map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] hover:bg-muted/40"
                    onClick={() => router.push(buildProductMixDrillHref(p.label))}
                  >
                    {p.label} · {p.count}
                  </button>
                ))}
              </div>
            </DashboardVizCard>

            <DashboardVizCard title="Opportunity Stage Distribution">
              <DashboardDoughnutChart
                slices={snapshot.stageDistribution}
                centerLabel="Stages"
                centerValue={String(snapshot.totals.opportunities)}
                onSliceClick={(s) => router.push(buildStageDrillHref(s.key))}
              />
            </DashboardVizCard>

            <DashboardVizCard
              title="Monthly Trend"
              className="md:col-span-2 xl:col-span-2"
              action={
                <Select
                  value={trendRange}
                  onValueChange={(v) => setTrendRange(v as DashboardTrendRangeId)}
                >
                  <SelectTrigger className="h-8 w-[11rem] text-xs" aria-label="Trend range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TREND_OPTIONS.map((o) => (
                      <SelectItem key={o.id} value={o.id} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            >
              <DashboardTrendLineChart series={snapshot.monthlyTrend} />
            </DashboardVizCard>

            <DashboardVizCard title="Lender Distribution">
              <DashboardHorizontalBarChart
                slices={snapshot.lenderDistribution}
                onBarClick={(s) => router.push(buildLenderDrillHref(s.label))}
              />
            </DashboardVizCard>

            <DashboardVizCard title="Opportunity Ageing">
              <DashboardAgeingStackedBar
                buckets={snapshot.ageing}
                onBucketClick={(b) => router.push(buildAgeingDrillHref(b.id))}
              />
            </DashboardVizCard>

            <DashboardVizCard title="Task Analytics">
              <DashboardDoughnutChart
                slices={snapshot.taskAnalytics}
                centerLabel="Tasks"
                centerValue={String(
                  snapshot.taskAnalytics.reduce((s, r) => s + r.count, 0),
                )}
                onSliceClick={() => router.push(ROUTES.TASKS)}
              />
            </DashboardVizCard>

            <DashboardVizCard title="Disbursement Analytics" className="md:col-span-2">
              <DashboardDisbursementBarChart periods={snapshot.disbursements} />
            </DashboardVizCard>

            <DashboardVizCard title="Performance Insights" className="md:col-span-2 xl:col-span-3">
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {snapshot.performance.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border/50 bg-background/60 px-3 py-2.5"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {p.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                      {p.valueLabel}
                    </p>
                    {p.hint ? (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{p.hint}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </DashboardVizCard>
          </div>
        ) : null}
      </section>
    </EiPremiumCanvas>
  );
}
