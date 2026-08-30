/** COMPASS ↔ Catalyst One gateway presentation types. */

export type CompassProductCode =
  | "home-loan"
  | "home-loan-balance-transfer"
  | "personal-loan"
  | "business-loan"
  | "loan-against-property"
  | "working-capital"
  | "construction-finance"
  | "project-finance";

export type DiscoveryAnswersPayload = {
  propertyType?: "ready" | "construction";
  propertyUsage?: string;
  loanAmount: number;
  propertyValue?: number;
  mobile: string;
  otpVerified: boolean;
  incomeType?: "salaried" | "business" | "professional";
  monthlyIncome?: number;
  existingEmi?: number;
  city: string;
  loanPurpose?: string;
  companyName?: string;
  constitution?: string;
  annualTurnover?: number;
  facilityType?: string;
  projectCost?: number;
  currentLender?: string;
  outstandingLoanAmount?: number;
};

export type CompassAdvantageResult = {
  title: string;
  amount: number | null;
  amountFormatted: string | null;
  eligible: boolean;
  status?: "not_available" | "ready";
  disclaimer: string;
};

export type LenderRecommendationResult = {
  id: string;
  name: string;
  logoUrl: string | null;
  initials: string;
  tier: "best" | "strong" | "alternative";
  interestRate: string;
  estimatedEmi: string;
  processingTime: string;
  reasons: string[];
  benefits: string[];
  rank: number;
};

export type SarathiIntelligenceResult = {
  messages: string[];
};

export type DiscoveryIntelligenceResult = {
  product: CompassProductCode;
  advantage: CompassAdvantageResult | null;
  lenders: LenderRecommendationResult[];
  recommendationsStatus: "ready" | "pending" | "unavailable";
  recommendationsMessage: string;
  sarathi: SarathiIntelligenceResult;
  journeySessionToken?: string;
  opportunityRef?: string;
};

export type JourneyStartResponse = {
  journeySessionToken: string;
  journeyRef: string;
  contactRef: string;
  opportunityRef: string;
  otpRequired: boolean;
};

export type CompassLodItemDto = {
  itemId: string;
  typeRef: string;
  label: string;
  mandatory: boolean;
  conditional: boolean;
  explanation: string | null;
  participantLabel: string | null;
  uploadStatus: "missing" | "uploaded" | "pending_verification" | "verified" | "rejected";
  fileName: string | null;
  allowedMimeTypes: string[];
  maxSizeBytes: number;
};

export type CompassLodDto = {
  items: CompassLodItemDto[];
  completionPercent: number;
  mandatoryPending: number;
  dtoSource: "enterprise_compass_lod";
};

export type CompassDocumentUploadResponse = {
  uploadedCount: number;
  uploaded: string[];
  lod: CompassLodDto;
};

export type CompassSubmitResponse = {
  submitted: boolean;
  reference: string;
  message: string;
  pendingItems: string[];
  dtoSource: "enterprise_compass_submission";
};

export type DiscoveryIntelligenceRequest = {
  product: CompassProductCode;
  answers: DiscoveryAnswersPayload;
  journeySessionToken?: string;
};
