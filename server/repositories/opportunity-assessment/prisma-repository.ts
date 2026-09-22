import { emptyOpportunityAssessmentFacts } from "@/lib/opportunity-assessment/empty-facts";
import { buildOpportunityAssessmentSourceFingerprint } from "@/lib/opportunity-assessment/fingerprint";
import {
  OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
  OPPORTUNITY_ASSESSMENT_MAPPER_VERSION,
  type AssessmentUpdatedChannel,
} from "@/types/opportunity-assessment";
import { OpportunityAssessmentError } from "@server/services/opportunity-assessment/errors";
import type {
  OpportunityAssessmentRecord,
  OpportunityAssessmentRecommendationRunRecord,
  OpportunityAssessmentRevisionRecord,
} from "@server/services/opportunity-assessment/types";
import { AssessmentCommandUniquenessCollision, type OpportunityAssessmentRepository } from "./contract";
import { identifyAssessmentUniqueConstraint, isPrismaUniqueConflict, persistenceFailure, translatePrismaError } from "./prisma-errors";
import { mapAssessmentRow, mapRevisionRow, mapRunRow, revisionCreateData, runCreateData } from "./map-rows";
import type { OpportunityAssessmentPrismaSurface } from "./prisma-surface";

export class PrismaOpportunityAssessmentRepository implements OpportunityAssessmentRepository {
  constructor(
    private readonly prisma: OpportunityAssessmentPrismaSurface,
    private readonly ids: () => string = () => crypto.randomUUID(),
    private readonly clock: () => string = () => new Date().toISOString(),
    private readonly nested = false,
  ) {}

  async transaction<T>(work: (tx: OpportunityAssessmentRepository) => Promise<T>): Promise<T> {
    if (this.nested) return work(this);
    try {
      return await this.prisma.$transaction(async (client) => {
        const tx = new PrismaOpportunityAssessmentRepository(client, this.ids, this.clock, true);
        return work(tx);
      });
    } catch (error) {
      if (error instanceof OpportunityAssessmentError || error instanceof AssessmentCommandUniquenessCollision) {
        throw error;
      }
      translatePrismaError(error);
    }
  }

  async getOrCreateAssessment(input: {
    organizationId: string;
    opportunityId: string;
    actorUserId: string | null;
    channel: AssessmentUpdatedChannel;
  }): Promise<OpportunityAssessmentRecord> {
    const existing = await this.findAssessmentByOpportunity(input.opportunityId);
    if (existing) {
      this.assertOrganization(existing.organizationId, input.organizationId);
      return existing;
    }
    try {
      const created = await this.prismaCall(() =>
        this.prisma.enterpriseOpportunityAssessment.create({
          data: {
            organizationId: input.organizationId,
            opportunityId: input.opportunityId,
            currentRevisionId: null,
            draftFactsJson: emptyOpportunityAssessmentFacts(),
            sourceFingerprintJson: buildOpportunityAssessmentSourceFingerprint(),
            readinessStatus: "incomplete",
            unsupportedReasonCode: null,
            selectedContributorParticipantRef: null,
            rowVersion: 1,
            createdByUserId: input.actorUserId,
            updatedByUserId: input.actorUserId,
            updatedChannel: input.channel,
          },
        }),
      );
      return mapAssessmentRow(created);
    } catch (error) {
      if (identifyAssessmentUniqueConstraint(error) !== "assessment_opportunity") {
        if (error instanceof OpportunityAssessmentError) throw error;
        translatePrismaError(error);
      }
      const raced = await this.findAssessmentByOpportunity(input.opportunityId);
      if (!raced) throw persistenceFailure();
      this.assertOrganization(raced.organizationId, input.organizationId);
      return raced;
    }
  }

  async getAssessment(organizationId: string, assessmentId: string): Promise<OpportunityAssessmentRecord> {
    const row = await this.prismaCall(() =>
      this.prisma.enterpriseOpportunityAssessment.findUnique({ where: { id: assessmentId } }),
    );
    if (!row) throw new OpportunityAssessmentError("ASSESSMENT_NOT_FOUND");
    this.assertOrganization(String(row.organizationId), organizationId);
    return mapAssessmentRow(row);
  }

