/**
 * CO-MARKETING-MKT-11 — Qualification states, criteria, routing defaults.
 * Aligns PO business states with ARCH-001 process states. No Lead entity.
 */

import type {
  MarketingQualificationBusinessState,
  MarketingQualificationInboxStatus,
  MarketingQualificationIntent,
  MarketingQualificationPolicy,
} from "@/types/enterprise-marketing-qualification";
import {
  MARKETING_HANDOFF_PROCESS_STATES,
  MARKETING_QUALIFICATION_BUSINESS_STATES,
  MARKETING_QUALIFICATION_INBOX_STATUSES,
} from "@/types/enterprise-marketing-qualification";

export {
  MARKETING_HANDOFF_PROCESS_STATES,
  MARKETING_QUALIFICATION_BUSINESS_STATES,
  MARKETING_QUALIFICATION_INBOX_STATUSES,
};

export const MARKETING_QUALIFICATION_STATE_LABELS: Record<
  MarketingQualificationBusinessState,
  string
> = {
  UNQUALIFIED: "Unqualified",
  ENGAGED: "Engaged",
  RESPONSE_RECEIVED: "Response received",
  QUALIFICATION_REQUIRED: "Qualification required",
  QUALIFIED: "Qualified",
  NOT_INTERESTED: "Not interested",
  SUPPRESSED: "Suppressed",
  HANDED_OFF: "Handed off",
};

export const MARKETING_QUALIFICATION_INBOX_STATUS_LABELS: Record<
  MarketingQualificationInboxStatus,
  string
> = {
  NEW: "New",
  UNDER_REVIEW: "Under Review",
  QUALIFIED: "Qualified",
  NOT_QUALIFIED: "Not Qualified",
  DUPLICATE: "Duplicate",
  CONVERTED: "Converted",
  CLOSED: "Closed",
};

/** Engagement-only — never automatic qualification and never Contact/Opportunity. */
export const MARKETING_ENGAGEMENT_ONLY_INTENTS: MarketingQualificationIntent[] = [
  "delivered",
  "open",
  "click",
  "landing_page",
];

/** Genuine campaign responses that may enter the Qualification Inbox. */
export const MARKETING_GENUINE_RESPONSE_INTENTS: MarketingQualificationIntent[] = [
  "reply",
  "enquiry",
  "callback_request",
  "campaign_form",
  "affirmative_response",
  "explicit_requirement",
  "manual_qualification",
];

/** Default policy — no automatic mass conversion. */
export const MARKETING_DEFAULT_QUALIFICATION_POLICY: MarketingQualificationPolicy = {
  autoQualifyOnOpen: false,
  autoQualifyOnClick: false,
  autoQualifyOnReply: false,
  requireExplicitIntent: true,
  requireIdentity: true,
  requireOperatorConfirm: true,
  createOpportunityOnHandoff: true,
};

export const MARKETING_EXPLICIT_INTENTS: MarketingQualificationIntent[] = [
  "explicit_requirement",
  "affirmative_response",
  "manual_qualification",
];

export const MARKETING_RESPONSE_INTENTS: MarketingQualificationIntent[] = [
  ...MARKETING_GENUINE_RESPONSE_INTENTS,
];
