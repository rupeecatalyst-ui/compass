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

export { AssessmentCommandUniquenessCollision };

export type OpportunityAssessmentStore = {
  assessments: Map<string, OpportunityAssessmentRecord>;
  assessmentsByOpportunity: Map<string, string>;
  revisions: Map<string, OpportunityAssessmentRevisionRecord>;
  revisionsByCommand: Map<string, string>;
  runs: Map<string, OpportunityAssessmentRecommendationRunRecord>;
};

export function createEmptyOpportunityAssessmentStore(): OpportunityAssessmentStore {
  return {
    assessments: new Map(),
    assessmentsByOpportunity: new Map(),
    revisions: new Map(),
    revisionsByCommand: new Map(),
    runs: new Map(),
  };
}

function cloneStore(store: OpportunityAssessmentStore): OpportunityAssessmentStore {
  return {
    assessments: new Map([...store.assessments.entries()].map(([id, row]) => [id, structuredClone(row)])),
    assessmentsByOpportunity: new Map(store.assessmentsByOpportunity),
    revisions: new Map([...store.revisions.entries()].map(([id, row]) => [id, structuredClone(row)])),
    revisionsByCommand: new Map(store.revisionsByCommand),
    runs: new Map([...store.runs.entries()].map(([id, row]) => [id, structuredClone(row)])),
  };
}

function opportunityKey(organizationId: string, opportunityId: string) {
  return `${organizationId}:${opportunityId}`;
}

function commandKey(organizationId: string, commandId: string) {
  return `${organizationId}:${commandId}`;
}

export class MemoryOpportunityAssessmentRepository implements OpportunityAssessmentRepository {
  failNextTransactionAfter: "revision-insert" | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private store: OpportunityAssessmentStore = createEmptyOpportunityAssessmentStore(),
    private readonly ids: () => string = () => crypto.randomUUID(),
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const run = this.queue.then(work, work);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async transaction<T>(work: (tx: MemoryOpportunityAssessmentRepository) => Promise<T>): Promise<T> {
    return this.exclusive(async () => {
      const snapshot = cloneStore(this.store);
      const tx = new MemoryOpportunityAssessmentRepository(this.store, this.ids, this.clock);
      tx.failNextTransactionAfter = this.failNextTransactionAfter;
      try {
        const result = await work(tx);
        this.failNextTransactionAfter = null;
        return result;
      } catch (error) {
        this.store = snapshot;
        this.failNextTransactionAfter = null;
        throw error;
      }
    });
  }

  async getOrCreateAssessment(input: {
    organizationId: string;
    opportunityId: string;
    actorUserId: string | null;
    channel: AssessmentUpdatedChannel;
  }): Promise<OpportunityAssessmentRecord> {
    const key = opportunityKey(input.organizationId, input.opportunityId);
    const existingId = this.store.assessmentsByOpportunity.get(key);
    if (existingId) {
      const existing = this.store.assessments.get(existingId);
      if (!existing) throw new OpportunityAssessmentError("ASSESSMENT_NOT_FOUND");
      this.assertOrganization(existing.organizationId, input.organizationId);
      return structuredClone(existing);
    }
    const now = this.clock();
    const created: OpportunityAssessmentRecord = {
      id: this.ids(),
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
      createdAt: now,
      updatedAt: now,
    };
    this.store.assessments.set(created.id, created);
    this.store.assessmentsByOpportunity.set(key, created.id);
    return structuredClone(created);
  }

  async getAssessment(organizationId: string, assessmentId: string): Promise<OpportunityAssessmentRecord> {
    const row = this.store.assessments.get(assessmentId);
    if (!row) throw new OpportunityAssessmentError("ASSESSMENT_NOT_FOUND");
    this.assertOrganization(row.organizationId, organizationId);
    return structuredClone(row);
  }

  async getRevision(organizationId: string, revisionId: string): Promise<OpportunityAssessmentRevisionRecord> {
    const row = this.store.revisions.get(revisionId);
    if (!row) throw new OpportunityAssessmentError("REVISION_NOT_FOUND");
    this.assertOrganization(row.organizationId, organizationId);
    return structuredClone(row);
  }

  async findRevisionByCommand(organizationId: string, commandId: string): Promise<OpportunityAssessmentRevisionRecord | null> {
    const id = this.store.revisionsByCommand.get(commandKey(organizationId, commandId));
    if (!id) return null;
    return this.getRevision(organizationId, id);
  }

  async listRevisions(organizationId: string, assessmentId: string): Promise<OpportunityAssessmentRevisionRecord[]> {
    return [...this.store.revisions.values()]
      .filter((row) => row.assessmentId === assessmentId)
      .map((row) => {
        this.assertOrganization(row.organizationId, organizationId);
        return structuredClone(row);
      })
      .sort((a, b) => a.revisionNumber - b.revisionNumber);
  }

