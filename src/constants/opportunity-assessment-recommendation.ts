/**
 * Stage 5C5 — operator-facing recommendation copy.
 * Never exposes policy JSON, exceptions, or persistence internals.
 */

export const OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY = {
  ASSESSMENT_NOT_FOUND: "Opportunity Assessment was not found.",
  ASSESSMENT_REVISION_REQUIRED: "No finalized Opportunity Assessment is available yet.",
  ASSESSMENT_NOT_FINALIZED: "Finalize the Opportunity Assessment before Chanakya can recommend lenders.",
  ASSESSMENT_INCOMPLETE: "Opportunity Assessment is incomplete. This is not a lender decision.",
  ASSESSMENT_CONFLICTING: "Opportunity Assessment has conflicting facts. This is not a lender decision.",
  ASSESSMENT_UNSUPPORTED:
    "Canonical recommendation is not available for this assessment. This is not a lender decision.",
  ASSESSMENT_STALE: "Opportunity Assessment is stale. Review and finalize again before recommending.",
  ASSESSMENT_UNCONFIRMED: "Opportunity Assessment has unconfirmed facts. Finalize after review.",
  SELF_EMPLOYED_ASSESSMENT_UNSUPPORTED:
    "Canonical self-employed recommendation methodology is not available.",
  UNSUPPORTED_RECOMMENDATION_PRODUCT: "Canonical recommendation supports Home Loan and Home Loan BT only.",
  UNSUPPORTED_RECOMMENDATION_TRANSACTION: "This transaction type is not supported for canonical recommendation.",
  NO_ELIGIBLE_PROGRAMMES: "No eligible lender programme matched this finalized assessment.",
  READY: "Ordered by assessed offer and applicable ROI. No governed lender score is available.",
  CONFIGURATION_ERROR: "Recommendation configuration is unavailable.",
  RUN_FAILED: "Recommendation could not be completed.",
  CROSS_ORGANIZATION_ACCESS: "Recommendation is not available for this workspace.",
  IDEMPOTENCY_CONFLICT: "This recommendation request does not match the original execution.",
  RUN_ALREADY_TERMINAL: "This recommendation run is already complete.",
} as const;

export type OpportunityAssessmentRecommendationCopyCode =
  keyof typeof OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY;
