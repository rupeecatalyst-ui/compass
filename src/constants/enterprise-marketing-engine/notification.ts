/**
 * CO-MARKETING-MKT-12 — Internal handoff notification channels (ENE for in-app).
 * Email / WhatsApp are configurable; live employee send stays dry-run until approved.
 */

export const MARKETING_NOTIFICATION_CHANNELS = ["in_app", "email", "whatsapp"] as const;

export type MarketingNotificationChannel = (typeof MARKETING_NOTIFICATION_CHANNELS)[number];

export const MARKETING_NOTIFICATION_ATTEMPT_STATUSES = [
  "PENDING",
  "SENT",
  "FAILED",
  "SKIPPED",
  "DRY_RUN",
] as const;

export type MarketingNotificationAttemptStatus =
  (typeof MARKETING_NOTIFICATION_ATTEMPT_STATUSES)[number];

export const MARKETING_HANDOFF_REQUIRED_ACTION =
  "Open the Dialogue Opportunity and continue the customer conversation." as const;

export const MARKETING_DEFAULT_NOTIFICATION_CHANNELS = {
  inApp: true,
  email: false,
  whatsapp: false,
} as const;
