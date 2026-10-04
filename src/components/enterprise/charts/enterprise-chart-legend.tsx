/**
 * CO-C1-CHART-READABILITY-001 — Permanent legend: colour, category, value, percentage.
 * Stacks below the plot on small screens; stays beside it from md up.
 */

"use client";

import { formatChartPercent, formatChartValue } from "@/lib/enterprise-chart-readability/format";
import type { EnterpriseChartSlice } from "@/types/enterprise-chart-readability";
import type { EnterpriseChartUnit } from "@/types/enterprise-chart-readability";
import { cn } from "@/lib/utils";

export function EnterpriseChartLegend({
  slices,
  unit,
  className,
}: {
  slices: EnterpriseChartSlice[];
  unit: EnterpriseChartUnit;
  className?: string;
}) {
  const total = slices.reduce((s, row) => s + (Number.isFinite(row.value) ? row.value : 0), 0);

  if (slices.length === 0) return null;

  return (
    <ul
      className={cn(
        "flex w-full flex-col gap-1.5 md:max-w-[16rem] md:shrink-0",
        className,
      )}
      data-enterprise-chart-legend="true"
    >
      {slices.map((slice) => (
        <li key={slice.key} className="flex items-start gap-2 text-[11px] text-foreground">
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm border border-border/60"
            style={{ background: slice.color }}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{slice.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatChartValue(slice.value, unit)} · {formatChartPercent(slice.value, total)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
