/**
 * CO-MARKETING-REDESIGN-004 — Explicit production cron activation boundary.
 *
 * Hostinger / Vercel pacing cron stays unregistered. Flip this constant only
 * after Product Owner certification of the FINAL CUTOVER, then add the route
 * to vercel.json and set ENTERPRISE_MARKETING_PACING_CRON_ENABLED=true.
 */

export const MARKETING_PACING_CRON_REGISTERED = false as const;

export const MARKETING_PACING_CRON_ENV_FLAG = "ENTERPRISE_MARKETING_PACING_CRON_ENABLED" as const;

export function isMarketingPacingCronActivated(): boolean {
  return Boolean(MARKETING_PACING_CRON_REGISTERED) && process.env[MARKETING_PACING_CRON_ENV_FLAG] === "true";
}

export const MARKETING_PACING_CRON_ACTIVATION = {
  registeredInScheduler: MARKETING_PACING_CRON_REGISTERED,
  envFlag: MARKETING_PACING_CRON_ENV_FLAG,
  code: "CRON_NOT_ACTIVATED" as const,
  message:
    "Marketing pacing cron is not activated. Production registration requires Product Owner certification.",
};
