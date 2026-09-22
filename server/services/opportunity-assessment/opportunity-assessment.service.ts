import {
  parseOpportunityAssessmentFacts,
  opportunityAssessmentSourceFingerprintsEqual,
} from "@/lib/opportunity-assessment";
import {
  OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
  OPPORTUNITY_ASSESSMENT_MAPPER_VERSION,
} from "@/types/opportunity-assessment";
import {
  AssessmentCommandUniquenessCollision,
  MemoryOpportunityAssessmentRepository,
} from "@server/repositories/opportunity-assessment/memory-repository";
import { hashOpportunityAssessmentRevisionContent } from "./content-hash";
import { OpportunityAssessmentError } from "./errors";
import { applyTrustedActorToFacts, validateOpportunityAssessmentProvenance } from "./provenance";
import { assertFinalizationReadiness, deriveOpportunityAssessmentReadiness } from "./readiness";
import type {
  AssessmentRunFailureCode,
  AssessmentRunResultStatus,
  BeginRecommendationRunInput,
  CompleteRecommendationRunInput,
  OpportunityAssessmentActorContext,
  OpportunityAssessmentReadModel,
  OpportunityAssessmentRecommendationRunRecord,
  OpportunityAssessmentRevisionEnvelope,
  OpportunityAssessmentRevisionRecord,
  SaveAssessmentRevisionInput,
} from "./types";
import {
  ASSESSMENT_NORMALIZED_INPUT_VERSION,
  ASSESSMENT_REVISION_ENVELOPE_VERSION,
  ASSESSMENT_RUN_FAILURE_CODES,
} from "./types";

const TERMINAL_RUN_STATUSES = new Set<AssessmentRunResultStatus>([
  "ready",
  "no_eligible_programmes",
  "configuration_error",
  "assessment_input_required",
  "unsupported",
  "aborted",
  "failed",
]);

export class OpportunityAssessmentService {
  constructor(private readonly repo: MemoryOpportunityAssessmentRepository) {}

  async getOrCreateAssessment(actor: OpportunityAssessmentActorContext, opportunityId: string) {
    this.assertTrustedOrganization(actor.organizationId);
    return this.repo.transaction((tx) =>
      tx.getOrCreateAssessment({
        organizationId: actor.organizationId,
        opportunityId,
        actorUserId: actor.actorUserId,
        channel: actor.channel,
      }),
    );
  }

  async readCurrentAssessment(
    actor: OpportunityAssessmentActorContext,
    input: {
      assessmentId: string;
      opportunityId: string;
      currentSourceFingerprint?: SaveAssessmentRevisionInput["sourceFingerprint"] | null;
    },
  ): Promise<OpportunityAssessmentReadModel> {
    this.assertTrustedOrganization(actor.organizationId);
    const assessment = await this.repo.getAssessment(actor.organizationId, input.assessmentId);
    this.assertOpportunity(assessment.opportunityId, input.opportunityId);
    const currentRevision = assessment.currentRevisionId
      ? await this.repo.getRevision(actor.organizationId, assessment.currentRevisionId)
      : null;
    const sourceFingerprint = currentRevision?.sourceFingerprintJson ?? assessment.sourceFingerprintJson;
    const staleReasons = this.staleReasons(sourceFingerprint, input.currentSourceFingerprint ?? null);
    return {
      assessment,
      currentRevision,
      currentRevisionNumber: currentRevision?.revisionNumber ?? 0,
      facts: currentRevision?.factsJson ?? assessment.draftFactsJson,
      sourceFingerprint,
      readinessStatus: assessment.readinessStatus,
      rowVersion: assessment.rowVersion,
      stale: staleReasons.length > 0,
      staleReasons,
    };
  }

