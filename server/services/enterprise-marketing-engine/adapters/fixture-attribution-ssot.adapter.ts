/**
 * CO-MARKETING-REDESIGN-017 — Fixture Opportunity / Deal / Accounting projections.
 * Isolated from live registries. Tests inject existing SSOT-shaped records.
 * Never writes to Prisma, Opportunity Registry, Deal Registry, or Accounting.
 */

import type { MarketingAttributionReadPort } from "@/lib/enterprise-marketing-engine/ports/attribution-read.port";
import type {
  MarketingAttributedAccountingSsot,
  MarketingAttributedDealSsot,
  MarketingAttributedOpportunitySsot,
  MarketingCampaignCostSsot,
} from "@/types/enterprise-marketing-attribution";

const opportunities = new Map<string, MarketingAttributedOpportunitySsot>();
const deals = new Map<string, MarketingAttributedDealSsot>();
const accounting = new Map<string, MarketingAttributedAccountingSsot>();
const costs = new Map<string, MarketingCampaignCostSsot>();

export const marketingFixtureAttributionSsot = {
  upsertOpportunity(row: MarketingAttributedOpportunitySsot) {
    opportunities.set(row.id, row);
    return row;
  },
  upsertDeal(row: MarketingAttributedDealSsot) {
    deals.set(row.id, row);
    return row;
  },
  upsertAccounting(row: MarketingAttributedAccountingSsot) {
    accounting.set(row.dealId, row);
    return row;
  },
  upsertCost(row: MarketingCampaignCostSsot) {
    costs.set(row.campaignId, row);
    return row;
  },
  snapshot() {
    return {
      opportunities: [...opportunities.values()],
      deals: [...deals.values()],
      accounting: [...accounting.values()],
      campaignCosts: [...costs.values()],
      accountingAvailable: true as const,
    };
  },
  reset() {
    opportunities.clear();
    deals.clear();
    accounting.clear();
    costs.clear();
  },
};

export function createFixtureAttributionReadPort(): MarketingAttributionReadPort {
  return {
    kind: "fixture",
    async load() {
      return marketingFixtureAttributionSsot.snapshot();
    },
  };
}
