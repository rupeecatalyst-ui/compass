/**
 * CO-C1-CHART-READABILITY-001 — Enterprise chart readability contract.
 */

export const ENTERPRISE_CHART_UNITS = [
  "count",
  "inr",
  "percent",
  "days",
  "contacts",
  "deals",
  "opportunities",
  "score",
  "ratio",
] as const;

export type EnterpriseChartUnit = (typeof ENTERPRISE_CHART_UNITS)[number];

export const ENTERPRISE_CHART_KINDS = [
  "pie",
  "doughnut",
  "bar",
  "column",
  "line",
  "area",
  "treemap",
  "funnel",
  "radar",
  "heatmap",
  "waterfall",
  "gauge",
  "sankey",
  "scatter",
  "bubble",
  "timeline",
  "bullet",
  "kpi",
] as const;

export type EnterpriseChartKind = (typeof ENTERPRISE_CHART_KINDS)[number];

export type EnterpriseChartMeta = {
  id: string;
  title: string;
  measurementDefinition: string;
  reportingPeriod: string;
  unit: EnterpriseChartUnit;
  unitLabel: string;
  lastUpdated?: string | null;
  freshnessLabel?: string;
  activeFilters?: string[];
  dataSource: string;
  kind: EnterpriseChartKind;
  unavailable?: boolean;
  unavailableMessage?: string;
};

export type EnterpriseChartSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type EnterpriseChartTooltipModel = {
  category: string;
  formattedValue: string;
  percentLabel?: string | null;
  period?: string | null;
  unitLabel?: string | null;
};
