/**
 * CO-MARKETING-MKT-01 / MKT-06 — Campaign Execution Port.
 * Async batch / pacing — no long-running HTTP.
 */

export type {
  MarketingExecutionTickResult,
} from "@/types/enterprise-marketing-execution";

export type MarketingCampaignExecutionPort = {
  /** Claim and process at most one paced batch for a RUNNING campaign. */
  tickBatch(
    campaignId: string,
  ): Promise<import("@/types/enterprise-marketing-execution").MarketingExecutionTickResult>;
  pause(campaignId: string, reason?: string): Promise<void>;
  resume(campaignId: string): Promise<void>;
};
