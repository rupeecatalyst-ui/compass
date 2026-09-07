import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  DurablePolicyVersionRecord,
  ProgrammeAuditEvent,
  ProgrammeVersionRecord,
  StructuredProgrammePayload,
} from "@/types/product-programme-operations";
import { evaluateProgrammeCompleteness } from "@/lib/product-programme-operations/completeness";
import {
  assertLockVersion,
  assertPublishedNotOverwritten,
  classifyIncompleteStub,
  nextDraftVersionNumber,
} from "@/lib/product-programme-operations/versioning";
import { ProgrammePermissionError, ProgrammeValidationError } from "@/types/product-programme-operations";

type DurableBag = {
  programmes: ProgrammeVersionRecord[];
  policies: DurablePolicyVersionRecord[];
  policyHeads: Array<{
    id: string;
    organizationId: string;
    policyCode: string;
    name: string;
    currentPublishedVersionId: string | null;
  }>;
  audits: ProgrammeAuditEvent[];
};

function emptyBag(): DurableBag {
  return { programmes: [], policies: [], policyHeads: [], audits: [] };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class IsolatedProgrammeDurableStore {
  constructor(private readonly filePath: string) {}

  private read(): DurableBag {
    if (!existsSync(this.filePath)) return emptyBag();
    return JSON.parse(readFileSync(this.filePath, "utf8")) as DurableBag;
  }

  private write(bag: DurableBag): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(bag, null, 2), "utf8");
  }

  reload(): DurableBag {
    return this.read();
  }

  createProgramme(input: {
    organizationId: string;
    actorUserId: string;
    actorName?: string;
    actorRole: string;
    payload: StructuredProgrammePayload;
  }): ProgrammeVersionRecord {
    this.assertAdmin(input.actorRole);
    const bag = this.read();
    const now = new Date().toISOString();
    const id = randomUUID();
    const completeness = evaluateProgrammeCompleteness(input.payload);
    const record: ProgrammeVersionRecord = {
      ...input.payload,
      id,
      organizationId: input.organizationId,
      lineageId: id,
      versionNumber: 1,
      lockVersion: 1,
      completenessState: completeness.complete ? "complete" : "incomplete",
      publicationState: "draft",
      isLivePublished: false,
      enabled: true,
      lifecycleStatus: "draft",
      status: "draft",
      approvalStatus: "none",
      supersedesProgramId: null,
      submittedByUserId: null,
      submittedAt: null,
      approvedBy: null,
      approvedAt: null,
      approvalReason: null,
      createdBy: input.actorUserId,
      modifiedBy: input.actorUserId,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    bag.programmes.push(record);
    bag.audits.push(this.audit(input.organizationId, record, "created", null, record, input.actorUserId, input.actorName));
    this.write(bag);
    return clone(record);
  }

  updateProgramme(input: {
    organizationId: string;
    actorUserId: string;
    actorName?: string;
    actorRole: string;
    programId: string;
    payload: StructuredProgrammePayload;
    expectedLockVersion?: number;
    createDraftRevision?: boolean;
  }): ProgrammeVersionRecord {
    this.assertAdmin(input.actorRole);
    const bag = this.read();
    const existing = bag.programmes.find((row) => row.id === input.programId && !row.isDeleted);
    if (!existing) throw new Error("Lender program not found.");
    if (existing.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    assertLockVersion(existing, input.expectedLockVersion);
    assertPublishedNotOverwritten(existing, input.createDraftRevision === true);

    if (existing.publicationState === "published" && existing.isLivePublished && input.createDraftRevision) {
      const now = new Date().toISOString();
      const existingDraft = bag.programmes.find(
        (row) =>
          row.lineageId === existing.lineageId &&
          row.id !== existing.id &&
          !row.isDeleted &&
          row.isLivePublished === false &&
          (row.publicationState === "draft" || row.publicationState === "pending_approval"),
      );
      if (existingDraft?.publicationState === "draft") {
        Object.assign(existingDraft, input.payload, {
          completenessState: evaluateProgrammeCompleteness({ ...existingDraft, ...input.payload }).complete
            ? "complete"
            : "incomplete",
          publicationState: "draft",
          isLivePublished: false,
          lifecycleStatus: "draft",
          status: "draft",
          approvalStatus: "none",
          submittedByUserId: null,
          submittedAt: null,
          approvedBy: null,
          approvedAt: null,
          approvalReason: null,
          lockVersion: existingDraft.lockVersion + 1,
          modifiedBy: input.actorUserId,
          updatedAt: now,
        });
        bag.audits.push(
          this.audit(input.organizationId, existingDraft, "draft_revision_created", existing, existingDraft, input.actorUserId, input.actorName),
        );
        this.write(bag);
        return clone(existingDraft);
      }
      if (existingDraft) {
        return clone(existingDraft);
      }
      const draft: ProgrammeVersionRecord = {
        ...existing,
        ...input.payload,
        id: randomUUID(),
        versionNumber: nextDraftVersionNumber(
          Math.max(
            existing.versionNumber,
            ...bag.programmes
              .filter((row) => row.lineageId === existing.lineageId && !row.isDeleted)
              .map((row) => row.versionNumber),
          ),
        ),
        lockVersion: 1,
        publicationState: "draft",
        isLivePublished: false,
        lifecycleStatus: "draft",
        status: "draft",
        approvalStatus: "none",
        completenessState: evaluateProgrammeCompleteness({ ...existing, ...input.payload }).complete
          ? "complete"
          : "incomplete",
        supersedesProgramId: existing.id,
        submittedByUserId: null,
        submittedAt: null,
        approvedBy: null,
        approvedAt: null,
        approvalReason: null,
        createdBy: input.actorUserId,
        modifiedBy: input.actorUserId,
        createdAt: now,
        updatedAt: now,
      };
      bag.programmes.push(draft);
      bag.audits.push(
        this.audit(input.organizationId, draft, "draft_revision_created", existing, draft, input.actorUserId, input.actorName),
      );
      this.write(bag);
      return clone(draft);
    }

    const previous = clone(existing);
    Object.assign(existing, input.payload, {
      completenessState: evaluateProgrammeCompleteness(input.payload).complete ? "complete" : "incomplete",
      lockVersion: existing.lockVersion + 1,
      modifiedBy: input.actorUserId,
      updatedAt: new Date().toISOString(),
    });
    bag.audits.push(
      this.audit(input.organizationId, existing, "updated", previous, existing, input.actorUserId, input.actorName),
    );
    this.write(bag);
    return clone(existing);
  }

  submit(input: {
    organizationId: string;
    actorUserId: string;
    actorRole: string;
    programId: string;
  }): ProgrammeVersionRecord {
    this.assertAdmin(input.actorRole);
    const bag = this.read();
    const row = bag.programmes.find((item) => item.id === input.programId && !item.isDeleted);
    if (!row) throw new Error("Lender program not found.");
    if (row.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    row.publicationState = "pending_approval";
    row.approvalStatus = "pending";
    row.submittedByUserId = input.actorUserId;
    row.submittedAt = new Date().toISOString();
    row.modifiedBy = input.actorUserId;
    bag.audits.push(this.audit(input.organizationId, row, "submitted", null, row, input.actorUserId));
    this.write(bag);
    return clone(row);
  }

  approve(input: {
    organizationId: string;
    actorUserId: string;
    actorRole: string;
    programId: string;
    approvalReason?: string;
  }): ProgrammeVersionRecord {
    this.assertAdmin(input.actorRole);
    const bag = this.read();
    const row = bag.programmes.find((item) => item.id === input.programId && !item.isDeleted);
    if (!row) throw new Error("Lender program not found.");
    if (row.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    if (row.createdBy === input.actorUserId && input.actorRole !== "SUPER_ADMIN") {
      throw new ProgrammePermissionError("Creator cannot approve their own programme.");
    }
    if (row.createdBy === input.actorUserId && input.actorRole === "SUPER_ADMIN" && !input.approvalReason?.trim()) {
      throw new ProgrammePermissionError("Super Admin self-approval requires an audit reason.");
    }
    row.approvalStatus = "approved";
    row.approvedBy = input.actorUserId;
    row.approvedAt = new Date().toISOString();
    row.approvalReason = input.approvalReason ?? "approved";
    row.modifiedBy = input.actorUserId;
    bag.audits.push(this.audit(input.organizationId, row, "approved", null, row, input.actorUserId, input.approvalReason));
    this.write(bag);
    return clone(row);
  }

  publishApproved(input: {
    organizationId: string;
    actorUserId: string;
    actorRole: string;
    programId: string;
  }): ProgrammeVersionRecord {
    this.assertAdmin(input.actorRole);
    const bag = this.read();
    const draft = bag.programmes.find((row) => row.id === input.programId && !row.isDeleted);
    if (!draft) throw new Error("Lender program not found.");
    if (draft.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    if (draft.approvalStatus !== "approved") {
      throw new Error("Only an approved draft can replace the active published version.");
    }
    const completeness = evaluateProgrammeCompleteness(draft);
    if (!completeness.complete) {
      throw new ProgrammeValidationError("Programme is not complete enough to publish", completeness.errors);
    }
    for (const row of bag.programmes) {
      if (row.lineageId === draft.lineageId && row.isLivePublished) {
        row.isLivePublished = false;
        row.publicationState = "superseded";
        row.lifecycleStatus = "inactive";
        row.status = "inactive";
      }
    }
    draft.publicationState = "published";
    draft.isLivePublished = true;
    draft.lifecycleStatus = "active";
    draft.status = "active";
    draft.modifiedBy = input.actorUserId;
    draft.updatedAt = new Date().toISOString();
    bag.audits.push(
      this.audit(input.organizationId, draft, "published", null, draft, input.actorUserId, "publish"),
    );
    this.write(bag);
    return clone(draft);
  }

  deactivate(input: {
    organizationId: string;
    actorUserId: string;
    actorRole: string;
    programId: string;
  }): ProgrammeVersionRecord {
    this.assertAdmin(input.actorRole);
    const bag = this.read();
    const row = bag.programmes.find((item) => item.id === input.programId && !item.isDeleted);
    if (!row) throw new Error("Lender program not found.");
    if (row.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    row.isLivePublished = false;
    row.publicationState = "archived";
    row.lifecycleStatus = "inactive";
    row.status = "inactive";
    row.enabled = false;
    row.modifiedBy = input.actorUserId;
    row.updatedAt = new Date().toISOString();
    bag.audits.push(this.audit(input.organizationId, row, "deactivated", null, row, input.actorUserId));
    this.write(bag);
    return clone(row);
  }

  createPublishedPolicy(input: {
    organizationId: string;
    actorUserId: string;
    name: string;
    policyCode: string;
    lenderId?: string | null;
    productCode?: string | null;
    eligibilityRules?: Record<string, unknown>;
    creditRules?: Record<string, unknown>;
  }): DurablePolicyVersionRecord {
    const bag = this.read();
    const now = new Date().toISOString();
    const policyId = randomUUID();
    const versionId = randomUUID();
    const version: DurablePolicyVersionRecord = {
      id: versionId,
      organizationId: input.organizationId,
      policyId,
      policyCode: input.policyCode,
      name: input.name,
      lenderId: input.lenderId ?? null,
      productCode: input.productCode ?? null,
      productVariantCode: null,
      versionNumber: 1,
      status: "published",
      eligibilityRules: input.eligibilityRules ?? {},
      creditRules: input.creditRules ?? {},
      payload: {},
      sourceRef: "isolated-fixture",
      effectiveFrom: now,
      reviewAt: null,
      effectiveUntil: null,
      createdBy: input.actorUserId,
      approvedBy: input.actorUserId,
      approvedAt: now,
      publishedBy: input.actorUserId,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    bag.policyHeads.push({
      id: policyId,
      organizationId: input.organizationId,
      policyCode: input.policyCode,
      name: input.name,
      currentPublishedVersionId: versionId,
    });
    bag.policies.push(version);
    this.write(bag);
    return clone(version);
  }

  getPolicy(id: string): DurablePolicyVersionRecord | null {
    return clone(this.read().policies.find((row) => row.id === id) ?? null);
  }

  listAudits(programId: string): ProgrammeAuditEvent[] {
    return this.read().audits.filter((row) => row.programId === programId).map(clone);
  }

  getProgramme(id: string): ProgrammeVersionRecord | null {
    return clone(this.read().programmes.find((row) => row.id === id) ?? null);
  }

  listLineage(lineageId: string): ProgrammeVersionRecord[] {
    return this.read()
      .programmes.filter((row) => row.lineageId === lineageId)
      .sort((a, b) => a.versionNumber - b.versionNumber)
      .map(clone);
  }

  classifyExistingStubs(): number {
    const bag = this.read();
    let changed = 0;
    for (const row of bag.programmes) {
      const classified = classifyIncompleteStub(row);
      if (classified.shouldDemoteFromPublished && (row.isLivePublished || row.publicationState === "published")) {
        row.completenessState = "incomplete";
        row.publicationState = "draft";
        row.isLivePublished = false;
        row.lifecycleStatus = "draft";
        row.status = "draft";
        changed += 1;
      }
    }
    this.write(bag);
    return changed;
  }

  private assertAdmin(role: string): void {
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      throw new ProgrammePermissionError("Ordinary users cannot mutate programmes.");
    }
  }

  private audit(
    organizationId: string,
    record: ProgrammeVersionRecord,
    action: string,
    previous: ProgrammeVersionRecord | null,
    next: ProgrammeVersionRecord,
    actorUserId: string,
    actorName?: string,
  ): ProgrammeAuditEvent {
    return {
      id: randomUUID(),
      organizationId,
      programId: record.id,
      lineageId: record.lineageId,
      action,
      previousValue: previous ? (clone(previous) as unknown as Record<string, unknown>) : null,
      newValue: clone(next) as unknown as Record<string, unknown>,
      actorUserId,
      actorName,
      reason: action,
      createdAt: new Date().toISOString(),
    };
  }
}
