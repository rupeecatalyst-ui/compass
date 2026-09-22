import type { AssessmentUpdatedChannel } from "@/types/opportunity-assessment";
import type {
  OpportunityAssessmentRecord,
  OpportunityAssessmentRecommendationRunRecord,
  OpportunityAssessmentRevisionRecord,
} from "@server/services/opportunity-assessment/types";

export class AssessmentCommandUniquenessCollision extends Error {
  readonly organizationId: string;
  readonly commandId: string;
  readonly existingRevisionId: string;

  constructor(organizationId: string, commandId: string, existingRevisionId: string) {
    super("COMMAND_UNIQUENESS_COLLISION");
    this.name = "AssessmentCommandUniquenessCollision";
    this.organizationId = organizationId;
    this.commandId = commandId;
    this.existingRevisionId = existingRevisionId;
  }
}

export type OpportunityAssessmentRepository = {
  transaction<T>(work: (tx: OpportunityAssessmentRepository) => Promise<T>): Promise<T>;
  getOrCreateAssessment(input: {
    organizationId: string;
    opportunityId: string;
    actorUserId: string | null;
    channel: AssessmentUpdatedChannel;
  }): Promise<OpportunityAssessmentRecord>;
  getAssessment(organizationId: string, assessmentId: string): Promise<OpportunityAssessmentRecord>;
  getRevision(organizationId: string, revisionId: string): Promise<OpportunityAssessmentRevisionRecord>;
  findRevisionByCommand(organizationId: string, commandId: string): Promise<OpportunityAssessmentRevisionRecord | null>;
  listRevisions(organizationId: string, assessmentId: string): Promise<OpportunityAssessmentRevisionRecord[]>;
  insertRevision(row: OpportunityAssessmentRevisionRecord): Promise<OpportunityAssessmentRevisionRecord>;
  advanceAssessmentCursor(input: {
    organizationId: string;
    assessmentId: string;
    expectedRowVersion: number;
    currentRevisionId: string;
    draftFactsJson: OpportunityAssessmentRecord["draftFactsJson"];
    sourceFingerprintJson: OpportunityAssessmentRecord["sourceFingerprintJson"];
    readinessStatus: OpportunityAssessmentRecord["readinessStatus"];
    unsupportedReasonCode: string | null;
    selectedContributorParticipantRef: string | null;
    updatedByUserId: string | null;
    updatedChannel: AssessmentUpdatedChannel;
  }): Promise<OpportunityAssessmentRecord>;
  insertRun(row: OpportunityAssessmentRecommendationRunRecord): Promise<OpportunityAssessmentRecommendationRunRecord>;
  getRun(organizationId: string, requestId: string): Promise<OpportunityAssessmentRecommendationRunRecord>;
  completeRun(row: OpportunityAssessmentRecommendationRunRecord): Promise<OpportunityAssessmentRecommendationRunRecord>;
  listRuns(organizationId: string, assessmentId: string): Promise<OpportunityAssessmentRecommendationRunRecord[]>;
  nextId(): string;
  now(): string;
  schemaVersions(): { factsSchemaVersion: string; mapperVersion: string };
};