  async insertRevision(row: OpportunityAssessmentRevisionRecord): Promise<OpportunityAssessmentRevisionRecord> {
    const duplicateNumber = [...this.store.revisions.values()].some(
      (existing) => existing.assessmentId === row.assessmentId && existing.revisionNumber === row.revisionNumber,
    );
    if (duplicateNumber) throw new OpportunityAssessmentError("ASSESSMENT_CONFLICT");
    if (row.revisionKind === "FINALIZED" && (!row.finalizedAt || !row.finalizedChannel)) {
      throw new OpportunityAssessmentError("INVALID_FINALIZATION");
    }
    if (row.revisionKind === "SAVED" && (row.finalizedAt != null || row.finalizedChannel != null)) {
      throw new OpportunityAssessmentError("INVALID_FINALIZATION");
    }
    if (row.commandId) {
      const command = commandKey(row.organizationId, row.commandId);
      const existingId = this.store.revisionsByCommand.get(command);
      if (existingId) {
        throw new AssessmentCommandUniquenessCollision(row.organizationId, row.commandId, existingId);
      }
      this.store.revisionsByCommand.set(command, row.id);
    }
    this.store.revisions.set(row.id, structuredClone(row));
    if (this.failNextTransactionAfter === "revision-insert") {
      throw new Error("injected-transaction-failure");
    }
    return structuredClone(row);
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
    const existing = this.store.assessments.get(input.assessmentId);
    if (!existing) throw new OpportunityAssessmentError("ASSESSMENT_NOT_FOUND");
    this.assertOrganization(existing.organizationId, input.organizationId);
    if (existing.rowVersion !== input.expectedRowVersion) {
      throw new OpportunityAssessmentError("ASSESSMENT_CONFLICT");
    }
    const updated: OpportunityAssessmentRecord = {
      ...existing,
      currentRevisionId: input.currentRevisionId,
      draftFactsJson: structuredClone(input.draftFactsJson),
      sourceFingerprintJson: structuredClone(input.sourceFingerprintJson),
      readinessStatus: input.readinessStatus,
      unsupportedReasonCode: input.unsupportedReasonCode,
      selectedContributorParticipantRef: input.selectedContributorParticipantRef,
      rowVersion: existing.rowVersion + 1,
      updatedByUserId: input.updatedByUserId,
      updatedChannel: input.updatedChannel,
      updatedAt: this.clock(),
    };
    this.store.assessments.set(updated.id, updated);
    return structuredClone(updated);
  }

  async insertRun(row: OpportunityAssessmentRecommendationRunRecord): Promise<OpportunityAssessmentRecommendationRunRecord> {
    if (this.store.runs.has(row.id)) {
      const existing = this.store.runs.get(row.id)!;
      this.assertOrganization(existing.organizationId, row.organizationId);
      if (existing.requestHash !== row.requestHash) throw new OpportunityAssessmentError("IDEMPOTENCY_CONFLICT");
      return structuredClone(existing);
    }
    this.store.runs.set(row.id, structuredClone(row));
    return structuredClone(row);
  }

  async getRun(organizationId: string, requestId: string): Promise<OpportunityAssessmentRecommendationRunRecord> {
    const row = this.store.runs.get(requestId);
    if (!row) throw new OpportunityAssessmentError("RUN_NOT_FOUND");
    this.assertOrganization(row.organizationId, organizationId);
    return structuredClone(row);
  }

  async completeRun(row: OpportunityAssessmentRecommendationRunRecord): Promise<OpportunityAssessmentRecommendationRunRecord> {
    const existing = this.store.runs.get(row.id);
    if (!existing) throw new OpportunityAssessmentError("RUN_NOT_FOUND");
    this.assertOrganization(existing.organizationId, row.organizationId);
    if (existing.requestHash !== row.requestHash) throw new OpportunityAssessmentError("IDEMPOTENCY_CONFLICT");
    if (existing.resultStatus !== "pending") {
      if (
        existing.resultStatus !== row.resultStatus ||
        existing.failureCode !== row.failureCode
      ) {
        throw new OpportunityAssessmentError("RUN_ALREADY_TERMINAL");
      }
      return structuredClone(existing);
    }
    this.store.runs.set(row.id, structuredClone(row));
    return structuredClone(row);
  }

  async listRuns(organizationId: string, assessmentId: string): Promise<OpportunityAssessmentRecommendationRunRecord[]> {
    return [...this.store.runs.values()]
      .filter((row) => row.assessmentId === assessmentId)
      .map((row) => {
        this.assertOrganization(row.organizationId, organizationId);
        return structuredClone(row);
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

  private assertOrganization(actual: string, trusted: string) {
    if (actual !== trusted) throw new OpportunityAssessmentError("CROSS_ORGANIZATION_ACCESS");
  }
}
