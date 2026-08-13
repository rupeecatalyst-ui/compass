/**
 * CO-MARKETING-MKT-06 — Deterministic recipient execution identity.
 */

import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";

export function buildMarketingExecutionIdempotencyKey(input: {
  campaignId: string;
  channel: MarketingChannel;
  recipientFingerprint: string;
}): string {
  return `${input.campaignId}:${input.channel}:${input.recipientFingerprint}`.toLowerCase();
}
