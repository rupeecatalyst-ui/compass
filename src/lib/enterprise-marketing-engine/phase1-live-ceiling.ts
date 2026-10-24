/**
 * Phase 1 Marketing send limits. Fail closed. Never truncate a frozen audience.
 * Campaign size never overrides batch or daily pacing.
 */

import {
  MARKETING_PHASE1_BATCH_RECIPIENT_CEILING,
  MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING,
  MARKETING_PHASE1_DAILY_RECIPIENT_CEILING,
  MARKETING_PHASE1_LIVE_RECIPIENT_CEILING,
  MARKETING_SMTP_BLOCK,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import {
  MARKETING_DEFAULT_BATCH_POLICY,
  MARKETING_DEFAULT_BATCH_SIZE,
} from "@/constants/enterprise-marketing-engine/execution";
import type { MarketingBatchPolicy } from "@/types/enterprise-marketing-execution";

function finiteCount(value: number): number {
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

export function assessMarketingPhase1CampaignAudienceCeiling(recipientCount: number): {
  ok: boolean;
  code: string | null;
  ceiling: typeof MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING;
  recipientCount: number;
} {
  const count = finiteCount(recipientCount);
  if (count > MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING) {
    return {
      ok: false,
      code: MARKETING_SMTP_BLOCK.audienceLimitExceeded,
      ceiling: MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING,
      recipientCount: count,
    };
  }
  return {
    ok: true,
    code: null,
    ceiling: MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING,
    recipientCount: count,
  };
}

/** Compatibility alias: campaign audience, not a batch size. */
export const assessMarketingPhase1LiveAudienceCeiling = assessMarketingPhase1CampaignAudienceCeiling;

export function assertMarketingPhase1CampaignAudienceCeiling(recipientCount: number): void {
  const assessment = assessMarketingPhase1CampaignAudienceCeiling(recipientCount);
  if (assessment.ok) return;
  const { code, ...details } = assessment;
  throw Object.assign(
    new Error(
      `Approved Marketing campaigns cannot exceed ${MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING} frozen recipients.`,
    ),
    { statusCode: 403, code, ...details },
  );
}

export const assertMarketingPhase1LiveAudienceCeiling = assertMarketingPhase1CampaignAudienceCeiling;

export function clampMarketingBatchPolicy(policy: MarketingBatchPolicy): MarketingBatchPolicy {
  const requestedBatch = policy.batchSize || MARKETING_DEFAULT_BATCH_SIZE;
  const requestedDaily = policy.dailyMax || MARKETING_DEFAULT_BATCH_POLICY.dailyMax;
  return {
    ...policy,
    batchSize: Math.min(Math.max(1, requestedBatch), MARKETING_PHASE1_BATCH_RECIPIENT_CEILING),
    dailyMax: Math.min(Math.max(1, requestedDaily), MARKETING_PHASE1_DAILY_RECIPIENT_CEILING),
  };
}

export function assertMarketingPhase1BatchCeiling(recipientCount: number): void {
  if (finiteCount(recipientCount) > MARKETING_PHASE1_BATCH_RECIPIENT_CEILING) {
    throw Object.assign(
      new Error(
        `Marketing execution cannot process more than ${MARKETING_PHASE1_BATCH_RECIPIENT_CEILING} recipients in one batch.`,
      ),
      {
        statusCode: 403,
        code: MARKETING_SMTP_BLOCK.batchLimitExceeded,
        ceiling: MARKETING_PHASE1_BATCH_RECIPIENT_CEILING,
        recipientCount,
      },
    );
  }
}

export function assertMarketingPhase1DailyCeiling(recipientCount: number): void {
  if (finiteCount(recipientCount) > MARKETING_PHASE1_DAILY_RECIPIENT_CEILING) {
    throw Object.assign(
      new Error(
        `Marketing execution cannot send more than ${MARKETING_PHASE1_DAILY_RECIPIENT_CEILING} recipients in one day.`,
      ),
      {
        statusCode: 403,
        code: MARKETING_SMTP_BLOCK.dailyLimitExceeded,
        ceiling: MARKETING_PHASE1_DAILY_RECIPIENT_CEILING,
        recipientCount,
      },
    );
  }
}

export {
  MARKETING_PHASE1_BATCH_RECIPIENT_CEILING,
  MARKETING_PHASE1_CAMPAIGN_AUDIENCE_CEILING,
  MARKETING_PHASE1_DAILY_RECIPIENT_CEILING,
  MARKETING_PHASE1_LIVE_RECIPIENT_CEILING,
};
