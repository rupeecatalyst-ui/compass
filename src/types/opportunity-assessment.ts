/**
 * Stage 5C1 — Opportunity Assessment domain contract.
 * Persistence/schema only. FOIR and LTV are never stored as business truth.
 */

import type { ApproxCibilScoreBand } from "@/types/cibil-score-master";
import type { CanonicalAssessmentField } from "@/types/canonical-lender-recommendation";
import type { ExactDecimal } from "@/lib/product-programme-operations/money";

export const OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION = "opportunity-assessment-facts.v1" as const;
export const OPPORTUNITY_ASSESSMENT_MAPPER_VERSION = "opportunity-assessment-mapper.v1" as const;

export const ASSESSMENT_FACT_STATES = [
  "known",
  "explicitly_unknown",
  "missing",
  "unconfirmed",
  "conflicting",
  "unsupported",
] as const;
export type AssessmentFactState = (typeof ASSESSMENT_FACT_STATES)[number];

export const ASSESSMENT_SOURCE_CHANNELS = [
  "C1",
  "COMPASS",
  "CONTACT",
  "COMPANY",
  "OPPORTUNITY",
  "DOCUMENT",
  "SYSTEM_DERIVED",
] as const;
export type AssessmentSourceChannel = (typeof ASSESSMENT_SOURCE_CHANNELS)[number];

export const ASSESSMENT_CERTAINTIES = ["exact", "approximate", "not_known"] as const;
export type AssessmentCertainty = (typeof ASSESSMENT_CERTAINTIES)[number];

export const ASSESSMENT_UPDATED_CHANNELS = ["C1", "COMPASS", "SYSTEM"] as const;
export type AssessmentUpdatedChannel = (typeof ASSESSMENT_UPDATED_CHANNELS)[number];

export const ASSESSMENT_READINESS_STATUSES = [
  "incomplete",
  "conflicted",
  "unsupported",
  "ready",
  "stale",
] as const;
export type AssessmentReadinessStatus = (typeof ASSESSMENT_READINESS_STATUSES)[number];

export const ASSESSMENT_RECOMMENDATION_RESULT_STATUSES = [
  "ready",
  "no_eligible_programmes",
  "configuration_error",
  "assessment_input_required",
  "unsupported",
] as const;
export type AssessmentRecommendationResultStatus = (typeof ASSESSMENT_RECOMMENDATION_RESULT_STATUSES)[number];

export const ASSESSMENT_INCOME_BASIS_SALARY = "salary" as const;
export const ASSESSMENT_OBLIGATION_SCOPES = [
  "all_existing_emis",
  "other_emis_excluding_subject_hl",
] as const;
export type AssessmentObligationScope = (typeof ASSESSMENT_OBLIGATION_SCOPES)[number];

export const ASSESSMENT_PRODUCT_CODES = ["HOME_LOAN", "HOME_LOAN_BT"] as const;
export type AssessmentProductCode = (typeof ASSESSMENT_PRODUCT_CODES)[number];

export const ASSESSMENT_FORBIDDEN_TRANSACTION_TYPES = ["fresh", "bt_top_up", "with_topup"] as const;

export const ASSESSMENT_CIBIL_KINDS = ["exact", "expected_band", "explicitly_unknown", "missing"] as const;
export type AssessmentCibilKind = (typeof ASSESSMENT_CIBIL_KINDS)[number];

export const ASSESSMENT_EXPECTED_CIBIL_BANDS = [
  "below_600",
  "600_649",
  "650_699",
  "700_749",
  "750_799",
  "800_plus",
] as const satisfies ReadonlyArray<Exclude<ApproxCibilScoreBand, "not_known">>;
export type AssessmentExpectedCibilBand = (typeof ASSESSMENT_EXPECTED_CIBIL_BANDS)[number];

export const ASSESSMENT_CONTRIBUTION_DECISIONS = ["yes", "no", "not_decided"] as const;
export type AssessmentContributionDecision = (typeof ASSESSMENT_CONTRIBUTION_DECISIONS)[number];

export const ASSESSMENT_PROPERTY_VALUE_DECLARATIONS = [
  "customer_declared",
  "valuation",
  "unconfirmed",
] as const;
export type AssessmentPropertyValueDeclaration = (typeof ASSESSMENT_PROPERTY_VALUE_DECLARATIONS)[number];