  async getRevision(organizationId: string, revisionId: string): Promise<OpportunityAssessmentRevisionRecord> {
    const row = await this.prismaCall(() =>
      this.prisma.enterpriseOpportunityAssessmentRevision.findUnique({ where: { id: revisionId } }),
    );
    if (!row) throw new OpportunityAssessmentError("REVISION_NOT_FOUND");
    this.assertOrganization(String(row.organizationId), organizationId);
    return mapRevisionRow(row);
  }

  async findRevisionByCommand(organizationId: string, commandId: string): Promise<OpportunityAssessmentRevisionRecord | null> {
    const row = await this.prismaCall(() =>
      this.prisma.enterpriseOpportunityAssessmentRevision.findFirst({
        where: { organizationId, commandId },
      }),
    );
    if (!row) return null;
    this.assertOrganization(String(row.organizationId), organizationId);
    return mapRevisionRow(row);
  }

  async listRevisions(organizationId: string, assessmentId: string): Promise<OpportunityAssessmentRevisionRecord[]> {
    const rows = await this.prismaCall(() =>
      this.prisma.enterpriseOpportunityAssessmentRevision.findMany({
        where: { organizationId, assessmentId },
        orderBy: { revisionNumber: "asc" },
      }),
    );
    return rows.map((row) => {
      this.assertOrganization(String(row.organizationId), organizationId);
      return mapRevisionRow(row);
    });
  }

  async insertRevision(row: OpportunityAssessmentRevisionRecord): Promise<OpportunityAssessmentRevisionRecord> {
    if (row.revisionKind === "FINALIZED" && (!row.finalizedAt || !row.finalizedChannel)) {
      throw new OpportunityAssessmentError("INVALID_FINALIZATION");
    }
    if (row.revisionKind === "SAVED" && (row.finalizedAt != null || row.finalizedChannel != null)) {
      throw new OpportunityAssessmentError("INVALID_FINALIZATION");
    }
    try {
      const created = await this.prismaCall(() =>
        this.prisma.enterpriseOpportunityAssessmentRevision.create({
          data: revisionCreateData(row),
        }),
      );
      return mapRevisionRow(created);
    } catch (error) {
      const constraint = identifyAssessmentUniqueConstraint(error);
      if (constraint === "revision_command") {
        const existing = await this.findRevisionByCommand(row.organizationId, row.commandId);
        throw new AssessmentCommandUniquenessCollision(row.organizationId, row.commandId, existing?.id ?? "");
      }
      if (constraint === "revision_number") throw new OpportunityAssessmentError("ASSESSMENT_CONFLICT");
      if (error instanceof OpportunityAssessmentError) throw error;
      translatePrismaError(error);
    }
  }

  async advanceAssessmentCursor(input: {
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
  }): Promise<OpportunityAssessmentRecord> {
    const result = await this.prismaCall(() =>
      this.prisma.enterpriseOpportunityAssessment.updateMany({
        where: {
          id: input.assessmentId,
          organizationId: input.organizationId,
          rowVersion: input.expectedRowVersion,
        },
        data: {
          currentRevisionId: input.currentRevisionId,
          draftFactsJson: input.draftFactsJson,
          sourceFingerprintJson: input.sourceFingerprintJson,
          readinessStatus: input.readinessStatus,
          unsupportedReasonCode: input.unsupportedReasonCode,
          selectedContributorParticipantRef: input.selectedContributorParticipantRef,
          rowVersion: { increment: 1 },
          updatedByUserId: input.updatedByUserId,
          updatedChannel: input.updatedChannel,
          updatedAt: new Date(this.clock()),
        },
      }),
    );
    if (result.count !== 1) throw new OpportunityAssessmentError("ASSESSMENT_CONFLICT");
    return this.getAssessment(input.organizationId, input.assessmentId);
  }

