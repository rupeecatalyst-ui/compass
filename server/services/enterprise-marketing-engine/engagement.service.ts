/**
 * CO-MARKETING-MKT-10 — Record provider-neutral engagement events from execution/delivery.
 * Never stores email, phone, or sheet row payloads.
 */

import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";
import type { MarketingEngagementEventType } from "@/types/enterprise-marketing-analytics";
import { marketingAudienceDefinitionStore } from "./audience-definition-store";
import { marketingCampaignStore } from "./campaign-store";
import { marketingEngagementEventStore } from "./engagement-event-store";

export function buildMarketingEngagementProviderEventId(input: {
  campaignId: string;
  type: MarketingEngagementEventType;
  idempotencyKey?: string | null;
  recipientFingerprint: string;
  extra?: string | null;
}): string {
  const identity = input.idempotencyKey || input.recipientFingerprint;
  return `eme:${input.campaignId}:${input.type}:${identity}:${input.extra ?? "v1"}`.toLowerCase();
}

export function emitMarketingEngagementEvent(input: {
  organizationId: string;
  campaignId: string;
  campaignVersionId?: string | null;
  channel: MarketingChannel;
  type: MarketingEngagementEventType;
  recipientFingerprint: string;
  occurredAt?: string;
  providerEventId?: string;
  idempotencyKey?: string | null;
  batchId?: string | null;
  errorCode?: string | null;
}) {
  const campaign = marketingCampaignStore.get(input.campaignId);
  const audience = campaign?.audienceId
    ? marketingAudienceDefinitionStore.get(campaign.audienceId)
    : null;
  const providerEventId =
    input.providerEventId ??
    buildMarketingEngagementProviderEventId({
      campaignId: input.campaignId,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      recipientFingerprint: input.recipientFingerprint,
    });

  return marketingEngagementEventStore.record({
    organizationId: input.organizationId,
    campaignId: input.campaignId,
    campaignVersionId: input.campaignVersionId ?? campaign?.activePublishedVersionId ?? null,
    channel: input.channel,
    type: input.type,
    recipientFingerprint: input.recipientFingerprint,
    occurredAt: input.occurredAt,
    providerEventId,
    idempotencyKey: input.idempotencyKey ?? null,
    batchId: input.batchId ?? null,
    sourceBindingId: audience?.bindingId ?? null,
    sourceDatasetId: audience?.datasetId ?? null,
    audienceId: audience?.id ?? campaign?.audienceId ?? null,
    errorCode: input.errorCode ?? null,
  });
}

export function engagementTypeFromDeliveryOutcome(
  outcome: string,
): "SENT" | "FAILED" | null {
  if (outcome === "SENT" || outcome === "ACCEPTED") return "SENT";
  if (
    outcome === "FAILED" ||
    outcome === "PERMANENT_FAILURE" ||
    outcome === "RETRYABLE_FAILURE" ||
    outcome === "RATE_LIMITED" ||
    outcome === "BLOCKED" ||
    outcome === "CANCELLED"
  ) {
    return "FAILED";
  }
  return null;
}
