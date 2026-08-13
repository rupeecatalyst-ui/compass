/**
 * CO-MARKETING-MKT-07 — Email delivery constants.
 */

import type {
  MarketingEmailDeliveryOutcome,
  MarketingEmailProviderType,
  MarketingSenderVerificationStatus,
} from "@/types/enterprise-marketing-email-delivery";

export const MARKETING_EMAIL_DELIVERY_OUTCOMES = [
  "ACCEPTED",
  "SENT",
  "FAILED",
  "RETRYABLE_FAILURE",
  "PERMANENT_FAILURE",
  "RATE_LIMITED",
  "BLOCKED",
  "CANCELLED",
] as const satisfies readonly MarketingEmailDeliveryOutcome[];

export const MARKETING_SENDER_VERIFICATION_STATUSES = [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "FAILED",
] as const satisfies readonly MarketingSenderVerificationStatus[];

export const MARKETING_EMAIL_PROVIDER_TYPES = [
  "dry_run",
  "resend",
  "sendgrid",
  "ses",
  "smtp",
  "other",
] as const satisfies readonly MarketingEmailProviderType[];

/**
 * Email delivery mode (server-only env `ENTERPRISE_MARKETING_EMAIL_MODE`):
 * - off: refuse all delivery port calls
 * - dry_run: validate + record — no external provider (default for MKT-07)
 * - live: requires EXECUTION_ENABLED + PROVIDER_CONNECT + PO-approved env
 */
export type EnterpriseMarketingEmailDeliveryMode = "off" | "dry_run" | "live";

function resolveEmailMode(): EnterpriseMarketingEmailDeliveryMode {
  const raw = (process.env.ENTERPRISE_MARKETING_EMAIL_MODE ?? "dry_run").trim().toLowerCase();
  if (raw === "off" || raw === "dry_run" || raw === "live") return raw;
  return "dry_run";
}

export const ENTERPRISE_MARKETING_EMAIL_MODE: EnterpriseMarketingEmailDeliveryMode =
  typeof process !== "undefined" ? resolveEmailMode() : "dry_run";

/** Server env keys for live providers — never exposed to client. */
export const MARKETING_EMAIL_PROVIDER_ENV_KEYS = {
  resend: "ENTERPRISE_MARKETING_RESEND_API_KEY",
  sendgrid: "ENTERPRISE_MARKETING_SENDGRID_API_KEY",
  ses: "ENTERPRISE_MARKETING_SES_ACCESS_KEY_ID",
  smtp: "ENTERPRISE_MARKETING_SMTP_PASSWORD",
} as const;
