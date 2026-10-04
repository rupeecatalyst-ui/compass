/**
 * CO-MARKETING-REDESIGN-002 / 020 — Approved failed-delivery retry policy.
 * Terminal successful delivery is never retried. Retries are bounded with backoff.
 */

import { MARKETING_RETRY_BACKOFF_MS } from "@/constants/enterprise-marketing-engine/recovery";
import type { MarketingDurableLedgerStatus } from "@/types/enterprise-marketing-durability";

export const MARKETING_RETRY_MAX_ATTEMPTS = 3 as const;
export const MARKETING_CLAIM_IN_FLIGHT_TTL_MS = 120_000 as const;

export const MARKETING_TERMINAL_SUCCESS_STATUSES = ["sent", "delivered"] as const satisfies readonly MarketingDurableLedgerStatus[];
export const MARKETING_TERMINAL_NO_RETRY_STATUSES = [
  "skipped",
  "suppressed",
  "cancelled",
] as const satisfies readonly MarketingDurableLedgerStatus[];
export const MARKETING_RETRYABLE_FAILURE_STATUSES = [
  "failed",
  "deferred",
  "bounced",
] as const satisfies readonly MarketingDurableLedgerStatus[];

export type MarketingRetryPolicy = {
  maxAttempts: number;
  inFlightTtlMs: number;
  backoffMs?: readonly number[];
};

export const MARKETING_APPROVED_RETRY_POLICY: MarketingRetryPolicy = {
  maxAttempts: MARKETING_RETRY_MAX_ATTEMPTS,
  inFlightTtlMs: MARKETING_CLAIM_IN_FLIGHT_TTL_MS,
  backoffMs: MARKETING_RETRY_BACKOFF_MS,
};

export function marketingRetryBackoffMs(
  attemptCount: number,
  policy: MarketingRetryPolicy = MARKETING_APPROVED_RETRY_POLICY,
): number {
  if (attemptCount <= 0) return 0;
  const schedule = policy.backoffMs ?? MARKETING_RETRY_BACKOFF_MS;
  const index = Math.min(attemptCount, schedule.length) - 1;
  return schedule[index] ?? 0;
}

/**
 * Backoff is skipped when processedAt is ahead of the worker clock (fixture vs Date.now()).
 * That preserves 004 retry ticks that inject a historical `now` after a real-time finalize.
 */
export function isMarketingRetryBackedOff(
  processedAt: string | null | undefined,
  attemptCount: number,
  nowMs: number,
  policy: MarketingRetryPolicy = MARKETING_APPROVED_RETRY_POLICY,
): boolean {
  if (!processedAt) return false;
  const processedMs = Date.parse(processedAt);
  if (!Number.isFinite(processedMs) || processedMs > nowMs) return false;
  return nowMs < processedMs + marketingRetryBackoffMs(attemptCount, policy);
}

export function nextMarketingRetryAtIso(
  processedAt: string | null | undefined,
  attemptCount: number,
  policy: MarketingRetryPolicy = MARKETING_APPROVED_RETRY_POLICY,
): string | null {
  if (!processedAt) return null;
  const processedMs = Date.parse(processedAt);
  if (!Number.isFinite(processedMs)) return null;
  return new Date(processedMs + marketingRetryBackoffMs(attemptCount, policy)).toISOString();
}

export function isTerminalSuccessfulDelivery(status: MarketingDurableLedgerStatus): boolean {
  return (MARKETING_TERMINAL_SUCCESS_STATUSES as readonly string[]).includes(status);
}

export function isTerminalNoRetryStatus(status: MarketingDurableLedgerStatus): boolean {
  return (
    isTerminalSuccessfulDelivery(status) ||
    (MARKETING_TERMINAL_NO_RETRY_STATUSES as readonly string[]).includes(status)
  );
}

export function isRetryableFailureStatus(status: MarketingDurableLedgerStatus): boolean {
  return (MARKETING_RETRYABLE_FAILURE_STATUSES as readonly string[]).includes(status);
}

export function canRetryFailedMarketingDelivery(
  status: MarketingDurableLedgerStatus,
  attemptCount: number,
  policy: MarketingRetryPolicy = MARKETING_APPROVED_RETRY_POLICY,
): boolean {
  if (!isRetryableFailureStatus(status)) return false;
  return attemptCount < policy.maxAttempts;
}
