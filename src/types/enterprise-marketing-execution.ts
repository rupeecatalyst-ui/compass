/**
 * CO-MARKETING-MKT-06 — Campaign scheduler + batch execution foundation types.
 * Dry-run only — no provider send. Ledger is minimal execution state, not audience mirror.
 */

import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";

/** Pacing / schedule configuration (BatchPolicy). */
export type MarketingBatchPolicy = {
  batchSize: number;
  /** Milliseconds between batch ticks (e.g. 2.5h = 9_000_000). */
  intervalMs: number;
  dailyMax: number;
  /** Local time HH:mm (24h). */
  sendWindowStart: string;
  sendWindowEnd: string;
  timezone: string;
  startAt: string | null;
  endAt: string | null;
};

/** Ledger disposition — minimal set for dry-run foundation. */
export type MarketingRecipientLedgerStatus =
  | "eligible"
  | "queued"
  | "processing"
  | "processed"
  | "delivered"
  | "failed"
  | "skipped"
  | "suppressed";

export type MarketingRecipientLedgerEntry = {
  id: string;
  campaignId: string;
  campaignVersionId: string;
  channel: MarketingChannel;
  recipientFingerprint: string;
  idempotencyKey: string;
  status: MarketingRecipientLedgerStatus;
  sourceRowNumber?: number | null;
  sourceCursor?: string | null;
  batchId?: string | null;
  attemptCount: number;
  lastError?: string | null;
  claimedAt?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingExecutionLease = {
  campaignId: string;
  organizationId: string;
  batchPolicy: MarketingBatchPolicy;
  nextRunAt: string | null;
  /** Audience stream cursor — resume without restarting campaign. */
  streamCursor: string | null;
  dailyProcessedCount: number;
  /** YYYY-MM-DD in campaign timezone. */
  dailyCountResetDate: string;
  leaseHolder: string | null;
  leaseExpiresAt: string | null;
  lastBatchId: string | null;
  completedAt: string | null;
  errorState: string | null;
  updatedAt: string;
};

export type MarketingBatchExecutionRecord = {
  id: string;
  batchId: string;
  campaignId: string;
  scheduledAt: string;
  startedAt: string;
  completedAt: string | null;
  selectedCount: number;
  eligibleCount: number;
  suppressedCount: number;
  processedCount: number;
  failedCount: number;
  skippedCount: number;
  durationMs: number;
  errorState: string | null;
  dryRun: true;
};

export type MarketingExecutionTickResult = {
  campaignId: string;
  batchId: string;
  dryRun: true;
  skippedReason?: string | null;
  claimed: number;
  selected: number;
  eligible: number;
  suppressed: number;
  processed: number;
  failed: number;
  skipped: number;
  nextRunAt: string | null;
  streamCursor: string | null;
  campaignComplete: boolean;
};

export type MarketingExecutionSummary = {
  campaignId: string;
  lease: MarketingExecutionLease | null;
  ledgerCounts: Record<MarketingRecipientLedgerStatus, number>;
  recentBatches: MarketingBatchExecutionRecord[];
  totalBatches: number;
};
