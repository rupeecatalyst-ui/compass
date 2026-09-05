/**
 * CO-MARKETING-REDESIGN-017 — Attribution labels and honest-metric rules.
 * Display only. Formulas live in compose-attribution.ts (single implementation).
 */

import type { MarketingAttributionStage } from "@/types/enterprise-marketing-attribution";

export const MARKETING_ATTRIBUTION_NOTICE =
  "Campaign attribution is a read-only projection of existing Catalyst One records. Opportunity, Deal, and Accounting data are not duplicated. Recognised revenue is never inferred from Opportunity value. ROI is Unavailable unless both cost and Accounting-confirmed revenue exist." as const;

export const MARKETING_ATTRIBUTION_STAGE_LABELS: Record<MarketingAttributionStage, string> = {
  campaign: "Campaign",
  audience_snapshot: "Audience snapshot",
  recipient: "Attributed recipient",
  qualified_response: "Qualified response",
  contact: "Contact",
  opportunity: "Opportunity",
  deal: "Deal",
  disbursal: "Disbursed business",
  recognised_revenue: "Recognised revenue",
};

export const MARKETING_ATTRIBUTION_RULES = {
  durableCampaignSource: true,
  preserveOriginalCampaignAfterContactMatch: true,
  noDuplicateOpportunityDealAccounting: true,
  readOperationalAmountsFromSsot: true,
  neverInferRevenueFromOpportunityValue: true,
  neverUseDraftOpportunityValue: true,
  roiUnavailableUnlessCostAndRevenue: true,
} as const;

export const MARKETING_ATTRIBUTION_ROI_UNAVAILABLE = "Unavailable" as const;
