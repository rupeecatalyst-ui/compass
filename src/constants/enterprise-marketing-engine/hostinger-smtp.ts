/**
 * CO-MARKETING-HOSTINGER-SMTP-001 — Phase 1 Hostinger SMTP constants.
 * Provider-neutral SMTP adapter. Credentials live in env names only. Live flags stay OFF.
 */

/** Maximum frozen recipients on one approved campaign. Never truncate; reject above this. */
export const MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING = 2000 as const;
/** Compatibility name: campaign audience, not a single-batch limit. */
export const MARKETING_PHASE1_LIVE_RECIPIENT_CEILING = MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING;

export const MARKETING_PHASE1_BATCH_RECIPIENT_CEILING = 100 as const;
export const MARKETING_PHASE1_DAILY_RECIPIENT_CEILING = 500 as const;

export const MARKETING_PHASE1_SMTP_MAX_CONCURRENT = 2 as const;

export const MARKETING_PHASE1_FROM_NAME = "Rupee Catalyst Opportunities" as const;
export const MARKETING_PHASE1_FROM_EMAIL = "opportunities@rupeecatalyst.com" as const;
export const MARKETING_PHASE1_REPLY_TO = "opportunities@rupeecatalyst.com" as const;

export const MARKETING_SMTP_DEFAULT_HOST = "smtp.hostinger.com" as const;
export const MARKETING_SMTP_PREFERRED_PORT = 465 as const;
export const MARKETING_SMTP_ALLOWED_PORTS = [465, 587] as const;

export const MARKETING_SMTP_ENV = {
  host: "ENTERPRISE_MARKETING_SMTP_HOST",
  port: "ENTERPRISE_MARKETING_SMTP_PORT",
  secure: "ENTERPRISE_MARKETING_SMTP_SECURE",
  username: "ENTERPRISE_MARKETING_SMTP_USERNAME",
  password: "ENTERPRISE_MARKETING_SMTP_PASSWORD",
  fromEmail: "ENTERPRISE_MARKETING_FROM_EMAIL",
  fromName: "ENTERPRISE_MARKETING_FROM_NAME",
  replyTo: "ENTERPRISE_MARKETING_REPLY_TO",
} as const;

export const MARKETING_TEST_RECIPIENT_ALLOWLIST_ENV =
  "ENTERPRISE_MARKETING_TEST_RECIPIENT_ALLOWLIST" as const;

export const MARKETING_SMTP_VERIFY_STATUSES = [
  "CONNECTED",
  "FAILED",
  "NOT_CONFIGURED",
  "BLOCKED",
] as const;

export type MarketingSmtpVerifyStatus = (typeof MARKETING_SMTP_VERIFY_STATUSES)[number];

export const MARKETING_SMTP_BLOCK = {
  hostMissing: "marketing.smtp.host_missing",
  usernameMissing: "marketing.smtp.username_missing",
  passwordMissing: "marketing.smtp.password_missing",
  invalidPort: "marketing.smtp.invalid_port",
  tlsRequired: "marketing.smtp.tls_required",
  allowlistEmpty: "marketing.test.allowlist_empty",
  allowlistNotExactlyOne: "marketing.test.allowlist_not_exactly_one",
  recipientNotAllowlisted: "marketing.test.recipient_not_allowlisted",
  senderNotPhase1: "marketing.sender.not_phase1_sender",
  unsubscribeSecretMissing: "marketing.unsubscribe.secret_missing",
  publicOriginMissing: "marketing.public_origin_missing",
  audienceLimitExceeded: "marketing.phase1.audience_limit_exceeded",
  batchLimitExceeded: "marketing.phase1.batch_limit_exceeded",
  dailyLimitExceeded: "marketing.phase1.daily_limit_exceeded",
  campaignProductInvalid: "marketing.campaign.product_invalid",
  campaignTokenMissing: "marketing.campaign.token_missing",
  campaignEntryInvalid: "marketing.campaign.entry_invalid",
  uncertainInFlight: "marketing.delivery.uncertain_in_flight",
  executionDisabled: "marketing.execution.disabled",
  providerConnectDisabled: "marketing.provider_connect.disabled",
  unsubscribeMissing: "marketing.unsubscribe.link_missing",
  bulkRecipientForbidden: "marketing.smtp.bulk_recipient_forbidden",
  configMissing: "marketing.smtp.config_missing",
  transportFailure: "marketing.smtp.transport_failure",
} as const;

export const MARKETING_SMTP_INBOX_DELIVERY_UNAVAILABLE =
  "SMTP acceptance is not inbox delivery. Bounce/delivery telemetry is unavailable for Hostinger SMTP." as const;
