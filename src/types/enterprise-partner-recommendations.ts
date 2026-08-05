/**
 * CO-WP-REC-001 — Partner-facing Recommendation Engine projection.
 *
 * Catalyst One owns ranking (Enterprise Lender Registry / Chanakya SSOT).
 * Catalyst Connect renders this DTO only — never recalculates recommendations.
 *
 * Forbidden in Partner DTO: credit score, risk engine output, policy internals,
 * lender numeric score, Credit Workbench fields.
 */

export type PartnerRecommendationCardDto = {
  id: string;
  /** Display title (e.g. lender programme name) — from Catalyst One. */
  title: string;
  /** Customer/partner-friendly reason — from Catalyst One projection. */
  reason: string;
  /** Optional soft badge (e.g. "Suggested fit") — configurable copy, never a score. */
  badgeLabel?: string | null;
  ctaLabel: string;
  deepLink?: string | null;
  rank: number;
  sortOrder: number;
  /** Opaque registry ref for future deep-links — not for scoring UI. */
  lenderRef?: string | null;
};

export type PartnerRecommendationGuidanceDto = {
  id: string;
  message: string;
};

export type PartnerRecommendationPresentationDto = {
  stepTitle: string;
  stepDescription: string;
  readyHeadline: string;
  notReadyHeadline: string;
  emptyHeadline: string;
  emptyMessage: string;
  continueCtaLabel: string;
  cardCtaLabel: string;
  suggestedBadgeLabel: string;
};

export type PartnerOpportunityRecommendationsDto = {
  version: string;
  dtoSource: "enterprise_partner_recommendation_engine";
  dtoNotice: string;
  opportunityId: string;
  ready: boolean;
  analyzedAt: string;
  presentation: PartnerRecommendationPresentationDto;
  guidance: PartnerRecommendationGuidanceDto[];
  recommendations: PartnerRecommendationCardDto[];
};
