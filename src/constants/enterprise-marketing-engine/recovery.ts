/**
 * CO-MARKETING-REDESIGN-020 — Bounded retry, quarantine, and operational health copy.
 * Live send and production cron remain off.
 */

export const MARKETING_RETRY_BACKOFF_MS = [60_000, 300_000, 900_000] as const;

export const MARKETING_RECOVERY_QUARANTINE_AFTER_ATTEMPTS = 3 as const;

export const MARKETING_NON_RETRYABLE_FAILURE_KINDS = [
  "terminal_success",
  "unsubscribe",
  "complaint",
  "hard_bounce",
  "permanent_suppression",
  "permanent_provider_rejection",
  "invalid_recipient",
  "webhook_replay",
] as const;

export const MARKETING_RETRYABLE_FAILURE_KINDS = [
  "provider_timeout",
  "temporary_provider_rejection",
  "rate_limited",
  "rendering_failure",
  "expired_worker_lease",
  "worker_crash",
  "hostinger_restart",
  "partial_batch_completion",
] as const;

export const MARKETING_OPERATIONAL_HEALTH_NOTICE =
  "Operational health is dry-run only. Fields are durable records or explicitly labelled simulated. Live send is off. Production pacing cron is not registered." as const;

export const MARKETING_OPERATIONAL_HEALTH_SIMULATED_NOTICE =
  "SIMULATED — no live worker heartbeat. Values are fixtures, not production telemetry." as const;
