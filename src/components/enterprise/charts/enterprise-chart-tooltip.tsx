/**
 * CO-C1-CHART-READABILITY-001 — Tooltip: category, formatted value, %, period.
 * Never presents a series index or raw "value" key as the category.
 */

"use client";

import {
  formatChartPercent,
  formatChartPeriod,
  formatChartValue,
  resolveChartCategoryLabel,
} from "@/lib/enterprise-chart-readability/format";
import type { EnterpriseChartUnit } from "@/types/enterprise-chart-readability";

type TooltipRow = {
  name?: string;
  value?: number | string;
  payload?: Record<string, unknown>;
  dataKey?: string | number;
  color?: string;
};

export function EnterpriseChartTooltip({
  active,
  payload,
  label,
  unit = "count",
  period,
  unitLabel,
  categoryFallback = "Category",
}: {
  active?: boolean;
  payload?: TooltipRow[];
  label?: string | number;
  unit?: EnterpriseChartUnit;
  period?: string | null;
  unitLabel?: string | null;
  categoryFallback?: string;
}) {
  if (!active || !payload?.length) return null;

  const first = payload[0];
  const body = first?.payload ?? {};
  const category = resolveChartCategoryLabel(
    body.label ?? body.name ?? body.period ?? body.month ?? body.product ?? label ?? first?.name,
    categoryFallback,
  );

  const numericValues = payload
    .map((row) => Number(row.value))
    .filter((n) => Number.isFinite(n));
  const rowTotal = numericValues.reduce((s, n) => s + Math.abs(n), 0);

  return (
    <div
      className="min-w-[10rem] rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-md"
      data-enterprise-chart-tooltip="true"
    >
      <p className="font-semibold text-foreground">{category}</p>
      {payload.map((row, i) => {
        const n = Number(row.value);
        const formatted = Number.isFinite(n) ? formatChartValue(n, unit) : "—";
        const series = resolveChartCategoryLabel(row.name ?? row.dataKey, "");
        const pct =
          rowTotal > 0 && Number.isFinite(n) && payload.length > 1
            ? formatChartPercent(Math.abs(n), rowTotal)
            : typeof body.percent === "number"
              ? formatChartPercent(Number(body.percent), 100)
              : payload.length === 1 && typeof body.share === "number"
                ? formatChartPercent(Number(body.share), 1)
                : null;
        return (
          <p key={`${String(row.dataKey)}-${i}`} className="mt-0.5 tabular-nums">
            {series ? `${series} · ` : ""}
            {formatted}
            {pct ? ` · ${pct}` : ""}
          </p>
        );
      })}
      {unitLabel ? <p className="mt-0.5 text-muted-foreground">Unit · {unitLabel}</p> : null}
      <p className="mt-0.5 text-muted-foreground">Period · {formatChartPeriod(period)}</p>
    </div>
  );
}
