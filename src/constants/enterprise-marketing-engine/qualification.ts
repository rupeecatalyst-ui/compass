/**
 * CO-MARKETING-MKT-11 — Qualification states, criteria, routing defaults.
 * Aligns PO business states with ARCH-001 process states. No Lead entity.
 */

import type {
  MarketingQualificationBusinessState,
  MarketingQualificationIntent,
  MarketingQualificationPolicy,
} from "@/types/enterprise-marketing-qualification";
import {
  MARKETING_HANDOFF_PROCESS_STATES,
  MARKETING_QUALIFICATION_BUSINESS_STATES,
} from "@/types/enterprise-marketing-qualification";

export {
  MARKETING_HANDOFF_PROCESS_STATES,
  MARKETING_QUALIFICATION_BUSINESS_STATES,
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
];

export const MARKETING_RESPONSE_INTENTS: MarketingQualificationIntent[] = [
  "reply",
  "enquiry",
  "explicit_requirement",
];
