import type {
  AssessmentReadinessStatus,
  AssessmentRecommendationResultStatus,
  AssessmentUpdatedChannel,
  OpportunityAssessmentAcceptedProgrammeId,
  OpportunityAssessmentFactsV1,
  OpportunityAssessmentMissingInputCodes,
  OpportunityAssessmentRejectedProgrammeCode,
  OpportunityAssessmentSourceFingerprint,
} from "@/types/opportunity-assessment";

export const ASSESSMENT_REVISION_KINDS = ["SAVED", "FINALIZED"] as const;
export type AssessmentRevisionKind = (typeof ASSESSMENT_REVISION_KINDS)[number];

export const ASSESSMENT_REVISION_ENVELOPE_VERSION = "opportunity-assessment-revision-envelope.v1" as const;
export const ASSESSMENT_NORMALIZED_INPUT_VERSION = "opportunity-assessment-normalized-input.v1" as const;

export const ASSESSMENT_RUN_OPERATIONAL_STATUSES = ["pending", "aborted", "failed"] as const;
export type AssessmentRunOperationalStatus = (typeof ASSESSMENT_RUN_OPERATIONAL_STATUSES)[number];
export type AssessmentRunResultStatus = AssessmentRunOperationalStatus | AssessmentRecommendationResultStatus;

export const ASSESSMENT_RUN_FAILURE_CODES = ["RUN_ABORTED", "RUN_FAILED", "CONFIGURATION_ERROR"] as const;
export type AssessmentRunFailureCode = (typeof ASSESSMENT_RUN_FAILURE_CODES)[number];

export type OpportunityAssessmentActorContext = {
  organizationId: string;
  actorUserId: string | null;
  channel: AssessmentUpdatedChannel;
};

export type OpportunityAssessmentRevisionEnvelope = {
  schemaVersion: typeof ASSESSMENT_REVISION_ENVELOPE_VERSION;
  normalizedInputVersion: string | null;
  normalizedInput: unknown | null;
};

export type OpportunityAssessmentRecord = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

export type OpportunityAssessmentRevisionRecord = {
  id: string;
  organizationId: string;
  opportunityId: string;
  assessmentId: string;
  revisionNumber: number;
  factsJson: OpportunityAssessmentFactsV1;
  normalizedInputJson: OpportunityAssessmentRevisionEnvelope;
  sourceFingerprintJson: OpportunityAssessmentSourceFingerprint;
  factsSchemaVersion: string;
  mapperVersion: string;
  readinessStatus: AssessmentReadinessStatus;
  revisionKind: AssessmentRevisionKind;
  commandId: string;
  commandHash: string;
  contentHash: string;
  finalizedAt: string | null;
  finalizedByUserId: string | null;
  finalizedChannel: AssessmentUpdatedChannel | null;
  supersededAt: string | null;
};

export type OpportunityAssessmentReadModel = {
  assessment: OpportunityAssessmentRecord;
  currentRevision: OpportunityAssessmentRevisionRecord | null;
  currentRevisionNumber: number;
  facts: OpportunityAssessmentFactsV1;
  sourceFingerprint: OpportunityAssessmentSourceFingerprint;
  readinessStatus: AssessmentReadinessStatus;
  rowVersion: number;
  stale: boolean;
  staleReasons: string[];
};

export type OpportunityAssessmentRecommendationRunRecord = {
  id: string;
  organizationId: string;
  opportunityId: string;
  assessmentId: string;
  revisionId: string;
  requestHash: string;
  assessedAt: string;
  asOf: string;
  mapperVersion: string;
  calculationVersion: string;
  factsSchemaVersion: string;
  resultStatus: AssessmentRunResultStatus;
  missingInputCodes: OpportunityAssessmentMissingInputCodes;
  rejectedProgrammeCodesJson: OpportunityAssessmentRejectedProgrammeCode[];
  acceptedProgrammeIdsJson: OpportunityAssessmentAcceptedProgrammeId[];
  cibilNotKnownDisclaimer: boolean;
  failureCode: AssessmentRunFailureCode | null;
};

export type SaveAssessmentRevisionInput = {
  assessmentId: string;
  opportunityId: string;
  expectedRowVersion: number;
  commandId: string;
  commandHash: string;
  facts: OpportunityAssessmentFactsV1;
  sourceFingerprint: OpportunityAssessmentSourceFingerprint;
  currentSourceFingerprint?: OpportunityAssessmentSourceFingerprint | null;
  kind: AssessmentRevisionKind;
  normalizedInput?: unknown | null;
  normalizedInputVersion?: string | null;
  journeyFields?: import("@/types/product-journey-definition").ProductJourneyFieldRow[] | null;
};

export type BeginRecommendationRunInput = {
  requestId: string;
  requestHash: string;
  assessmentId: string;
  opportunityId: string;
  revisionId: string;
  asOf: string;
  mapperVersion: string;
  calculationVersion: string;
  factsSchemaVersion: string;
};

export type CompleteRecommendationRunInput = {
  requestId: string;
  requestHash: string;
  resultStatus: AssessmentRunResultStatus;
  missingInputCodes?: OpportunityAssessmentMissingInputCodes;
  rejectedProgrammeCodesJson?: OpportunityAssessmentRejectedProgrammeCode[];
  acceptedProgrammeIdsJson?: OpportunityAssessmentAcceptedProgrammeId[];
  cibilNotKnownDisclaimer?: boolean;
  failureCode?: AssessmentRunFailureCode | null;
};
