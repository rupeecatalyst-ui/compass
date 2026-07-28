/**

 * CO-ARCH-007 — CHANAKYA Day / Night operating model.

 * Day = observe & advise from certified snapshots. Night = learn & score (Tier 3).

 */



export const CHANAKYA_OPERATING_MODEL_PROGRAM = "CO-ARCH-007" as const;



export const CHANAKYA_PHILOSOPHY_QUOTE =

  "I Observe by Day, Learn by Night, Advise Every Morning." as const;



export const CHANAKYA_PHILOSOPHY_ATTRIBUTION = "CHANAKYA" as const;



/** Default Night Mode start (local org preference; cron aligned via Admin / Vercel). */

export const CHANAKYA_NIGHT_MODE_DEFAULT_HOUR_LOCAL = 2 as const;



export const EME_CHANAKYA_NIGHT_SCHEDULE_KEY = "chanakya.night_mode_schedule" as const;



export type ChanakyaOperatingMode = "day" | "night";



export type ChanakyaNightModeScheduleConfig = {

  /** Local hour 0–23 when Night Mode intelligence may run (default 2 = 02:00). */

  hourLocal: number;

  enabled: boolean;

  updatedAt: string;

  updatedByUserId: string | null;

  note: string;

};



export function defaultChanakyaNightModeSchedule(

  actorUserId?: string | null,

): ChanakyaNightModeScheduleConfig {

  return {

    hourLocal: CHANAKYA_NIGHT_MODE_DEFAULT_HOUR_LOCAL,

    enabled: true,

    updatedAt: new Date().toISOString(),

    updatedByUserId: actorUserId ?? null,

    note: "CHANAKYA Night Mode runs heavy scoring and snapshot generation (default 02:00).",

  };

}



/**

 * Day Mode window: outside configured night hour ± 30 minutes (lightweight ops).

 * Night Mode: around the configured local hour (heavy intelligence permitted).

 */

export function resolveChanakyaOperatingMode(

  now = new Date(),

  nightHourLocal: number = CHANAKYA_NIGHT_MODE_DEFAULT_HOUR_LOCAL,

): ChanakyaOperatingMode {

  const hour = now.getHours();

  const minute = now.getMinutes();

  const night = ((nightHourLocal % 24) + 24) % 24;

  if (hour === night && minute < 30) return "night";

  if (hour === (night + 23) % 24 && minute >= 30) return "night";

  return "day";

}



export function isChanakyaDayMode(

  now = new Date(),

  nightHourLocal?: number,

): boolean {

  return resolveChanakyaOperatingMode(now, nightHourLocal) === "day";

}



/** Work forbidden on interactive Day Mode / Tier 1 paths. */

export const CHANAKYA_DAY_MODE_FORBIDDEN_WORK = [

  "recommendation_engine_execute",

  "customer_scoring",

  "lender_scoring",

  "partner_scoring",

  "enterprise_analytics",

  "portfolio_intelligence",

  "heavy_sql_aggregation",

] as const;



/** Night Mode / Tier 3 work kinds (EME scheduled). */

export const CHANAKYA_NIGHT_MODE_WORK = [

  "customer_scoring",

  "lender_scoring",

  "partner_scoring",

  "portfolio_intelligence",

  "recommendation_learning",

  "revenue_analytics",

  "executive_kpis",

  "chanakya_radar_snapshot",

  "enterprise_intelligence_snapshot",

  "decision_learning",

] as const;


