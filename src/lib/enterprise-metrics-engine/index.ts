/**
 * CO-PERF-001 — Shared EME helpers for client consumers.
 */
export {
  EME_DASHBOARD_METRIC_KEY,
  EME_KPI_STRIP_METRIC_KEY,
  EME_SCHEDULE_NOTE,
} from "@/constants/enterprise-metrics-engine";

export {
  computeDealHealthProxyScore,
  dealHealthStageAgeDays,
  resolveKanbanDealHealthScore,
} from "./deal-health-proxy";

export type {
  EmeAdminStatus,
  EmeLiveMetrics,
  EmeMetricKey,
  EmeEventKey,
} from "@/types/enterprise-metrics-engine";
