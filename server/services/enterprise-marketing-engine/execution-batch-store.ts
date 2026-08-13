/**
 * CO-MARKETING-MKT-06 — Batch execution observability records.
 */

import type { MarketingBatchExecutionRecord } from "@/types/enterprise-marketing-execution";

const batches: MarketingBatchExecutionRecord[] = [];
const byCampaign = new Map<string, string[]>();

export const marketingExecutionBatchStore = {
  record(batch: MarketingBatchExecutionRecord): MarketingBatchExecutionRecord {
    batches.push(batch);
    const list = byCampaign.get(batch.campaignId) ?? [];
    list.push(batch.id);
    byCampaign.set(batch.campaignId, list);
    return batch;
  },

  listByCampaign(campaignId: string, limit = 20): MarketingBatchExecutionRecord[] {
    const ids = byCampaign.get(campaignId) ?? [];
    return ids
      .slice(-limit)
      .map((id) => batches.find((b) => b.id === id))
      .filter(Boolean) as MarketingBatchExecutionRecord[];
  },

  countByCampaign(campaignId: string): number {
    return (byCampaign.get(campaignId) ?? []).length;
  },

  listForCampaigns(campaignIds: string[], limitPerCampaign = 50): MarketingBatchExecutionRecord[] {
    const out: MarketingBatchExecutionRecord[] = [];
    for (const id of campaignIds) {
      out.push(...this.listByCampaign(id, limitPerCampaign));
    }
    return out;
  },

  resetCampaign(campaignId: string) {
    const ids = new Set(byCampaign.get(campaignId) ?? []);
    byCampaign.delete(campaignId);
    for (let i = batches.length - 1; i >= 0; i -= 1) {
      if (ids.has(batches[i]!.id)) batches.splice(i, 1);
    }
  },
};
