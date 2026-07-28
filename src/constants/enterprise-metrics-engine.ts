/**
 * CO-PERF-001 — Enterprise Metrics Engine constants.
 * CO-ARCH-005 — Mission Control snapshot keys re-exported for EME consumers.
 */

export const EME_ADMIN_MODULE = {
  id: "enterprise-metrics",
  title: "Enterprise Metrics",
  path: "/admin/enterprise-metrics",
} as const;

/** Default nightly window — India (IST) 02:00 = 20:30 UTC. */
export const EME_DEFAULT_NIGHTLY_CRON = "30 20 * * *";

export const EME_SCHEDULE_NOTE =
  "Scheduled snapshots power Dashboard and Mission Control (daily 02:00 AM IST). Configure Mission Control refresh under Administration → System → Enterprise Metrics. Wire Vercel Cron to POST /api/cron/enterprise-metrics (CRON_SECRET). Force Recalculate is Administrator-only.";

export const EME_DASHBOARD_METRIC_KEY = "dashboard.visual_analytics" as const;
export const EME_KPI_STRIP_METRIC_KEY = "dashboard.kpi_strip" as const;

export {
  EME_MISSION_CONTROL_SNAPSHOT_KEY,
  EME_MISSION_CONTROL_RADAR_KEY,
  EME_MISSION_CONTROL_SCHEDULE_KEY,
} from "@/constants/mission-control-snapshot";

export const EME_PERIOD_TODAY = "today";
export const EME_PERIOD_LATEST = "latest";
