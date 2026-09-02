"use client";

import { EnterpriseDoughnutChart } from "@/components/enterprise/charts/enterprise-doughnut-chart";
import { enterpriseChartCategoryColor } from "@/constants/enterprise-chart-readability";
import type { DashboardNamedSlice } from "@/types/dashboard-visual-analytics";
import type { EnterpriseChartUnit } from "@/types/enterprise-chart-readability";

export function DashboardDoughnutChart({
  slices,
  onSliceClick,
  centerLabel,
  centerValue,
  valueMode = "count",
  unit,
  period,
  unitLabel,
}: {
  slices: DashboardNamedSlice[];
  onSliceClick?: (slice: DashboardNamedSlice) => void;
  centerLabel?: string;
  centerValue?: string;
  valueMode?: "count" | "value";
  unit?: EnterpriseChartUnit;
  period?: string | null;
  unitLabel?: string | null;
}) {
  const resolvedUnit: EnterpriseChartUnit = unit ?? (valueMode === "value" ? "inr" : "count");
  const mapped = slices.map((slice, i) => ({
    key: slice.key,
    label: slice.label,
    value: valueMode === "value" ? slice.value : slice.count,
    color: slice.color || enterpriseChartCategoryColor(i),
  }));

  return (
    <EnterpriseDoughnutChart
      slices={mapped}
      unit={resolvedUnit}
      period={period}
      unitLabel={unitLabel || (resolvedUnit === "inr" ? "₹ value" : centerLabel || "Count")}
      centerLabel={centerValue ? centerLabel : centerLabel}
      onSliceClick={(row) => {
        const original = slices.find((s) => s.key === row.key);
        if (original) onSliceClick?.(original);
      }}
    />
  );
}
