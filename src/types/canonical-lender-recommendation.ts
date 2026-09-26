import type { CustomerAssessmentInput } from "@/lib/home-loan-recommendation/assisted-offer";
import type { HomeLoanRecommendationEngineResult } from "@/lib/home-loan-recommendation/engine";

export const CANONICAL_RECOMMENDATION_PRODUCTS = ["HOME_LOAN", "HOME_LOAN_BT"] as const;
export type CanonicalRecommendationProduct = (typeof CANONICAL_RECOMMENDATION_PRODUCTS)[number];

export type CanonicalLenderRecommendationRequest = {
  organizationId: string;
  product: CanonicalRecommendationProduct;
  customer: CustomerAssessmentInput & { employmentType?: string | null; state?: string | null };
  asOf?: Date;
};

export type CanonicalProgrammeRejection = {
  programmeId: string;
  code: string;
  reason: string;
  missingInputs?: CanonicalAssessmentField[];
};

/** Fixed public vocabulary only; never policy payloads, database errors or borrower values. */
export type CanonicalAssessmentField =
  | "residency" | "cibil" | "dateOfBirth" | "requestedTenure" | "employment"
  | "monthlyIncome" | "obligations" | "propertyValue" | "propertyType" | "constructionStatus"
  | "constitution" | "city" | "state" | "requestedAmount" | "coApplicant"
  | "btOutstanding" | "loanStartDate" | "repaymentTrack" | "delayedEmis"
  | "occupancy" | "possession" | "registration";

export type CanonicalRecommendationCard = HomeLoanRecommendationEngineResult["cards"][number] & {
  policyId: string;
  policyVersionId: string;
  policyVersionNumber: number;
  lenderScore: null;
  matchPercent: number | null;
  matchRank: number | null;
  presentationTier: "primary" | "additional" | "evaluated" | null;
  criterionContributions: Array<{
    criterionKey: string;
    criterionScore: number | null;
    weightPercent: number;
    weightedContribution: number | null;
    status: string;
    inputs?: Readonly<Record<string, number | string | boolean | null>> | null;
  }> | null;
};

export type CanonicalLenderRecommendationResult = {
  status: "ready" | "no_eligible_programmes" | "configuration_error";
  product: CanonicalRecommendationProduct;
  readOnly: true;
  recommendations: CanonicalRecommendationCard[];
  rejectedProgrammes: CanonicalProgrammeRejection[];
  retrievedProgrammeCount: number;
  evaluatedProgrammeCount: number;
  presentation?: {
    primaryProgrammeIds: string[];
    additionalProgrammeIds: string[];
  };
  matchPercent?: {
    ruleSetId: string | null;
    ruleSetLineageId: string | null;
    ruleSetVersion: number | null;
    weights: Record<string, number> | null;
    failureCode: string | null;
  };
  versions: HomeLoanRecommendationEngineResult["versions"] & {
    lenderScoreVersion: null;
  };
  analyzedAt: string;
  missingInputs?: CanonicalAssessmentField[];
  cibilNotKnownDisclaimer?: boolean;
};
