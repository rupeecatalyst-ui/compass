"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatINRCompact } from "@/lib/format-currency";
import type { DashboardNamedSlice } from "@/types/dashboard-visual-analytics";

export function DashboardDoughnutChart({
  slices,
  onSliceClick,
  centerLabel,
  centerValue,
  valueMode = "count",
}: {
  slices: DashboardNamedSlice[];
  onSliceClick?: (slice: DashboardNamedSlice) => void;
  centerLabel?: string;
  centerValue?: string;
  valueMode?: "count" | "value";
}) {
  if (slices.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    );
  }

  const total = slices.reduce(
    (s, row) => s + (valueMode === "value" ? row.value : row.count),
    0,
  );

  return (
    <div className="relative h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey={valueMode === "value" ? "value" : "count"}
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={54}
            outerRadius={78}
            paddingAngle={2}
            isAnimationActive
            animationDuration={700}
            onClick={(_, index) => {
              const slice = slices[index];
              if (slice) onSliceClick?.(slice);
            }}
            style={{ cursor: onSliceClick ? "pointer" : "default" }}
          >
            {slices.map((slice) => (
              <Cell key={slice.key} fill={slice.color || "#0f766e"} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const item = payload[0].payload as DashboardNamedSlice;
              const pct =
                total > 0
                  ? Math.round(
                      ((valueMode === "value" ? item.value : item.count) / total) * 100,
                    )
                  : 0;
              return (
                <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] shadow-md">
                  <p className="font-semibold">{item.label}</p>
                  <p>
                    {item.count} · {formatINRCompact(item.value)} · {pct}%
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel ? (
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
              {centerLabel}
            </p>
          ) : null}
          {centerValue ? (
            <p className="text-base font-semibold tabular-nums text-foreground">{centerValue}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
