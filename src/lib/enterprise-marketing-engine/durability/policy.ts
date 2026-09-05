/**
 * CO-MARKETING-REDESIGN-001 — Default paced-delivery policy (100 / 60 minutes).
 * Live sending remains disabled at the safety constant layer.
 */

import type { MarketingBatchPolicy } from "@/types/enterprise-marketing-execution";
import {
  MARKETING_DEFAULT_BATCH_INTERVAL_MS,
  MARKETING_DEFAULT_BATCH_POLICY,
  MARKETING_DEFAULT_BATCH_SIZE,
} from "@/constants/enterprise-marketing-engine/execution";
import { computeMarketingSnapshotPacingPlan } from "@/lib/enterprise-marketing-engine/execution/snapshot-pacing-plan";

export const MARKETING_APPROVED_DEFAULT_BATCH_SIZE = MARKETING_DEFAULT_BATCH_SIZE;
export const MARKETING_APPROVED_DEFAULT_INTERVAL_MS = MARKETING_DEFAULT_BATCH_INTERVAL_MS;

export function resolveMarketingDefaultBatchPolicy(): MarketingBatchPolicy {
  return { ...MARKETING_DEFAULT_BATCH_POLICY };
}

export function assertMarketingDefaultPacingPolicy(
  policy: MarketingBatchPolicy = MARKETING_DEFAULT_BATCH_POLICY,
): void {
  if (policy.batchSize !== MARKETING_APPROVED_DEFAULT_BATCH_SIZE) {
    throw Object.assign(
      new Error(
        `Default batch size must be ${MARKETING_APPROVED_DEFAULT_BATCH_SIZE}, received ${policy.batchSize}`,
      ),
      { statusCode: 500, code: "INVALID_DEFAULT_BATCH_SIZE" },
    );
  }
  if (policy.intervalMs !== MARKETING_APPROVED_DEFAULT_INTERVAL_MS) {
    throw Object.assign(
      new Error(
        `Default batch interval must be ${MARKETING_APPROVED_DEFAULT_INTERVAL_MS}ms (60 minutes)`,
      ),
      { statusCode: 500, code: "INVALID_DEFAULT_BATCH_INTERVAL" },
    );
  }
}

export function validateMarketingBatchPolicy(policy: MarketingBatchPolicy): void {
  if (!Number.isInteger(policy.batchSize) || policy.batchSize < 1 || policy.batchSize > 500) {
    throw Object.assign(new Error("Batch size must be an integer from 1 to 500"), {
      statusCode: 400,
      code: "INVALID_BATCH_SIZE",
    });
  }
  if (!Number.isFinite(policy.intervalMs) || policy.intervalMs < 60_000) {
    throw Object.assign(new Error("Batch interval must be at least 60 seconds"), {
      statusCode: 400,
      code: "INVALID_BATCH_INTERVAL",
    });
  }
  if (!Number.isInteger(policy.dailyMax) || policy.dailyMax < 1) {
    throw Object.assign(new Error("Daily maximum must be a positive integer"), {
      statusCode: 400,
      code: "INVALID_DAILY_MAX",
    });
  }
  if (!/^\d{2}:\d{2}$/.test(policy.sendWindowStart) || !/^\d{2}:\d{2}$/.test(policy.sendWindowEnd)) {
    throw Object.assign(new Error("Send window must use HH:mm"), {
      statusCode: 400,
      code: "INVALID_SEND_WINDOW",
    });
  }
  if (!policy.timezone.trim()) {
    throw Object.assign(new Error("Timezone is required"), {
      statusCode: 400,
      code: "INVALID_TIMEZONE",
    });
  }
}

export function estimateMarketingBatchCount(eligibleCount: number, batchSize: number): number {
  if (eligibleCount <= 0) return 0;
  const size = Math.max(1, batchSize);
  return Math.ceil(eligibleCount / size);
}

export function estimateMarketingCompletionAt(input: {
  firstScheduledAt: Date;
  eligibleCount: number;
  policy: MarketingBatchPolicy;
}): Date {
  const plan = computeMarketingSnapshotPacingPlan({
    eligibleCount: input.eligibleCount,
    policy: input.policy,
    now: input.firstScheduledAt,
  });
  return plan.expectedCompletionAt
    ? new Date(plan.expectedCompletionAt)
    : new Date(input.firstScheduledAt);
}
