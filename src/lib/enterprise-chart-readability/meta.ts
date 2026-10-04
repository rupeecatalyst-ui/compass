import type { EnterpriseChartKind, EnterpriseChartMeta, EnterpriseChartUnit } from "@/types/enterprise-chart-readability";
import { ENTERPRISE_CHART_UNIT_LABELS } from "@/constants/enterprise-chart-readability";

export function buildEnterpriseChartMeta(input: {
  id: string;
  title: string;
  measurementDefinition: string;
  reportingPeriod?: string | null;
  unit: EnterpriseChartUnit;
  lastUpdated?: string | null;
  freshnessLabel?: string;
  activeFilters?: string[];
  dataSource: string;
  kind: EnterpriseChartKind;
  unavailable?: boolean;
  unavailableMessage?: string;
  unitLabel?: string;
}): EnterpriseChartMeta {
  return {
    id: input.id,
    title: input.title,
    measurementDefinition: input.measurementDefinition,
    reportingPeriod: input.reportingPeriod?.trim() || "Current operational view",
    unit: input.unit,
    unitLabel: input.unitLabel || ENTERPRISE_CHART_UNIT_LABELS[input.unit],
    lastUpdated: input.lastUpdated ?? null,
    freshnessLabel: input.freshnessLabel,
    activeFilters: input.activeFilters ?? [],
    dataSource: input.dataSource,
    kind: input.kind,
    unavailable: input.unavailable,
    unavailableMessage: input.unavailableMessage,
  };
}

export function unitForMcChartKind(kind: string): EnterpriseChartUnit {
  switch (kind) {
    case "donut":
    case "pie":
    case "funnel":
    case "bar":
    case "treemap":
      return "count";
    case "line":
    case "area":
    case "waterfall":
      return "inr";
    case "heatmap":
    case "radar":
      return "score";
    default:
      return "count";
  }
}

export function kindForMcChartKind(kind: string): EnterpriseChartKind {
  if (kind === "donut") return "doughnut";
  if (
    kind === "bar" ||
    kind === "line" ||
    kind === "area" ||
    kind === "treemap" ||
    kind === "funnel" ||
    kind === "radar" ||
    kind === "heatmap" ||
    kind === "waterfall"
  ) {
    return kind;
  }
  return "kpi";
}
