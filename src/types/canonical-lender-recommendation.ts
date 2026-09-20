import type { CustomerAssessmentInput } from "@/lib/home-loan-recommendation/assisted-offer";
import type { HomeLoanRecommendationEngineResult } from "@/lib/home-loan-recommendation/engine";

export const CANONICAL_RECOMMENDATION_PRODUCTS = ["HOME_LOAN", "HOME_LOAN_BT"] as const;
export type CanonicalRecommendationProduct = (typeof CANONICAL_RECOMMENDATION_PRODUCTS)[number];

export type CanonicalLenderRecommendationRequest = {
  organizationId: string;
  product: CanonicalRecommendationProduct;
  customer: CustomerAssessmentInput;
  asOf?: Date;
};

export type CanonicalProgrammeRejection = {
  programmeId: string;
  code: string;
  reason: string;
};

export type CanonicalRecommendationCard = HomeLoanRecommendationEngineResult["cards"][number] & {
  policyId: string;
  policyVersionId: string;
  policyVersionNumber: number;
  lenderScore: null;
};

export type CanonicalLenderRecommendationResult = {
  status: "ready" | "no_eligible_programmes" | "configuration_error";
  product: CanonicalRecommendationProduct;
  readOnly: true;
  recommendations: CanonicalRecommendationCard[];
  rejectedProgrammes: CanonicalProgrammeRejection[];
  retrievedProgrammeCount: number;
  evaluatedProgrammeCount: number;
  versions: HomeLoanRecommendationEngineResult["versions"] & {
    lenderScoreVersion: null;
  };
  analyzedAt: string;
};
