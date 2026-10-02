/**
 * COMPASS Customer Gateway — public-safe DTO contracts.
 * Catalyst One is the sole authority; COMPASS renders these DTOs only.
 */

import type { CompassBorrowerKind, CompassProductCode } from "@/constants/compass-customer-gateway/product-registry";

export type { CompassProductCode } from "@/constants/compass-customer-gateway/product-registry";
export { COMPASS_PRODUCT_TO_ENTERPRISE } from "@/constants/compass-customer-gateway/product-registry";

export type CompassJourneyFieldType =
  | "text"
  | "tel"
  | "number"
  | "currency"
  | "select"
  | "city";

export type CompassJourneyFieldDef = {
  fieldId: string;
  label: string;
  helpText?: string;
  fieldType: CompassJourneyFieldType;
  required: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  sequence: number;
  groupId: string;
  visibleWhenField?: string;
  visibleWhenValues?: string[];
  requiredWhenField?: string;
  requiredWhenValues?: string[];
  notRequiredWhenFilled?: string[];
  maxWhenField?: string;
  maxWhenMap?: Record<string, number>;
  capture?: boolean;
  mandatoryForRecommendation?: boolean;
  applicability?: "all" | "salaried" | "self_employed";
  captureStepId?: string | null;
  purpose?: "identity" | "recommendation" | "application" | "document" | "enrichment";
  purposeSource?: "configured" | "legacy_key";
  stageId?: string;
};

export type CompassJourneyConfigDto = {
  productCode: string;
  enterpriseProductCode: string;
  productLabel: string;
  transactionType: "fresh" | "balance_transfer";
  isSecured: boolean;
  borrowerKind: CompassBorrowerKind;
  configVersion: string;
  fields: CompassJourneyFieldDef[];
  stages: string[];
  journeyVersion?: number;
  journeyUnavailable?: boolean;
  journeyStages?: { stageId: string; kind: string; label: string; sequence: number }[];
  advantageEnabled?: boolean;
  consentVersion?: string;
  confirmation?: { title: string; body: string };
  mobileCapture?: "required" | "optional" | "off";
  otpVerification?: "on" | "off";
  /** True only when the published journey requires OTP and a provider can send it. */
  otpEnabled: boolean;
  campaignHandoff?: {
    valid: boolean;
    emailOnFile: boolean;
    emailIndependentlyVerified: false;
    campaignId?: string;
    sourceCode?: string;
    campaignLabel?: string;
  };
  /** Approved maximum requested amount in integer rupees. Null when no ceiling is approved. */
  requestedAmountMax: number | null;
  /** Customer-facing “up to” copy from Product Library. Null when no ceiling is approved. */
  requestedAmountMaxLabel: string | null;
  dtoSource: "enterprise_initial_data_collection" | "published_product_journey";
};

export type CompassJourneyStartRequest = {
  productCode: CompassProductCode;
  mobile: string;
  displayName?: string;
  city?: string;
  consentAccepted: boolean;
  otpVerificationToken?: string;
  campaignToken?: string;
};

export type CompassJourneyStartResponse = {
  journeySessionToken: string;
  journeyRef: string;
  contactRef: string;
  opportunityRef: string;
  otpRequired: boolean;
  mobileVerified: boolean;
  campaignEmail?: { value: string; independentlyVerified: false } | null;
  dtoSource: "enterprise_compass_journey";
};

export type CompassJourneyAnswersPatch = {
  answers: Record<string, string | number | boolean | null>;
};

export type CompassAdvantageFixedBenefitDto = {
  name: string;
  amountRupees: string;
  customerDescription: string | null;
};

export type CompassAdvantageDto = {
  eligible: boolean;
  status: "not_available" | "ready" | "ineligible";
  title: string;
  amount: number | null;
  amountFormatted: string | null;
  disclaimer: string;
  reason?: string | null;
  ruleId?: string | null;
  productCode: CompassProductCode;
  dtoSource: "enterprise_compass_advantage";
  totalAdvantageAmount: string | null;
  currency: "INR";
  requestedLoanAmount: string | null;
  matchedRangeFrom: string | null;
  matchedRangeTo: string | null;
  percentageRate: string | null;
  percentageBenefitAmount: string | null;
  fixedBenefitComponents: CompassAdvantageFixedBenefitDto[];
  totalFixedBenefitAmount: string | null;
  scheduleId: string | null;
  scheduleVersion: number | null;
  caseReceivedAt: string | null;
  calculatedAt: string | null;
  customerExplanation: string;
  unavailableReason: string | null;
};

export type CompassRecommendationCardDto = {
  lenderRef: string;
  displayName: string;
  rank: number;
  tier: "best" | "strong" | "alternative";
  interestRateLabel: string | null;
  estimatedEmiLabel: string | null;
  processingTimeLabel: string | null;
  reasons: string[];
  benefits: string[];
  dtoSource: "enterprise_compass_recommendations";
};

export type CompassRecommendationsDto = {
  status: "ready" | "pending" | "unavailable";
  message: string;
  cards: CompassRecommendationCardDto[];
  dtoSource: "enterprise_compass_recommendations";
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

export type CompassAnalysisDto = {
  recommendations: CompassRecommendationsDto;
  advantage: CompassAdvantageDto | null;
  sarathiMessages: string[];
  requestedAmount: number | null;
  requestedAmountMax: number | null;
  missingPublicFieldKeys?: string[];
  dtoSource: "enterprise_compass_analysis";
};

export type CompassSubmitRequest = {
  consentAccepted: boolean;
  declarationsAccepted: boolean;
};

export type CompassSubmitResponse = {
  submitted: boolean;
  reference: string;
  message: string;
  pendingItems: string[];
  dtoSource: "enterprise_compass_submission";
};

export type CompassJourneySessionClaims = {
  sid: string;
  journeyRef: string;
  contactRef: string;
  opportunityRef: string;
  productCode: CompassProductCode;
  exp: number;
};
