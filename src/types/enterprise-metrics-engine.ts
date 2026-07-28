/**
 * CO-PERF-001 — Enterprise Metrics Engine types.
 * EME is a computation + read-model layer. Entities remain SSOT.
 */

export type EmeMetricCategory = "nightly" | "event" | "live";

export type EmeRunType = "nightly_snapshot" | "event_refresh" | "force_recalculate" | "dry_run";

export type EmeRunStatus = "running" | "succeeded" | "failed" | "partial";

export type EmeTriggerSource =
  | "admin"
  | "cron"
  | "api"
  | "event"
  | "dashboard_warmup";

/** Canonical metric keys published by EME. */
export const EME_METRIC_KEYS = [
  "dashboard.visual_analytics",
  "dashboard.kpi_strip",
  "mission_control.executive_snapshot",
  "mission_control.radar_dashboard",
  "mission_control.schedule_config",
  "portfolio.pipeline_statistics",
  "portfolio.conversion_ratios",
  "portfolio.revenue_metrics",
  "portfolio.average_ticket_size",
  "portfolio.average_tat",
  "portfolio.financial_health",
  "portfolio.risk_score",
  "portfolio.expected_success_pct",
  "product.performance",
  "lender.performance",
  "rm.productivity",
  "branch.performance",
  "opportunity.health",
  "deal.health",
  "live.today_opportunities",
  "live.today_logins",
  "live.today_disbursements",
  "live.pending_tasks",
  "live.overdue_tasks",
] as const;

export type EmeMetricKey = (typeof EME_METRIC_KEYS)[number];

export type EmeEventKey =
  | "opportunity.created"
  | "opportunity.stage_changed"
  | "deal.stage_changed"
  | "lender.assigned"
  | "document.uploaded"
  | "task.completed"
  | "customer.responded"
  | "disbursement.completed"
  | "loss.recorded";

/** Event → metric keys to refresh (never full recomputation). */
export const EME_EVENT_METRIC_MAP: Record<EmeEventKey, readonly EmeMetricKey[]> = {
  "opportunity.created": [
    "dashboard.visual_analytics",
    "dashboard.kpi_strip",
    "portfolio.pipeline_statistics",
    "live.today_opportunities",
  ],
  "opportunity.stage_changed": [
    "dashboard.visual_analytics",
    "opportunity.health",
    "portfolio.conversion_ratios",
  ],
  "deal.stage_changed": [
    "dashboard.visual_analytics",
    "dashboard.kpi_strip",
    "deal.health",
    "live.today_logins",
    "live.today_disbursements",
  ],
  "lender.assigned": ["lender.performance", "dashboard.visual_analytics"],
  "document.uploaded": ["opportunity.health", "deal.health"],
  "task.completed": ["live.pending_tasks", "live.overdue_tasks", "opportunity.health"],
  "customer.responded": ["opportunity.health"],
  "disbursement.completed": [
    "dashboard.visual_analytics",
    "portfolio.revenue_metrics",
    "live.today_disbursements",
    "deal.health",
  ],
  "loss.recorded": [
    "portfolio.conversion_ratios",
    "portfolio.risk_score",
    "dashboard.visual_analytics",
  ],
};

export type EmeLiveMetrics = {
  asOf: string;
  category: "live";
  todaysOpportunities: number;
  todaysLogins: number;
  todaysDisbursements: number;
  pendingTasks: number;
  overdueTasks: number;
  unreadNotifications: number | null;
  onlineUsers: number | null;
};

export type EmeRunSummary = {
  id: string;
  runType: EmeRunType;
  category: EmeMetricCategory | "mixed";
  status: EmeRunStatus;
  dryRun: boolean;
  triggerSource: EmeTriggerSource;
  actorUserId: string | null;
  eventKey: string | null;
  recordsProcessed: number;
  snapshotsWritten: number;
  failures: number;
  durationMs: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  summary: Record<string, unknown> | null;
};

export type EmeAdminStatus = {
  healthStatus: "healthy" | "degraded" | "unknown";
  lastCalculationTime: string | null;
  lastDurationMs: number | null;
  lastRecordsProcessed: number | null;
  lastFailures: number | null;
  lastStatus: EmeRunStatus | null;
  nextScheduledRun: string | null;
  scheduleNote: string;
  recentRuns: EmeRunSummary[];
  snapshotCounts: {
    nightly: number;
    event: number;
    live: number;
  };
  /** CO-ARCH-005 */
  missionControl?: {
    lastSnapshotAt: string | null;
    snapshotVersion: string | null;
    scheduleIntervalId: string;
    scheduleEnabled: boolean;
  };
  /** CO-ARCH-007 */
  chanakyaRadar?: {
    lastSnapshotAt: string | null;
    snapshotVersion: string | null;
    nextScheduledRefresh: string | null;
    nightHourLocal: number;
    nightEnabled: boolean;
  };
};

export type EmeComputeOptions = {
  dryRun?: boolean;
  triggerSource?: EmeTriggerSource;
  actorUserId?: string | null;
  metricKeys?: EmeMetricKey[];
  eventKey?: EmeEventKey;
};