  async saveRevision(actor: OpportunityAssessmentActorContext, input: SaveAssessmentRevisionInput) {
    this.assertTrustedOrganization(actor.organizationId);
    if (!input.commandId.trim() || !input.commandHash.trim()) {
      throw new OpportunityAssessmentError("INVALID_ASSESSMENT_FACTS", "commandId and commandHash are required.");
    }
    return this.repo.transaction(async (tx) => {
      const assessment = await tx.getAssessment(actor.organizationId, input.assessmentId);
      this.assertOpportunity(assessment.opportunityId, input.opportunityId);
      const existingCommand = await tx.findRevisionByCommand(actor.organizationId, input.commandId);
      if (existingCommand) {
        if (existingCommand.commandHash !== input.commandHash) {
          throw new OpportunityAssessmentError("IDEMPOTENCY_CONFLICT");
        }
        return existingCommand;
      }
      if (assessment.rowVersion !== input.expectedRowVersion) {
        throw new OpportunityAssessmentError("ASSESSMENT_CONFLICT");
      }

      let facts;
      try {
        facts = parseOpportunityAssessmentFacts(input.facts);
      } catch {
        throw new OpportunityAssessmentError("INVALID_ASSESSMENT_FACTS");
      }
      const capturedAt = tx.now();
      facts = applyTrustedActorToFacts(facts, actor, capturedAt);
      validateOpportunityAssessmentProvenance(facts);
      const staleReasons = this.staleReasons(input.sourceFingerprint, input.currentSourceFingerprint ?? null);
      if (staleReasons.length > 0 && input.kind === "FINALIZED") {
        throw new OpportunityAssessmentError("ASSESSMENT_STALE");
      }

      const derived = deriveOpportunityAssessmentReadiness(facts);
      const isFinalized = input.kind === "FINALIZED";
      if (isFinalized) {
        if (input.normalizedInput == null || typeof input.normalizedInput !== "object") {
          throw new OpportunityAssessmentError("INVALID_FINALIZATION");
        }
        if (!input.normalizedInputVersion) throw new OpportunityAssessmentError("INVALID_FINALIZATION");
        if (!actor.channel) throw new OpportunityAssessmentError("INVALID_FINALIZATION");
        assertFinalizationReadiness(facts, derived.readinessStatus);
      }

      const contentHash = hashOpportunityAssessmentRevisionContent({
        kind: input.kind,
        facts,
        sourceFingerprint: input.sourceFingerprint,
        readinessStatus: derived.readinessStatus,
        factsSchemaVersion: OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
        mapperVersion: OPPORTUNITY_ASSESSMENT_MAPPER_VERSION,
        normalizedInputVersion: isFinalized ? input.normalizedInputVersion ?? ASSESSMENT_NORMALIZED_INPUT_VERSION : null,
        normalizedInput: isFinalized ? input.normalizedInput : null,
      });
      const envelope: OpportunityAssessmentRevisionEnvelope = {
        schemaVersion: ASSESSMENT_REVISION_ENVELOPE_VERSION,
        normalizedInputVersion: isFinalized ? input.normalizedInputVersion ?? null : null,
        normalizedInput: isFinalized ? input.normalizedInput : null,
      };

      const revisions = await tx.listRevisions(actor.organizationId, assessment.id);
      const revisionNumber = (revisions.at(-1)?.revisionNumber ?? 0) + 1;
      const revision: OpportunityAssessmentRevisionRecord = {
        id: tx.nextId(),
        organizationId: actor.organizationId,
        opportunityId: assessment.opportunityId,
        assessmentId: assessment.id,
        revisionNumber,
        factsJson: facts,
        normalizedInputJson: envelope,
        sourceFingerprintJson: input.sourceFingerprint,
        factsSchemaVersion: OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
        mapperVersion: OPPORTUNITY_ASSESSMENT_MAPPER_VERSION,
        readinessStatus: derived.readinessStatus,
        revisionKind: input.kind,
        commandId: input.commandId,
        commandHash: input.commandHash,
        contentHash,
        finalizedAt: isFinalized ? capturedAt : null,
        finalizedByUserId: isFinalized ? actor.actorUserId : null,
        finalizedChannel: isFinalized ? actor.channel : null,
        supersededAt: null,
      };
      try {
        await tx.insertRevision(revision);
      } catch (error) {
        if (!(error instanceof AssessmentCommandUniquenessCollision)) throw error;
        const raced = await tx.findRevisionByCommand(actor.organizationId, input.commandId);
        if (!raced) throw new OpportunityAssessmentError("ASSESSMENT_CONFLICT");
        if (raced.commandHash !== input.commandHash) {
          throw new OpportunityAssessmentError("IDEMPOTENCY_CONFLICT");
        }
        return raced;
      }
      const contributor =
        facts.coApplicant.contributionDecision.value === "yes" ? facts.coApplicant.participantRef.value : null;
      await tx.advanceAssessmentCursor({
        organizationId: actor.organizationId,
        assessmentId: assessment.id,
        expectedRowVersion: input.expectedRowVersion,
        currentRevisionId: revision.id,
        draftFactsJson: facts,
        sourceFingerprintJson: input.sourceFingerprint,
        readinessStatus: derived.readinessStatus,
        unsupportedReasonCode: derived.unsupportedReasonCode,
        selectedContributorParticipantRef: contributor,
        updatedByUserId: actor.actorUserId,
        updatedChannel: actor.channel,
      });
      return revision;
    });
  }

