import type {
  AssessmentReadinessStatus,
  AssessmentUpdatedChannel,
  OpportunityAssessmentFactsV1,
  OpportunityAssessmentSourceFingerprint,
} from "@/types/opportunity-assessment";
import type {
  AssessmentRevisionKind,
  AssessmentRunFailureCode,
  AssessmentRunResultStatus,
  OpportunityAssessmentRecord,
  OpportunityAssessmentRecommendationRunRecord,
  OpportunityAssessmentRevisionEnvelope,
  OpportunityAssessmentRevisionRecord,
} from "@server/services/opportunity-assessment/types";
import { OpportunityAssessmentError } from "@server/services/opportunity-assessment/errors";

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  throw new OpportunityAssessmentError("ASSESSMENT_PERSISTENCE_FAILURE");
}

function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return iso(value);
}

export function mapAssessmentRow(row: Record<string, unknown>): OpportunityAssessmentRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organizationId),
    opportunityId: String(row.opportunityId),
    currentRevisionId: row.currentRevisionId == null ? null : String(row.currentRevisionId),
    draftFactsJson: row.draftFactsJson as OpportunityAssessmentFactsV1,
    sourceFingerprintJson: row.sourceFingerprintJson as OpportunityAssessmentSourceFingerprint,
    readinessStatus: row.readinessStatus as AssessmentReadinessStatus,
    unsupportedReasonCode: row.unsupportedReasonCode == null ? null : String(row.unsupportedReasonCode),
    selectedContributorParticipantRef:
      row.selectedContributorParticipantRef == null ? null : String(row.selectedContributorParticipantRef),
    rowVersion: Number(row.rowVersion),
    createdByUserId: row.createdByUserId == null ? null : String(row.createdByUserId),
    updatedByUserId: row.updatedByUserId == null ? null : String(row.updatedByUserId),
    updatedChannel: row.updatedChannel as AssessmentUpdatedChannel,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function mapRevisionRow(row: Record<string, unknown>): OpportunityAssessmentRevisionRecord {
  if (!row.commandId || !row.commandHash || !row.contentHash || !row.revisionKind) {
    throw new OpportunityAssessmentError("ASSESSMENT_PERSISTENCE_FAILURE");
  }
  return {
    id: String(row.id),
    organizationId: String(row.organizationId),
    opportunityId: String(row.opportunityId),
    assessmentId: String(row.assessmentId),
    revisionNumber: Number(row.revisionNumber),
    factsJson: row.factsJson as OpportunityAssessmentFactsV1,
    normalizedInputJson: row.normalizedInputJson as OpportunityAssessmentRevisionEnvelope,
    sourceFingerprintJson: row.sourceFingerprintJson as OpportunityAssessmentSourceFingerprint,
    factsSchemaVersion: String(row.factsSchemaVersion),
    mapperVersion: String(row.mapperVersion),
    readinessStatus: row.readinessStatus as AssessmentReadinessStatus,
    revisionKind: row.revisionKind as AssessmentRevisionKind,
    commandId: String(row.commandId),
    commandHash: String(row.commandHash),
    contentHash: String(row.contentHash),
    finalizedAt: isoOrNull(row.finalizedAt),
    finalizedByUserId: row.finalizedByUserId == null ? null : String(row.finalizedByUserId),
    finalizedChannel: (row.finalizedChannel as AssessmentUpdatedChannel | null) ?? null,
    supersededAt: isoOrNull(row.supersededAt),
  };
}

export function mapRunRow(row: Record<string, unknown>): OpportunityAssessmentRecommendationRunRecord {
  if (!row.requestHash) throw new OpportunityAssessmentError("ASSESSMENT_PERSISTENCE_FAILURE");
  return {
    id: String(row.id),
    organizationId: String(row.organizationId),
    opportunityId: String(row.opportunityId),
    assessmentId: String(row.assessmentId),
    revisionId: String(row.revisionId),
    requestHash: String(row.requestHash),
    assessedAt: iso(row.assessedAt),
    asOf: iso(row.asOf),
    mapperVersion: String(row.mapperVersion),
    calculationVersion: String(row.calculationVersion),
    factsSchemaVersion: String(row.factsSchemaVersion),
    resultStatus: row.resultStatus as AssessmentRunResultStatus,
    missingInputCodes: (row.missingInputCodes ?? []) as OpportunityAssessmentRecommendationRunRecord["missingInputCodes"],
    rejectedProgrammeCodesJson:
      (row.rejectedProgrammeCodesJson ?? []) as OpportunityAssessmentRecommendationRunRecord["rejectedProgrammeCodesJson"],
    acceptedProgrammeIdsJson: (
      (row.acceptedProgrammeIdsJson ?? []) as OpportunityAssessmentRecommendationRunRecord["acceptedProgrammeIdsJson"]
    ).map((item) => ({ ...item, lenderScore: null })),
    cibilNotKnownDisclaimer: Boolean(row.cibilNotKnownDisclaimer),
    failureCode: (row.failureCode as AssessmentRunFailureCode | null) ?? null,
  };
}

export function revisionCreateData(row: OpportunityAssessmentRevisionRecord) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    opportunityId: row.opportunityId,
    assessmentId: row.assessmentId,
    revisionNumber: row.revisionNumber,
    factsJson: row.factsJson,
    normalizedInputJson: row.normalizedInputJson,
    sourceFingerprintJson: row.sourceFingerprintJson,
    factsSchemaVersion: row.factsSchemaVersion,
    mapperVersion: row.mapperVersion,
    readinessStatus: row.readinessStatus,
    revisionKind: row.revisionKind,
    commandId: row.commandId,
    commandHash: row.commandHash,
    contentHash: row.contentHash,
    finalizedAt: row.finalizedAt ? new Date(row.finalizedAt) : null,
    finalizedByUserId: row.finalizedByUserId,
    finalizedChannel: row.finalizedChannel,
    supersededAt: row.supersededAt ? new Date(row.supersededAt) : null,
  };
}

export function runCreateData(row: OpportunityAssessmentRecommendationRunRecord) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    opportunityId: row.opportunityId,
    assessmentId: row.assessmentId,
    revisionId: row.revisionId,
    requestHash: row.requestHash,
    assessedAt: new Date(row.assessedAt),
    asOf: new Date(row.asOf),
    mapperVersion: row.mapperVersion,
    calculationVersion: row.calculationVersion,
    factsSchemaVersion: row.factsSchemaVersion,
    resultStatus: row.resultStatus,
    missingInputCodes: row.missingInputCodes,
    rejectedProgrammeCodesJson: row.rejectedProgrammeCodesJson,
    acceptedProgrammeIdsJson: row.acceptedProgrammeIdsJson.map((item) => ({ ...item, lenderScore: null })),
    cibilNotKnownDisclaimer: row.cibilNotKnownDisclaimer,
    failureCode: row.failureCode,
  };
}
