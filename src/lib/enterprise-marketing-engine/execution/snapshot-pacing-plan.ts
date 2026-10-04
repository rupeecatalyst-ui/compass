/**
 * CO-MARKETING-REDESIGN-004 — Frozen-snapshot pacing planner.
 * Splits eligible recipients into sequential batches and schedules them.
 * Never reads a live Google Sheet.
 */

import type { MarketingBatchPolicy } from "@/types/enterprise-marketing-execution";
import {
  MARKETING_DEFAULT_BATCH_INTERVAL_MS,
  MARKETING_DEFAULT_BATCH_SIZE,
} from "@/constants/enterprise-marketing-engine/execution";
import { zonedDateKey } from "./batch-schedule";
import {
  isWithinDailySendWindow,
  nextCalendarDayWindowStart,
  nextMarketingSendWindowStart,
} from "./zoned-time";

export type MarketingPacingBatchPlanItem = {
  batchNumber: number;
  offset: number;
  size: number;
  scheduledAt: string;
  zonedDateKey: string;
};

export type MarketingSnapshotPacingPlan = {
  eligibleCount: number;
  batchSize: number;
  intervalMs: number;
  timezone: string;
  batches: MarketingPacingBatchPlanItem[];
  firstBatchAt: string | null;
  expectedCompletionAt: string | null;
};

export function splitMarketingBatchSizes(eligibleCount: number, batchSize: number): number[] {
  const size = Math.max(1, batchSize);
  if (eligibleCount <= 0) return [];
  const sizes: number[] = [];
  let remaining = eligibleCount;
  while (remaining > 0) {
    const chunk = Math.min(size, remaining);
    sizes.push(chunk);
    remaining -= chunk;
  }
  return sizes;
}

function clampToCampaignStart(candidate: Date, policy: MarketingBatchPolicy): Date {
  if (policy.startAt && candidate.getTime() < Date.parse(policy.startAt)) {
    return new Date(policy.startAt);
  }
  return candidate;
}

function nextPermittedSlot(input: {
  candidate: Date;
  policy: MarketingBatchPolicy;
  sentOnDate: Map<string, number>;
  batchSize: number;
}): Date {
  const { policy, sentOnDate, batchSize } = input;
  let t = clampToCampaignStart(input.candidate, policy);
  for (let i = 0; i < 366 * 24; i += 1) {
    if (policy.endAt && t.getTime() > Date.parse(policy.endAt)) {
      throw Object.assign(new Error("Campaign end reached before the batch could be scheduled"), {
        statusCode: 400,
        code: "CAMPAIGN_END_REACHED",
      });
    }
    if (
      !isWithinDailySendWindow(t, policy.sendWindowStart, policy.sendWindowEnd, policy.timezone)
    ) {
      t = nextMarketingSendWindowStart(t, policy.sendWindowStart, policy.sendWindowEnd, policy.timezone);
      t = clampToCampaignStart(t, policy);
      continue;
    }
    const day = zonedDateKey(t, policy.timezone);
    const used = sentOnDate.get(day) ?? 0;
    if (used + batchSize > policy.dailyMax) {
      t = nextCalendarDayWindowStart(t, policy.sendWindowStart, policy.timezone);
      t = clampToCampaignStart(t, policy);
      continue;
    }
    return t;
  }
  throw Object.assign(new Error("Unable to schedule batch within the permitted window"), {
    statusCode: 400,
    code: "PACING_SCHEDULE_EXHAUSTED",
  });
}

export function computeMarketingSnapshotPacingPlan(input: {
  eligibleCount: number;
  policy: MarketingBatchPolicy;
  now?: Date;
}): MarketingSnapshotPacingPlan {
  const policy = input.policy;
  const batchSize = policy.batchSize || MARKETING_DEFAULT_BATCH_SIZE;
  const intervalMs = policy.intervalMs || MARKETING_DEFAULT_BATCH_INTERVAL_MS;
  const sizes = splitMarketingBatchSizes(input.eligibleCount, batchSize);
  const sentOnDate = new Map<string, number>();
  const now = input.now ?? new Date();
  const batches: MarketingPacingBatchPlanItem[] = [];
  let cursor = clampToCampaignStart(now, policy);

  let offset = 0;
  for (let i = 0; i < sizes.length; i += 1) {
    const size = sizes[i]!;
    const scheduled = nextPermittedSlot({
      candidate: cursor,
      policy,
      sentOnDate,
      batchSize: size,
    });
    const day = zonedDateKey(scheduled, policy.timezone);
    sentOnDate.set(day, (sentOnDate.get(day) ?? 0) + size);
    batches.push({
      batchNumber: i + 1,
      offset,
      size,
      scheduledAt: scheduled.toISOString(),
      zonedDateKey: day,
    });
    offset += size;
    cursor = new Date(scheduled.getTime() + intervalMs);
  }

  return {
    eligibleCount: input.eligibleCount,
    batchSize,
    intervalMs,
    timezone: policy.timezone,
    batches,
    firstBatchAt: batches[0]?.scheduledAt ?? null,
    expectedCompletionAt: batches.at(-1)?.scheduledAt ?? null,
  };
}
