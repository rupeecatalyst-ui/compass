/**
 * CO-C1-CHART-READABILITY-001 — Doughnut with centre total, on-slice % for large
 * segments, and a permanent value+percentage legend (below on small screens).
 */

"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ENTERPRISE_CHART_PIE_LABEL_MIN_PERCENT,
  enterpriseChartCategoryColor,
} from "@/constants/enterprise-chart-readability";
import { EnterpriseChartLegend } from "@/components/enterprise/charts/enterprise-chart-legend";
import { EnterpriseChartTooltip } from "@/components/enterprise/charts/enterprise-chart-tooltip";
import {
  formatChartPercent,
  formatChartValue,
} from "@/lib/enterprise-chart-readability/format";
import type { EnterpriseChartSlice } from "@/types/enterprise-chart-readability";
import type { EnterpriseChartUnit } from "@/types/enterprise-chart-readability";
import { cn } from "@/lib/utils";

export function EnterpriseDoughnutChart({
  slices,
  unit,
  period,
  unitLabel,
  centerLabel,
  onSliceClick,
  className,
  height = 220,
}: {
  slices: EnterpriseChartSlice[];
  unit: EnterpriseChartUnit;
  period?: string | null;
  unitLabel?: string | null;
  centerLabel?: string;
  onSliceClick?: (slice: EnterpriseChartSlice) => void;
  className?: string;
  height?: number;
}) {
  const colored = slices.map((s, i) => ({
    ...s,
    color: s.color || enterpriseChartCategoryColor(i),
  }));
  const total = colored.reduce((s, row) => s + (Number.isFinite(row.value) ? row.value : 0), 0);
  const data = colored.map((s) => ({
    ...s,
    share: total > 0 ? s.value / total : 0,
    percent: total > 0 ? (s.value / total) * 100 : 0,
  }));

  if (colored.length === 0 || total === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
        No data for the current filters and period.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-3 md:flex-row md:items-center",
        className,
      )}
      data-enterprise-doughnut="true"
    >
      <div className="relative min-w-0 flex-1" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={Math.round(height * 0.24)}
              outerRadius={Math.round(height * 0.36)}
              paddingAngle={2}
              isAnimationActive
              animationDuration={600}
              label={(props) => {
                const pct = Number(props.percent ?? 0) * 100;
                if (pct < ENTERPRISE_CHART_PIE_LABEL_MIN_PERCENT) return null;
                return (
                  <text
                    x={props.x}
                    y={props.y}
                    fill="currentColor"
                    textAnchor={props.x > (props.cx ?? 0) ? "start" : "end"}
                    dominantBaseline="central"
                    fontSize={10}
                    className="fill-foreground"
                  >
                    {formatChartPercent(pct, 100)}
                  </text>
                );
              }}
              labelLine={false}
              onClick={(_, index) => {
                const slice = colored[index];
                if (slice) onSliceClick?.(slice);
              }}
              style={{ cursor: onSliceClick ? "pointer" : "default" }}
            >
              {data.map((slice) => (
                <Cell key={slice.key} fill={slice.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              content={
                <EnterpriseChartTooltip
                  unit={unit}
                  period={period}
                  unitLabel={unitLabel}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
            {centerLabel || unitLabel || "Total"}
          </p>
          <p className="text-base font-semibold tabular-nums text-foreground">
            {formatChartValue(total, unit)}
          </p>
        </div>
      </div>
      <EnterpriseChartLegend slices={colored} unit={unit} />
    </div>
  );
}
