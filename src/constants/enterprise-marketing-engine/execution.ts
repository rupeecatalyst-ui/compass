/**
 * CO-MARKETING-MKT-06 — Batch execution + ledger constants.
 */

import type { MarketingBatchPolicy } from "@/types/enterprise-marketing-execution";

/** Default example: 100 per batch, 2.5h interval, 9–7 window. */
export const MARKETING_DEFAULT_BATCH_POLICY: MarketingBatchPolicy = {
  batchSize: 100,
  intervalMs: 2.5 * 60 * 60 * 1000,
  dailyMax: 500,
  sendWindowStart: "09:00",
  sendWindowEnd: "19:00",
  timezone: "Asia/Kolkata",
  startAt: null,
  endAt: null,
};

/**
 * CO-MARKETING-ACTIVATION-002 — Controlled test batch sizes (not full-audience send).
 * Live unrestricted bulk remains gated by ENTERPRISE_MARKETING_EXECUTION_ENABLED.
 */
export const MARKETING_CONTROLLED_TEST_BATCH_SIZES = [5, 10, 20] as const;
export type MarketingControlledTestBatchSize =
  (typeof MARKETING_CONTROLLED_TEST_BATCH_SIZES)[number];

export const MARKETING_RECIPIENT_LEDGER_STATUSES = [
  "eligible",
  "queued",
  "processing",
  "processed",
  "delivered",
  "failed",
  "skipped",
  "suppressed",
] as const;

/** Worker lease TTL — survives serverless tick, prevents duplicate workers. */
export const MARKETING_EXECUTION_LEASE_TTL_MS = 90_000 as const;

/** Max campaigns processed per cron invocation. */
export const MARKETING_CRON_MAX_CAMPAIGNS_PER_TICK = 5 as const;

/** Stream page size while filling a batch. */
export const MARKETING_EXECUTION_STREAM_PAGE_SIZE = 50 as const;