  async insertRun(row: OpportunityAssessmentRecommendationRunRecord): Promise<OpportunityAssessmentRecommendationRunRecord> {
    try {
      const created = await this.prismaCall(() =>
        this.prisma.enterpriseOpportunityAssessmentRecommendationRun.create({
          data: runCreateData(row),
        }),
      );
      return mapRunRow(created);
    } catch (error) {
      if (identifyAssessmentUniqueConstraint(error) !== "run_id") {
        if (error instanceof OpportunityAssessmentError) throw error;
        translatePrismaError(error);
      }
      const existing = await this.getRun(row.organizationId, row.id);
      if (existing.requestHash !== row.requestHash) throw new OpportunityAssessmentError("IDEMPOTENCY_CONFLICT");
      return existing;
    }
  }

  async getRun(organizationId: string, requestId: string): Promise<OpportunityAssessmentRecommendationRunRecord> {
    const row = await this.prismaCall(() =>
      this.prisma.enterpriseOpportunityAssessmentRecommendationRun.findUnique({ where: { id: requestId } }),
    );
    if (!row) throw new OpportunityAssessmentError("RUN_NOT_FOUND");
    this.assertOrganization(String(row.organizationId), organizationId);
    return mapRunRow(row);
  }

  async completeRun(row: OpportunityAssessmentRecommendationRunRecord): Promise<OpportunityAssessmentRecommendationRunRecord> {
    const existing = await this.getRun(row.organizationId, row.id);
    if (existing.requestHash !== row.requestHash) throw new OpportunityAssessmentError("IDEMPOTENCY_CONFLICT");
    if (existing.resultStatus !== "pending") {
      if (existing.resultStatus !== row.resultStatus || existing.failureCode !== row.failureCode) {
        throw new OpportunityAssessmentError("RUN_ALREADY_TERMINAL");
      }
      return existing;
    }
    const updated = await this.prismaCall(() =>
      this.prisma.enterpriseOpportunityAssessmentRecommendationRun.updateMany({
        where: {
          id: row.id,
          organizationId: row.organizationId,
          resultStatus: "pending",
          requestHash: row.requestHash,
        },
        data: {
          resultStatus: row.resultStatus,
          missingInputCodes: row.missingInputCodes,
          rejectedProgrammeCodesJson: row.rejectedProgrammeCodesJson,
          acceptedProgrammeIdsJson: row.acceptedProgrammeIdsJson.map((item) => ({ ...item, lenderScore: null })),
          cibilNotKnownDisclaimer: row.cibilNotKnownDisclaimer,
          failureCode: row.failureCode,
        },
      }),
    );
    if (updated.count !== 1) throw new OpportunityAssessmentError("RUN_ALREADY_TERMINAL");
    return this.getRun(row.organizationId, row.id);
  }

  async listRuns(organizationId: string, assessmentId: string): Promise<OpportunityAssessmentRecommendationRunRecord[]> {
    const rows = await this.prismaCall(() =>
      this.prisma.enterpriseOpportunityAssessmentRecommendationRun.findMany({
        where: { organizationId, assessmentId },
      }),
    );
    return rows.map((row) => {
      this.assertOrganization(String(row.organizationId), organizationId);
      return mapRunRow(row);
    });
  }

  nextId() {
    return this.ids();
  }

  now() {
    return this.clock();
  }

  schemaVersions() {
    return {
      factsSchemaVersion: OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
      mapperVersion: OPPORTUNITY_ASSESSMENT_MAPPER_VERSION,
    };
  }

  private async prismaCall<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof OpportunityAssessmentError || error instanceof AssessmentCommandUniquenessCollision) throw error;
      if (isPrismaUniqueConflict(error)) throw error;
      translatePrismaError(error);
    }
  }

  private async findAssessmentByOpportunity(opportunityId: string) {
    const row = await this.prismaCall(() =>
      this.prisma.enterpriseOpportunityAssessment.findUnique({ where: { opportunityId } }),
    );
    return row ? mapAssessmentRow(row) : null;
  }

  private assertOrganization(actual: string, trusted: string) {
    if (actual !== trusted) throw new OpportunityAssessmentError("CROSS_ORGANIZATION_ACCESS");
  }
}
