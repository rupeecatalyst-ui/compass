/**
 * CO-MARKETING-REDESIGN-014 — Provider-neutral contract constants.
 * Fixture / dry-run only. Live provider mode stays OFF.
 */

export const MARKETING_PROVIDER_SEND_MODES = ["internal_test", "production"] as const;

export const MARKETING_PROVIDER_WEBHOOK_EVENT_TYPES = [
  "delivery_status",
  "bounce",
  "complaint",
  "open",
  "click",
  "unsubscribe",
  "reply",
] as const;

export const MARKETING_PROVIDER_FAILURE_CATEGORIES = [
  "NONE",
  "MALFORMED",
  "MISSING_CONTEXT",
  "LIVE_PROVIDER_DISABLED",
  "RATE_LIMITED",
  "TEMPORARY",
  "PERMANENT",
  "BLOCKED",
  "SIGNATURE",
  "ORG_ISOLATION",
] as const;

export const MARKETING_PROVIDER_RETRYABLE_FAILURES = ["RATE_LIMITED", "TEMPORARY"] as const;

export const MARKETING_PROVIDER_SUPPRESSION_EVENT_TYPES = [
  "unsubscribe",
  "bounce",
  "complaint",
] as const;

export const MARKETING_PROVIDER_ENGAGEMENT_EVENT_TYPES = ["open", "click", "reply"] as const;

export const MARKETING_FIXTURE_WEBHOOK_SIGNATURE_SCHEME = "fixture-v1" as const;

export const MARKETING_PROVIDER_LIVE_DISABLED = "LIVE_PROVIDER_DISABLED" as const;
export const MARKETING_WEBHOOK_SIGNATURE_MISSING = "WEBHOOK_SIGNATURE_MISSING" as const;
export const MARKETING_WEBHOOK_SIGNATURE_INVALID = "WEBHOOK_SIGNATURE_INVALID" as const;
export const MARKETING_WEBHOOK_ORG_ISOLATION = "ORG_ISOLATION_VIOLATION" as const;

export const MARKETING_PROVIDER_CONTRACT_NOTICE =
  "Provider contracts are fixture/dry-run only. Live provider mode is OFF. Acceptance is not delivery. Opens and clicks are engagement, not qualification." as const;
