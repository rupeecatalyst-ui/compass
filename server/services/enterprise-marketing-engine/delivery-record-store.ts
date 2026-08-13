/**
 * CO-MARKETING-MKT-07 — Delivery idempotency + dry-run observability records.
 */

import type { MarketingEmailDeliveryRecord } from "@/types/enterprise-marketing-email-delivery";

const byKey = new Map<string, MarketingEmailDeliveryRecord>();
const byCampaign = new Map<string, string[]>();

export const marketingEmailDeliveryRecordStore = {
  getByIdempotencyKey(idempotencyKey: string): MarketingEmailDeliveryRecord | null {
    return byKey.get(idempotencyKey.toLowerCase()) ?? null;
  },

  record(entry: MarketingEmailDeliveryRecord): MarketingEmailDeliveryRecord {
    const key = entry.idempotencyKey.toLowerCase();
    byKey.set(key, entry);
    const list = byCampaign.get(entry.campaignId) ?? [];
    if (!list.includes(entry.id)) list.push(entry.id);
    byCampaign.set(entry.campaignId, list);
    return entry;
  },

  listByCampaign(campaignId: string, limit = 50): MarketingEmailDeliveryRecord[] {
    const ids = byCampaign.get(campaignId) ?? [];
    return ids
      .slice(-limit)
      .map((id) => [...byKey.values()].find((r) => r.id === id))
      .filter(Boolean) as MarketingEmailDeliveryRecord[];
  },

  resetCampaign(campaignId: string) {
    const ids = new Set(byCampaign.get(campaignId) ?? []);
    byCampaign.delete(campaignId);
    for (const [key, rec] of byKey.entries()) {
      if (ids.has(rec.id)) byKey.delete(key);
    }
  },
};
