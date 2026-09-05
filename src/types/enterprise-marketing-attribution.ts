/**
 * CO-MARKETING-REDESIGN-017 — Campaign attribution from response to revenue.
 * Projection only. Does not duplicate Opportunity, Deal, or Accounting records.
 */

import type { MarketingMetricValue } from "@/types/enterprise-marketing-analytics";

export const MARKETING_ATTRIBUTION_STAGES = [
  "campaign",
  "audience_snapshot",
  "recipient",
  "qualified_response",
  "contact",
  "opportunity",
  "deal",
  "disbursal",
  "recognised_revenue",
] as const;

export type MarketingAttributionStage = (typeof MARKETING_ATTRIBUTION_STAGES)[number];

export type MarketingAttributionFilters = {
  campaignId?: string | null;
  product?: string | null;
  ownerUserId?: string | null;
  from?: string | null;
  to?: string | null;
};

/** Existing Opportunity Registry projection — never a marketing copy. */
export type MarketingAttributedOpportunitySsot = {
  id: string;
  requiredAmount: number | null;
  amountProvenance: "persisted" | "draft" | "unspecified";
  stage?: string | null;
  product?: string | null;
  ownerUserId?: string | null;
  /** Must not replace qualification.campaignId after Contact match. */
  campaignId?: string | null;
};

/** Existing Enterprise Deal Registry projection — never a marketing copy. */
export type MarketingAttributedDealSsot = {
  id: string;
  opportunityId: string;
  stage: string;
  disbursedAmount: number | null;
  disbursedConfirmed: boolean;
};

/** Existing Accounting confirmation — never inferred from Opportunity value. */
export type MarketingAttributedAccountingSsot = {
  dealId: string;
  recognisedRevenue: number;
  confirmed: true;
};

export type MarketingCampaignCostSsot = {
  campaignId: string;
  costAmount: number;
};

export type MarketingAttributionChainRow = {
  campaignId: string;
  campaignName: string | null;
  snapshotId: string | null;
  snapshotRecipientId: string | null;
  recipientFingerprintPreview: string;
  qualificationId: string | null;
  contactId: string | null;
  contactCreated: boolean | null;
  opportunityId: string | null;
  opportunityCreated: boolean | null;
  dealId: string | null;
  product: string | null;
  ownerUserId: string | null;
  attributedAt: string;
  stageReached: MarketingAttributionStage;
  originalCampaignId: string;
};

export type MarketingAttributionDashboard = {
  sprint: "CO-MARKETING-REDESIGN-017";
  generatedAt: string;
  notice: string;
  filters: MarketingAttributionFilters;
  chain: MarketingAttributionStage[];
  attributedRecipients: MarketingMetricValue;
  qualifiedResponses: MarketingMetricValue;
  conversionRate: MarketingMetricValue;
  contactsCreated: MarketingMetricValue;
  contactsReused: MarketingMetricValue;
  opportunitiesCreated: MarketingMetricValue;
  totalOpportunityValue: MarketingMetricValue;
  dealsCreated: MarketingMetricValue;
  disbursedAmount: MarketingMetricValue;
  recognisedRevenue: MarketingMetricValue;
  campaignCost: MarketingMetricValue;
  campaignRoi: MarketingMetricValue;
  rows: MarketingAttributionChainRow[];
};
