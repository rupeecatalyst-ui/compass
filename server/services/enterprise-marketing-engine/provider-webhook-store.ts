/**
 * CO-MARKETING-REDESIGN-014 — In-memory provider send intents + webhook chronology.
 * Raw provider references are stored without secrets. DNS is never persisted as truth.
 */

import type {
  MarketingProviderMappedEvent,
  MarketingProviderSendRequest,
  MarketingProviderSendResponse,
} from "@/types/enterprise-marketing-provider-contracts";

export type MarketingProviderSendIntent = {
  organizationId: string;
  campaignId: string;
  campaignVersionId: string;
  recipientLedgerId: string;
  recipientFingerprint: string;
  idempotencyKey: string;
  providerMessageId: string;
  acceptedAt: string;
  deliveredAt: string | null;
};

const intentsByIdempotency = new Map<string, MarketingProviderSendIntent>();
const intentsByMessageId = new Map<string, MarketingProviderSendIntent>();
const eventsByProviderId = new Map<string, MarketingProviderMappedEvent>();
const chronology: MarketingProviderMappedEvent[] = [];

export const marketingProviderWebhookStore = {
  rememberSend(request: MarketingProviderSendRequest, response: MarketingProviderSendResponse) {
    if (response.decision !== "accepted" || !response.providerMessageId) return;
    const intent: MarketingProviderSendIntent = {
      organizationId: request.organizationId,
      campaignId: request.campaignId,
      campaignVersionId: request.campaignVersionId,
      recipientLedgerId: request.recipientLedgerId,
      recipientFingerprint: request.tracking.recipientFingerprint,
      idempotencyKey: request.idempotencyKey,
      providerMessageId: response.providerMessageId,
      acceptedAt: response.timestamp,
      deliveredAt: null,
    };
    intentsByIdempotency.set(request.idempotencyKey, intent);
    intentsByMessageId.set(response.providerMessageId, intent);
  },

  getIntentByIdempotency(idempotencyKey: string): MarketingProviderSendIntent | null {
    return intentsByIdempotency.get(idempotencyKey) ?? null;
  },

  getIntentByMessageId(providerMessageId: string): MarketingProviderSendIntent | null {
    return intentsByMessageId.get(providerMessageId) ?? null;
  },

  markDelivered(providerMessageId: string, at: string) {
    const intent = intentsByMessageId.get(providerMessageId);
    if (!intent) return;
    intent.deliveredAt = at;
  },

  getByProviderEventId(providerEventId: string): MarketingProviderMappedEvent | null {
    return eventsByProviderId.get(providerEventId.toLowerCase()) ?? null;
  },

  append(event: MarketingProviderMappedEvent): { event: MarketingProviderMappedEvent; duplicate: boolean } {
    const key = event.providerEventId.toLowerCase();
    const existing = eventsByProviderId.get(key);
    if (existing) return { event: existing, duplicate: true };
    eventsByProviderId.set(key, event);
    chronology.push(event);
    return { event, duplicate: false };
  },

  list(organizationId: string): MarketingProviderMappedEvent[] {
    return chronology
      .filter((row) => row.organizationId === organizationId)
      .slice()
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.recordedAt.localeCompare(b.recordedAt));
  },

  reset(): void {
    intentsByIdempotency.clear();
    intentsByMessageId.clear();
    eventsByProviderId.clear();
    chronology.length = 0;
  },
};