export type AssessmentFactConflictCandidate<T> = {
  value: T | null;
  sourceChannel: AssessmentSourceChannel;
  sourceEntityId?: string | null;
  sourceFieldKey?: string | null;
};

export type AssessmentFact<T> = {
  value: T | null;
  state: AssessmentFactState;
  sourceChannel: AssessmentSourceChannel | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  sourceFieldKey: string | null;
  sourceUpdatedAt: string | null;
  capturedByUserId: string | null;
  capturedAt: string | null;
  effectiveAt: string | null;
  confirmedByUserId: string | null;
  confirmedAt: string | null;
  certainty?: AssessmentCertainty | null;
  knownZeroDeclared?: boolean;
  evidenceRef?: string | null;
  conflictCandidates?: Array<AssessmentFactConflictCandidate<T>>;
};

export type OpportunityAssessmentBorrowerSection = {
  residency: AssessmentFact<string>;
  dateOfBirth: AssessmentFact<string>;
  employmentTypeCode: AssessmentFact<string>;
  employmentFamily: AssessmentFact<"salaried" | "self_employed" | "unknown">;
  constitution: AssessmentFact<string>;
  journeyCity: AssessmentFact<string>;
  journeyState: AssessmentFact<string>;
};

export type OpportunityAssessmentIncomeSection = {
  monthlyIncome: AssessmentFact<ExactDecimal>;
  incomeBasis: AssessmentFact<string>;
  incomeEffectiveAt: AssessmentFact<string>;
  existingMonthlyObligations: AssessmentFact<ExactDecimal>;
  obligationScope: AssessmentFact<AssessmentObligationScope>;
  requestedTenureMonths: AssessmentFact<number>;
};

export type OpportunityAssessmentLoanSection = {
  productCode: AssessmentFact<AssessmentProductCode>;
  transactionType: AssessmentFact<string>;
  requestedAmount: AssessmentFact<ExactDecimal>;
};

export type OpportunityAssessmentPropertySection = {
  propertyValue: AssessmentFact<ExactDecimal>;
  valueDeclaration: AssessmentFact<AssessmentPropertyValueDeclaration>;
  valueEffectiveAt: AssessmentFact<string>;
  propertyCategory: AssessmentFact<string>;
  propertyKind: AssessmentFact<string>;
  constructionStatus: AssessmentFact<string>;
  occupancy: AssessmentFact<string>;
  possessionStatus: AssessmentFact<string>;
  registrationStatus: AssessmentFact<string>;
  propertyCity: AssessmentFact<string>;
  propertyState: AssessmentFact<string>;
  pincode: AssessmentFact<string>;
  address: AssessmentFact<string>;
};

export type OpportunityAssessmentCibilSection = {
  kind: AssessmentFact<AssessmentCibilKind>;
  exactScore: AssessmentFact<number>;
  expectedBand: AssessmentFact<AssessmentExpectedCibilBand>;
  observationDate: AssessmentFact<string>;
};

export type OpportunityAssessmentBalanceTransferSection = {
  outstandingPrincipal: AssessmentFact<ExactDecimal>;
  outstandingCertainty: AssessmentFact<AssessmentCertainty>;
  outstandingObservationDate: AssessmentFact<string>;
  loanStartDate: AssessmentFact<string>;
  loanStartDateCertainty: AssessmentFact<AssessmentCertainty>;
  repaymentTrack: AssessmentFact<"yes" | "no" | "not_sure">;
  delayedEmiCount: AssessmentFact<number>;
  delayedEmiCertainty: AssessmentFact<AssessmentCertainty>;
  existingLenderInstitution: AssessmentFact<string>;
  currentRoiPercent: AssessmentFact<ExactDecimal>;
  currentRoiCertainty: AssessmentFact<AssessmentCertainty>;
  currentHomeLoanEmi: AssessmentFact<ExactDecimal>;
  currentHomeLoanEmiCertainty: AssessmentFact<AssessmentCertainty>;
  remainingTenureMonths: AssessmentFact<number>;
  remainingTenureCertainty: AssessmentFact<AssessmentCertainty>;
  originalSanctionedAmount: AssessmentFact<ExactDecimal>;
  originalTenureMonths: AssessmentFact<number>;
  rateType: AssessmentFact<"floating" | "fixed" | "hybrid" | "not_known">;
};

