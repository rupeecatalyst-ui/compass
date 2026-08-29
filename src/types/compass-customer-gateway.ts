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
};

export type CompassJourneyConfigDto = {
  productCode: CompassProductCode;
  enterpriseProductCode: string;
  productLabel: string;
  transactionType: "fresh" | "balance_transfer";
  isSecured: boolean;
  borrowerKind: CompassBorrowerKind;
  configVersion: string;
  fields: CompassJourneyFieldDef[];
  otpEnabled: boolean;
  dtoSource: "enterprise_initial_data_collection";
};

export type CompassJourneyStartRequest = {
  productCode: CompassProductCode;
  mobile: string;
  displayName?: string;
  city?: string;
  consentAccepted: boolean;
};

export type CompassJourneyStartResponse = {
  journeySessionToken: string;
  journeyRef: string;
  contactRef: string;
  opportunityRef: string;
  otpRequired: boolean;
  dtoSource: "enterprise_compass_journey";
};

export type CompassJourneyAnswersPatch = {
  answers: Record<string, string | number | boolean | null>;
};

export type CompassAdvantageDto = {
  eligible: boolean;
  status: "not_available" | "ready";
  title: string;
  amount: number | null;
  amountFormatted: string | null;
  disclaimer: string;
  productCode: CompassProductCode;
  dtoSource: "enterprise_compass_advantage";
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
