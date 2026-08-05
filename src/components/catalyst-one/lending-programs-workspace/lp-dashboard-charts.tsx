"use client";

/**
 * CO-LW-004 — Lending Programs visual dashboard pack.
 * Reuses User Home / EI chart primitives. Factual pipeline + programme data only.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardDoughnutChart } from "@/components/catalyst-one/user-home-dashboard/charts/dashboard-doughnut-chart";
import { DashboardHorizontalBarChart } from "@/components/catalyst-one/user-home-dashboard/charts/dashboard-bar-charts";
import { DashboardVizCard } from "@/components/catalyst-one/user-home-dashboard/charts/dashboard-viz-card";
import { EiFunnelChart } from "@/components/catalyst-one/executive-intelligence/viz/ei-funnel-chart";
import { LENDING_PROGRAMS_NOT_SPECIFIED } from "@/types/lending-programs-workspace";
import type { DashboardNamedSlice } from "@/types/dashboard-visual-analytics";
import type { EiFunnelStage } from "@/types/executive-intelligence-platform";
import { cn } from "@/lib/utils";

export function LpKpiStrip({
  items,
}: {
  items: Array<{ label: string; value: string | number }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-border/70 bg-card px-2.5 py-1.5"
        >
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
          <p className="text-base font-semibold tabular-nums leading-tight text-foreground">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ label }: { label?: string }) {
  return (
    <div className="flex h-[160px] items-center justify-center text-[11px] text-muted-foreground">
      {label || "No data yet"}
    </div>
  );
}

export function LpDashboardCharts({
  stageSlices,
  funnel,
  approvalSlices,
  productMix,
  programmeCoverage,
  citySlices,
  relationshipSignals,
  monthlyTrend,
  averageTat,
  className,
}: {
  stageSlices: DashboardNamedSlice[];
  funnel: EiFunnelStage[];
  approvalSlices: DashboardNamedSlice[];
  productMix: DashboardNamedSlice[];
  programmeCoverage: DashboardNamedSlice[];
  citySlices: DashboardNamedSlice[];
  relationshipSignals: DashboardNamedSlice[];
  monthlyTrend: Array<{ period: string; count: number }>;
  averageTat: number | null;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2 md:grid-cols-2 xl:grid-cols-3", className)}>
      <DashboardVizCard title="Deal Stage Distribution" className="min-h-[240px]">
        {stageSlices.length ? (
          <DashboardDoughnutChart
            slices={stageSlices}
            centerLabel="Deals"
            centerValue={String(stageSlices.reduce((s, x) => s + x.count, 0))}
          />
        ) : (
          <EmptyChart />
        )}
      </DashboardVizCard>

      <DashboardVizCard title="Pipeline Funnel" className="min-h-[240px]">
        {funnel.some((s) => s.count > 0) ? (
          <div className="px-1 pt-1">
            <EiFunnelChart stages={funnel} />
          </div>
        ) : (
          <EmptyChart />
        )}
      </DashboardVizCard>

      <DashboardVizCard title="Approval vs Rejection" className="min-h-[240px]">
        {approvalSlices.length ? (
          <DashboardDoughnutChart slices={approvalSlices} centerLabel="Cases" />
        ) : (
          <EmptyChart />
        )}
      </DashboardVizCard>

      <DashboardVizCard title="Product Mix" className="min-h-[240px]">
        {productMix.length ? (
          <DashboardHorizontalBarChart slices={productMix} />
        ) : (
          <EmptyChart label="No published programmes" />
        )}
      </DashboardVizCard>

      <DashboardVizCard title="Programme Coverage" className="min-h-[240px]">
        {programmeCoverage.length ? (
          <DashboardHorizontalBarChart slices={programmeCoverage} />
        ) : (
          <EmptyChart />
        )}
      </DashboardVizCard>

      <DashboardVizCard title="City Distribution" className="min-h-[240px]">
        {citySlices.length ? (
          <DashboardDoughnutChart slices={citySlices} />
        ) : (
          <EmptyChart />
        )}
      </DashboardVizCard>

      <DashboardVizCard title="Relationship Signals" className="min-h-[240px]">
        <p className="mb-1 text-[9px] text-muted-foreground">
          Factual counts only — not a Relationship Score.
        </p>
        <DashboardHorizontalBarChart slices={relationshipSignals} />
      </DashboardVizCard>

      <DashboardVizCard title="Monthly Disbursal Trend" className="min-h-[240px]">
        {monthlyTrend.length ? (
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.25)" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Disbursed" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="No disbursed deals in recent window" />
        )}
      </DashboardVizCard>

      <DashboardVizCard title="Average Turnaround" className="min-h-[240px]">
        <div className="flex h-[180px] flex-col items-center justify-center gap-1">
          <p className="text-3xl font-semibold tabular-nums text-foreground">
            {averageTat != null ? averageTat : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {averageTat != null
              ? "Days (programme averageTatDays)"
              : LENDING_PROGRAMS_NOT_SPECIFIED}
          </p>
        </div>
      </DashboardVizCard>
    </div>
  );
}