export type OpportunityAssessmentCoApplicantSection = {
  participantRef: AssessmentFact<string>;
  contributionDecision: AssessmentFact<AssessmentContributionDecision>;
  relationship: AssessmentFact<string>;
  dateOfBirth: AssessmentFact<string>;
  employmentType: AssessmentFact<string>;
  contributedIncome: AssessmentFact<ExactDecimal>;
  obligations: AssessmentFact<ExactDecimal>;
};

export type OpportunityAssessmentSelfEmployedEvidenceSection = {
  turnover: AssessmentFact<ExactDecimal>;
  profit: AssessmentFact<ExactDecimal>;
  vintage: AssessmentFact<string>;
  constitution: AssessmentFact<string>;
  methodologyStatus: AssessmentFact<"unsupported">;
};

export type OpportunityAssessmentFactsV1 = {
  schemaVersion: typeof OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION;
  borrower: OpportunityAssessmentBorrowerSection;
  incomeAndObligations: OpportunityAssessmentIncomeSection;
  loanRequirement: OpportunityAssessmentLoanSection;
  property: OpportunityAssessmentPropertySection;
  cibil: OpportunityAssessmentCibilSection;
  balanceTransfer: OpportunityAssessmentBalanceTransferSection;
  coApplicant: OpportunityAssessmentCoApplicantSection;
  selfEmployedEvidence: OpportunityAssessmentSelfEmployedEvidenceSection;
};

export type OpportunityAssessmentSourceFingerprint = {
  opportunityRowVersion: number | null;
  contactUpdatedAt: string | null;
  companyUpdatedAt: string | null;
  compassAssessmentUpdatedAt: string | null;
};

export type OpportunityAssessmentRejectedProgrammeCode = {
  programmeId: string;
  reason: string;
};

export type OpportunityAssessmentAcceptedProgrammeId = {
  programmeId: string;
  policyVersionId: string;
  policyVersionNumber?: number;
  lenderScore: null;
  matchPercent?: number | null;
  matchRank?: number | null;
  ruleSetVersion?: string | null;
  criterionContributions?: Array<{
    criterionKey: string;
    criterionScore: number | null;
    weightPercent: number;
    weightedContribution: number | null;
    status: string;
    inputs?: Readonly<Record<string, number | string | boolean | null>> | null;
  }> | null;
};

export type OpportunityAssessmentMissingInputCodes = CanonicalAssessmentField[];

export type OpportunityAssessmentPersistenceRecord = {
  organizationId: string;
  opportunityId: string;
  currentRevisionId: string | null;
  draftFactsJson: OpportunityAssessmentFactsV1;
  sourceFingerprintJson: OpportunityAssessmentSourceFingerprint;
  readinessStatus: AssessmentReadinessStatus;
  unsupportedReasonCode: string | null;
  selectedContributorParticipantRef: string | null;
  rowVersion: number;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  updatedChannel: AssessmentUpdatedChannel;
};

export type OpportunityAssessmentRevisionPersistenceRecord = {
  organizationId: string;
  opportunityId: string;
  assessmentId: string;
  revisionNumber: number;
  factsJson: OpportunityAssessmentFactsV1;
  normalizedInputJson: unknown;
  sourceFingerprintJson: OpportunityAssessmentSourceFingerprint;
  factsSchemaVersion: typeof OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION;
  mapperVersion: typeof OPPORTUNITY_ASSESSMENT_MAPPER_VERSION;
  readinessStatus: AssessmentReadinessStatus;
  finalizedAt: string;
  finalizedByUserId: string | null;
  finalizedChannel: AssessmentUpdatedChannel;
  supersededAt: string | null;
};

export type OpportunityAssessmentRecommendationRunPersistenceRecord = {
  organizationId: string;
  opportunityId: string;
  assessmentId: string;
  revisionId: string;
  assessedAt: string;
  asOf: string;
  mapperVersion: typeof OPPORTUNITY_ASSESSMENT_MAPPER_VERSION;
  calculationVersion: string;
  factsSchemaVersion: typeof OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION;
  resultStatus: AssessmentRecommendationResultStatus;
  missingInputCodes: OpportunityAssessmentMissingInputCodes;
  rejectedProgrammeCodesJson: OpportunityAssessmentRejectedProgrammeCode[];
  acceptedProgrammeIdsJson: OpportunityAssessmentAcceptedProgrammeId[];
  cibilNotKnownDisclaimer: boolean;
};
