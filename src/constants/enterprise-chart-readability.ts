/**
 * CO-C1-CHART-READABILITY-001 — Shared chart readability SSOT.
 */

import type { EnterpriseChartUnit } from "@/types/enterprise-chart-readability";

/** Consistent category palette across Catalyst One dashboards (dark-theme safe). */
export const ENTERPRISE_CHART_CATEGORY_COLORS = [
  "#0d9488",
  "#38bdf8",
  "#a78bfa",
  "#fbbf24",
  "#f472b6",
  "#34d399",
  "#fb923c",
  "#94a3b8",
  "#f87171",
  "#22d3ee",
] as const;

export const ENTERPRISE_CHART_UNIT_LABELS: Record<EnterpriseChartUnit, string> = {
  count: "Count",
  inr: "₹ value",
  percent: "Percentage",
  days: "Days",
  contacts: "Contacts",
  deals: "Deals",
  opportunities: "Opportunities",
  score: "Score (0–100)",
  ratio: "Ratio",
};

/** Show percentage on the pie segment when share is at least this. Smaller slices use legend/callout. */
export const ENTERPRISE_CHART_PIE_LABEL_MIN_PERCENT = 8;

export const ENTERPRISE_CHART_EMPTY_MESSAGE = "No data for the current filters and period.";
export const ENTERPRISE_CHART_UNAVAILABLE_MESSAGE =
  "This chart is temporarily unavailable. Values were not invented.";
export const ENTERPRISE_CHART_ERROR_MESSAGE = "This chart could not be loaded. Please retry.";

export function enterpriseChartCategoryColor(index: number): string {
  return ENTERPRISE_CHART_CATEGORY_COLORS[index % ENTERPRISE_CHART_CATEGORY_COLORS.length];
}
