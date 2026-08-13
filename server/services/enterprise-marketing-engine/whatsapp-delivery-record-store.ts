/**
 * CO-MARKETING-MKT-09 — WhatsApp delivery idempotency + observability records.
 */

import type { MarketingWhatsAppDeliveryRecord } from "@/types/enterprise-marketing-whatsapp-delivery";

const byKey = new Map<string, MarketingWhatsAppDeliveryRecord>();
const byCampaign = new Map<string, string[]>();

export const marketingWhatsAppDeliveryRecordStore = {
  getByIdempotencyKey(idempotencyKey: string): MarketingWhatsAppDeliveryRecord | null {
    return byKey.get(idempotencyKey.toLowerCase()) ?? null;
  },

  record(entry: MarketingWhatsAppDeliveryRecord): MarketingWhatsAppDeliveryRecord {
    const key = entry.idempotencyKey.toLowerCase();
    byKey.set(key, entry);
    const list = byCampaign.get(entry.campaignId) ?? [];
    if (!list.includes(entry.id)) list.push(entry.id);
    byCampaign.set(entry.campaignId, list);
    return entry;
  },

  listByCampaign(campaignId: string, limit = 50): MarketingWhatsAppDeliveryRecord[] {
    const ids = byCampaign.get(campaignId) ?? [];
    return ids
      .slice(-limit)
      .map((id) => [...byKey.values()].find((r) => r.id === id))
      .filter(Boolean) as MarketingWhatsAppDeliveryRecord[];
  },

  resetCampaign(campaignId: string) {
    const ids = new Set(byCampaign.get(campaignId) ?? []);
    byCampaign.delete(campaignId);
    for (const [key, rec] of byKey.entries()) {
      if (ids.has(rec.id)) byKey.delete(key);
    }
  },
};
