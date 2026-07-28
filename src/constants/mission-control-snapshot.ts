/**
 * CO-ARCH-005 — Mission Control Snapshot (Executive Intelligence Centre).
 * Consumes Enterprise Intelligence Engine snapshots — never live heavy analytics on page load.
 */

export const MISSION_CONTROL_SNAPSHOT_PROGRAM = "CO-ARCH-005" as const;

/** EME metric keys for Mission Control certified snapshots. */
export const EME_MISSION_CONTROL_SNAPSHOT_KEY = "mission_control.executive_snapshot" as const;
export const EME_MISSION_CONTROL_RADAR_KEY = "mission_control.radar_dashboard" as const;
export const EME_MISSION_CONTROL_SCHEDULE_KEY = "mission_control.schedule_config" as const;

export const MISSION_CONTROL_REFRESH_INTERVALS = [
  { id: "2h", label: "Every 2 hours", hours: 2, cron: "0 */2 * * *" },
  { id: "4h", label: "Every 4 hours", hours: 4, cron: "0 */4 * * *" },
  { id: "6h", label: "Every 6 hours", hours: 6, cron: "0 */6 * * *" },
  { id: "12h", label: "Every 12 hours", hours: 12, cron: "0 */12 * * *" },
  {
    id: "daily",
    label: "Once Daily 02:00 AM IST (Default)",
    hours: 24,
    cron: "30 20 * * *",
  },
] as const;

export type MissionControlRefreshIntervalId =
  (typeof MISSION_CONTROL_REFRESH_INTERVALS)[number]["id"];

export const MISSION_CONTROL_DEFAULT_REFRESH_INTERVAL: MissionControlRefreshIntervalId =
  "daily";

export type MissionControlScheduleConfig = {
  intervalId: MissionControlRefreshIntervalId;
  enabled: boolean;
  updatedAt: string;
  updatedByUserId: string | null;
  /** Human note for operators */
  note: string;
};

export function defaultMissionControlScheduleConfig(
  actorUserId?: string | null,
): MissionControlScheduleConfig {
  return {
    intervalId: MISSION_CONTROL_DEFAULT_REFRESH_INTERVAL,
    enabled: true,
    updatedAt: new Date().toISOString(),
    updatedByUserId: actorUserId ?? null,
    note: "Mission Control Snapshot refreshes after Enterprise Intelligence Engine runs (default: once daily).",
  };
}

export function resolveMissionControlInterval(
  intervalId: string | null | undefined,
): (typeof MISSION_CONTROL_REFRESH_INTERVALS)[number] {
  return (
    MISSION_CONTROL_REFRESH_INTERVALS.find((i) => i.id === intervalId) ??
    MISSION_CONTROL_REFRESH_INTERVALS.find((i) => i.id === "daily")!
  );
}
