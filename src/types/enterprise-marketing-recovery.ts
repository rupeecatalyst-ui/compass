/**
 * CO-MARKETING-REDESIGN-020 — Dry-run recovery, retry, and operational health contracts.
 * Attempts and quarantine live in the memory recovery store until a future Prisma migrate.
 */

export const MARKETING_RECOVERY_FAILURE_KINDS = [
  "expired_worker_lease",
  "worker_crash",
  "hostinger_restart",
  "provider_timeout",
  "temporary_provider_rejection",
  "permanent_provider_rejection",
  "rate_limited",
  "daily_cap_exhausted",
  "invalid_recipient",
  "rendering_failure",
  "webhook_replay",
  "partial_batch_completion",
  "unsubscribe",
  "complaint",
  "hard_bounce",
  "permanent_suppression",
  "terminal_success",
] as const;

export type MarketingRecoveryFailureKind = (typeof MARKETING_RECOVERY_FAILURE_KINDS)[number];

export const MARKETING_WORKER_STATUSES = [
  "idle",
  "running",
  "waiting_lease",
  "paused",
  "stopped",
  "lease_expired",
  "crashed",
  "simulated_idle",
] as const;

export type MarketingWorkerStatus = (typeof MARKETING_WORKER_STATUSES)[number];

export const MARKETING_HEALTH_FIELD_SOURCES = ["durable", "simulated"] as const;
export type MarketingHealthFieldSource = (typeof MARKETING_HEALTH_FIELD_SOURCES)[number];

export type MarketingHealthField<T> = {
  value: T;
  source: MarketingHealthFieldSource;
  note?: string;
};

export type MarketingDeliveryAttemptRecord = {
  id: string;
  organizationId: string;
  campaignId: string;
  snapshotRecipientId: string;
  idempotencyKey: string;
  attemptNumber: number;
  workerId: string;
  failureKind: MarketingRecoveryFailureKind | null;
  retryable: boolean;
  status: "claimed" | "sent" | "failed" | "skipped" | "suppressed" | "quarantined";
  dryRun: true;
  createdAt: string;
};

export type MarketingQuarantineRecord = {
  id: string;
  organizationId: string;
  campaignId: string;
  snapshotRecipientId: string;
  idempotencyKey: string;
  normalizedEmail: string;
  reason: "exhausted_retries" | "permanent_provider_rejection" | "invalid_recipient";
  attemptCount: number;
  createdAt: string;
  reviewRequired: true;
};

export type MarketingWorkerHeartbeat = {
  organizationId: string;
  campaignId: string;
  workerId: string;
  at: string;
};

export type MarketingOperationalHealthSnapshot = {
  organizationId: string;
  campaignId: string | null;
  generatedAt: string;
  dryRun: true;
  liveSend: false;
  cronRegistered: false;
  workerStatus: MarketingHealthField<MarketingWorkerStatus>;
  lastHeartbeat: MarketingHealthField<string | null>;
  activeLease: MarketingHealthField<{
    holderId: string | null;
    expiresAt: string | null;
    pauseState: string | null;
  }>;
  nextScheduledRun: MarketingHealthField<string | null>;
  delayedBatches: MarketingHealthField<number>;
  exhaustedRetries: MarketingHealthField<number>;
  quarantinedRecipients: MarketingHealthField<number>;
  providerAvailability: MarketingHealthField<"unavailable" | "fixture">;
  schedulerStatus: MarketingHealthField<"unregistered" | "idle" | "due">;
  processingLatencyMs: MarketingHealthField<number | null>;
  notice: string;
};