  async beginRecommendationRun(actor: OpportunityAssessmentActorContext, input: BeginRecommendationRunInput) {
    this.assertTrustedOrganization(actor.organizationId);
    if (!input.requestId.trim() || !input.requestHash.trim()) {
      throw new OpportunityAssessmentError("INVALID_ASSESSMENT_FACTS", "requestId and requestHash are required.");
    }
    return this.repo.transaction(async (tx) => {
      const assessment = await tx.getAssessment(actor.organizationId, input.assessmentId);
      this.assertOpportunity(assessment.opportunityId, input.opportunityId);
      const revision = await tx.getRevision(actor.organizationId, input.revisionId);
      this.assertOpportunity(revision.opportunityId, input.opportunityId);
      if (revision.assessmentId !== assessment.id) throw new OpportunityAssessmentError("REVISION_NOT_FOUND");
      const now = tx.now();
      return tx.insertRun({
        id: input.requestId,
        organizationId: actor.organizationId,
        opportunityId: assessment.opportunityId,
        assessmentId: assessment.id,
        revisionId: revision.id,
        requestHash: input.requestHash,
        assessedAt: now,
        asOf: input.asOf,
        mapperVersion: input.mapperVersion,
        calculationVersion: input.calculationVersion,
        factsSchemaVersion: input.factsSchemaVersion,
        resultStatus: "pending",
        missingInputCodes: [],
        rejectedProgrammeCodesJson: [],
        acceptedProgrammeIdsJson: [],
        cibilNotKnownDisclaimer: false,
        failureCode: null,
      });
    });
  }

  async completeRecommendationRun(actor: OpportunityAssessmentActorContext, input: CompleteRecommendationRunInput) {
    this.assertTrustedOrganization(actor.organizationId);
    return this.repo.transaction(async (tx) => {
      const existing = await tx.getRun(actor.organizationId, input.requestId);
      if (existing.requestHash !== input.requestHash) throw new OpportunityAssessmentError("IDEMPOTENCY_CONFLICT");
      const failureCode = this.sanitizeFailureCode(input.resultStatus, input.failureCode ?? null);
      const next: OpportunityAssessmentRecommendationRunRecord = {
        ...existing,
        resultStatus: input.resultStatus,
        missingInputCodes: input.missingInputCodes ?? existing.missingInputCodes,
        rejectedProgrammeCodesJson: input.rejectedProgrammeCodesJson ?? existing.rejectedProgrammeCodesJson,
        acceptedProgrammeIdsJson: (input.acceptedProgrammeIdsJson ?? existing.acceptedProgrammeIdsJson).map((row) => ({
          ...row,
          lenderScore: null,
        })),
        cibilNotKnownDisclaimer: input.cibilNotKnownDisclaimer ?? existing.cibilNotKnownDisclaimer,
        failureCode,
      };
      if ("stars" in next || "confidence" in next) {
        throw new OpportunityAssessmentError("INVALID_ASSESSMENT_FACTS");
      }
      return tx.completeRun(next);
    });
  }

  async readRecommendationRun(actor: OpportunityAssessmentActorContext, requestId: string) {
    this.assertTrustedOrganization(actor.organizationId);
    return this.repo.getRun(actor.organizationId, requestId);
  }

  async listRecommendationRuns(actor: OpportunityAssessmentActorContext, assessmentId: string) {
    this.assertTrustedOrganization(actor.organizationId);
    return this.repo.listRuns(actor.organizationId, assessmentId);
  }

  private staleReasons(
    revisionFingerprint: SaveAssessmentRevisionInput["sourceFingerprint"],
    current: SaveAssessmentRevisionInput["sourceFingerprint"] | null,
  ) {
    if (!current) return [];
    if (opportunityAssessmentSourceFingerprintsEqual(revisionFingerprint, current)) return [];
    const reasons: string[] = [];
    if (revisionFingerprint.opportunityRowVersion !== current.opportunityRowVersion) reasons.push("opportunityRowVersion");
    if (revisionFingerprint.contactUpdatedAt !== current.contactUpdatedAt) reasons.push("contactUpdatedAt");
    if (revisionFingerprint.companyUpdatedAt !== current.companyUpdatedAt) reasons.push("companyUpdatedAt");
    if (revisionFingerprint.compassAssessmentUpdatedAt !== current.compassAssessmentUpdatedAt) {
      reasons.push("compassAssessmentUpdatedAt");
    }
    return reasons;
  }

  private sanitizeFailureCode(
    status: AssessmentRunResultStatus,
    requested: AssessmentRunFailureCode | null,
  ): AssessmentRunFailureCode | null {
    const raw = String(requested ?? "");
    if (/password|DATABASE_URL|ECONN|prisma|postgres|token|credential|mongodb:\/\//i.test(raw)) {
      return status === "aborted"
        ? "RUN_ABORTED"
        : status === "failed"
          ? "RUN_FAILED"
          : status === "configuration_error"
            ? "CONFIGURATION_ERROR"
            : null;
    }
    if (status === "aborted") return "RUN_ABORTED";
    if (status === "failed") return "RUN_FAILED";
    if (status === "configuration_error") return "CONFIGURATION_ERROR";
    return requested && (ASSESSMENT_RUN_FAILURE_CODES as readonly string[]).includes(requested) ? requested : null;
  }

  private assertTrustedOrganization(organizationId: string) {
    if (!organizationId) throw new OpportunityAssessmentError("CROSS_ORGANIZATION_ACCESS");
  }

  private assertOpportunity(actual: string, expected: string) {
    if (actual !== expected) throw new OpportunityAssessmentError("CROSS_ORGANIZATION_ACCESS");
  }
}

export { TERMINAL_RUN_STATUSES };
