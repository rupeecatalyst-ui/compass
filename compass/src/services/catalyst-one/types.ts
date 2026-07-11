/** Catalyst One → COMPASS discovery intelligence contract (master template). */

export type DiscoveryProductId = "home-loan";

export type DiscoveryAnswersPayload = {
  propertyType?: "ready" | "construction";
  loanAmount: number;
  propertyValue: number;
  mobile: string;
  otpVerified: boolean;
  incomeType?: "salaried" | "business" | "professional";
  monthlyIncome: number;
  existingEmi: number;
  city: string;
};

export type CompassAdvantageResult = {
  title: string;
  amount: number;
  amountFormatted: string;
  disclaimer: string;
};

export type LenderRecommendationResult = {
  id: string;
  name: string;
  logoUrl: string | null;
  initials: string;
  matchScore: number;
  interestRate: string;
  estimatedEmi: string;
  processingTime: string;
  reasons: string[];
  benefits: string[];
  tier: "best" | "strong" | "alternative";
};

export type SarathiIntelligenceResult = {
  /** Ordered advisor messages — opening, why #1, why #2, comparison, next steps. */
  messages: string[];
};

export type DiscoveryIntelligenceResult = {
  product: DiscoveryProductId;
  advantage: CompassAdvantageResult;
  lenders: LenderRecommendationResult[];
  sarathi: SarathiIntelligenceResult;
  source: "catalyst-one";
};

export type DiscoveryIntelligenceRequest = {
  product: DiscoveryProductId;
  answers: DiscoveryAnswersPayload;
};
