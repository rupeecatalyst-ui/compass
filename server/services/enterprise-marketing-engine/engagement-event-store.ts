/**
 * CO-MARKETING-MKT-10 — Append-only engagement event store (no audience rows).
 */

import type { MarketingChannel } from "@/constants/enterprise-marketing-engine";
import type {
  MarketingEngagementEvent,
  MarketingEngagementEventType,
} from "@/types/enterprise-marketing-analytics";

const byProviderEventId = new Map<string, MarketingEngagementEvent>();
const byId = new Map<string, MarketingEngagementEvent>();
let seq = 0;

function nowIso() {
  return new Date().toISOString();
}

export const marketingEngagementEventStore = {
  getByProviderEventId(providerEventId: string): MarketingEngagementEvent | null {
    return byProviderEventId.get(providerEventId.toLowerCase()) ?? null;
  },

  list(organizationId: string): MarketingEngagementEvent[] {
    return [...byId.values()]
      .filter((e) => e.organizationId === organizationId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  },

  listByCampaign(campaignId: string): MarketingEngagementEvent[] {
    return [...byId.values()]
      .filter((e) => e.campaignId === campaignId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  },

  /**
   * Idempotent append. Duplicate providerEventId returns the existing row.
   */
  record(input: {
    organizationId: string;
    campaignId: string;
    campaignVersionId?: string | null;
    channel: MarketingChannel;
    type: MarketingEngagementEventType;
    recipientFingerprint: string;
    occurredAt?: string;
    providerEventId: string;
    idempotencyKey?: string | null;
    batchId?: string | null;
    sourceBindingId?: string | null;
    sourceDatasetId?: string | null;
    audienceId?: string | null;
    errorCode?: string | null;
  }): { event: MarketingEngagementEvent; duplicate: boolean } {
    const providerEventId = input.providerEventId.trim().toLowerCase();
    const existing = byProviderEventId.get(providerEventId);
    if (existing) return { event: existing, duplicate: true };

    seq += 1;
    const ts = nowIso();
    const event: MarketingEngagementEvent = {
      id: `mkt-eng-${seq}`,
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      campaignVersionId: input.campaignVersionId ?? null,
      channel: input.channel,
      type: input.type,
      recipientFingerprint: input.recipientFingerprint,
      occurredAt: input.occurredAt ?? ts,
      recordedAt: ts,
      providerEventId,
      idempotencyKey: input.idempotencyKey ?? null,
      batchId: input.batchId ?? null,
      sourceBindingId: input.sourceBindingId ?? null,
      sourceDatasetId: input.sourceDatasetId ?? null,
      audienceId: input.audienceId ?? null,
      errorCode: input.errorCode ?? null,
    };
    byId.set(event.id, event);
    byProviderEventId.set(providerEventId, event);
    return { event, duplicate: false };
  },

  resetOrganization(organizationId: string) {
    for (const [id, event] of [...byId.entries()]) {
      if (event.organizationId !== organizationId) continue;
      byId.delete(id);
      byProviderEventId.delete(event.providerEventId);
    }
  },
};
