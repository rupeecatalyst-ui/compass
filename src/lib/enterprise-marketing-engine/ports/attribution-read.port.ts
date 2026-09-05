/**
 * CO-MARKETING-REDESIGN-017 — Read-only Opportunity / Deal / Accounting projection.
 * Must never create, update, or delete operational records.
 */

import type {
  MarketingAttributedAccountingSsot,
  MarketingAttributedDealSsot,
  MarketingAttributedOpportunitySsot,
  MarketingCampaignCostSsot,
} from "@/types/enterprise-marketing-attribution";

export type MarketingAttributionSsotBundle = {
  opportunities: MarketingAttributedOpportunitySsot[];
  deals: MarketingAttributedDealSsot[];
  accounting: MarketingAttributedAccountingSsot[];
  campaignCosts: MarketingCampaignCostSsot[];
  /** False when Accounting SSOT was not loaded — revenue must be Unavailable, not zero. */
  accountingAvailable: boolean;
};

export type MarketingAttributionReadPort = {
  readonly kind: "fixture" | "live";
  load(input: {
    organizationId: string;
    opportunityIds: string[];
  }): Promise<MarketingAttributionSsotBundle>;
};
