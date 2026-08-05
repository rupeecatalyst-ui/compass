/**
 * CO-WP-REC-001 — Configurable Partner Recommendation presentation (Catalyst One).
 * Cards and copy are owned here — Connect never hardcodes recommendation messaging.
 */

import type { PartnerRecommendationPresentationDto } from "@/types/enterprise-partner-recommendations";

export const PARTNER_RECOMMENDATION_ENGINE_VERSION = "CO-WP-REC-001";

export const PARTNER_RECOMMENDATION_PRESENTATION: PartnerRecommendationPresentationDto = {
  stepTitle: "Recommendations",
  stepDescription:
    "Suggested lender programmes based on the customer profile and product you captured. Managed by Catalyst One.",
  readyHeadline: "Suggested programmes for this customer",
  notReadyHeadline: "Recommendations need a little more information",
  emptyHeadline: "No programme suggestions yet",
  emptyMessage:
    "Catalyst One could not suggest programmes for this profile right now. You can continue to documents and the internal team will take it from here.",
  continueCtaLabel: "Continue to Documents",
  cardCtaLabel: "Select",
  suggestedBadgeLabel: "Suggested fit",
};

/** Soft partner guidance when cataloguing gaps — never credit/risk/policy language. */
export const PARTNER_RECOMMENDATION_GAP_MESSAGES: Record<string, string> = {
  product: "Select a product to unlock programme suggestions.",
  amount: "Add the required loan amount to refine suggestions.",
  lending_type: "Lending type helps refine programme fit (optional for now).",
  employment: "Employment type helps refine programme fit (optional for now).",
  city: "Customer city helps refine local programme fit (optional for now).",
  bt_lender: "Existing lender helps Balance Transfer suggestions.",
  property_type: "Property type helps secured programme suggestions.",
  property_value: "Property value helps secured programme suggestions.",
  /** CIBIL / credit — never exposed to Wealth Partners. */
  cibil: "",
};

/** Gap ids that must never appear in Partner guidance. */
export const PARTNER_RECOMMENDATION_FORBIDDEN_GAP_IDS = new Set([
  "cibil",
  "credit_score",
  "risk",
  "policy",
]);
