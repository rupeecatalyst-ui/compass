/**
 * CO-MARKETING-REDESIGN-010 — Qualification inbox boundary.
 * Open/click never create Contact or Opportunity. No Lead entity.
 */

import {
  MARKETING_ENGAGEMENT_ONLY_INTENTS,
} from "@/constants/enterprise-marketing-engine/qualification";
import {
  canHandoffMarketingQualification,
  evaluateMarketingQualificationState,
} from "@/lib/enterprise-marketing-engine/qualification/evaluate";
import type {
  MarketingQualificationBusinessState,
  MarketingQualificationIntent,
} from "@/types/enterprise-marketing-qualification";

export const MARKETING_QUALIFICATION_INBOX_RULES = {
  openClickDoesNotCreateContact: true,
  openClickDoesNotCreateOpportunity: true,
  deliveredDoesNotQualify: true,
  landingPageDoesNotQualify: true,
  explicitQualifiedInterestRequired: true,
  matchExistingContactBeforeCreate: true,
  preventDuplicateContact: true,
  preventDuplicateOpportunity: true,
  fillMissingIdentityOnly: true,
  neverOverwriteWithBlanks: true,
  opportunityOnlyViaApprovedLiveHandoff: true,
  retainCampaignRecipientAttribution: true,
  noLeadEntity: true,
  defaultHandoffFixtureDryRun: true,
} as const;

export function marketingIntentCreatesCrmRecords(
  intent: MarketingQualificationIntent,
): false {
  void intent;
  return false;
}

export function marketingEngagementOnlyIntent(intent: MarketingQualificationIntent): boolean {
  return (MARKETING_ENGAGEMENT_ONLY_INTENTS as readonly string[]).includes(intent);
}

export function marketingOpenOrClickQualifies(intent: MarketingQualificationIntent): boolean {
  if (!marketingEngagementOnlyIntent(intent) && intent !== "open" && intent !== "click") return false;
  return evaluateMarketingQualificationState({ intent }) === "QUALIFIED";
}

export function canCreateContactFromQualificationState(
  businessState: MarketingQualificationBusinessState,
): boolean {
  return canHandoffMarketingQualification(businessState);
}

export function canCreateOpportunityFromQualificationState(
  businessState: MarketingQualificationBusinessState,
): boolean {
  return canHandoffMarketingQualification(businessState);
}
