import { lenderRegistryRepository } from "@server/repositories/lender-registry/lender-registry.repository";
import { parseStructuredProgrammePayload } from "@/lib/product-programme-operations/request-schema";
import {
  structuredPayloadToCreateInput,
  structuredPayloadToUpdateInput,
} from "@/lib/product-programme-operations/to-registry-input";
import {
  assertLockVersion,
  assertPublishedNotOverwritten,
} from "@/lib/product-programme-operations/versioning";
import {
  ProgrammePermissionError,
  ProgrammeValidationError,
  type ProgrammeVersionRecord,
} from "@/types/product-programme-operations";
import { deriveEmploymentFamily } from "@/lib/product-programme-operations/employment";

function assertAdmin(role: string): void {
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new ProgrammePermissionError("Ordinary users cannot mutate programmes.");
  }
}

export const productProgrammeOperationsService = {
  parseBody(body: unknown) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ProgrammeValidationError("Request body must be an object", [
        { field: "body", message: "Request body must be a JSON object." },
      ]);
    }
    return parseStructuredProgrammePayload(body as Record<string, unknown>);
  },

  async create(input: {
    organizationId: string;
    actorUserId: string;
    actorName?: string;
    actorRole: string;
    body: unknown;
  }) {
    assertAdmin(input.actorRole);
    const payload = this.parseBody(input.body);
    const created = await lenderRegistryRepository.createProgram(
      input.organizationId,
      structuredPayloadToCreateInput(payload, input.actorUserId),
    );
    if (created.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    await lenderRegistryRepository.recordProgramAudit({
      organizationId: input.organizationId,
      programId: created.id,
      lineageId: created.lineageId ?? created.id,
      action: "created",
      newValue: created,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      reason: "lender_program_created",
    });
    return created;
  },

  async update(input: {
    organizationId: string;
    actorUserId: string;
    actorName?: string;
    actorRole: string;
    programId: string;
    body: unknown;
  }) {
    assertAdmin(input.actorRole);
    const existing = await lenderRegistryRepository.findProgramById(input.programId);
    if (!existing) throw new Error("Lender program not found.");
    if (existing.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    const raw = input.body && typeof input.body === "object" ? (input.body as Record<string, unknown>) : {};
    parseStructuredProgrammePayload(raw, { partial: true });
    const createDraftRevision = raw.createDraftRevision === true;
    const expectedLockVersion =
      typeof raw.expectedLockVersion === "number" ? raw.expectedLockVersion : undefined;
    assertLockVersion(
      { id: existing.id, lockVersion: existing.lockVersion ?? 1 },
      expectedLockVersion,
    );
    assertPublishedNotOverwritten(
      {
        id: existing.id,
        publicationState: existing.publicationState ?? "draft",
        isLivePublished: existing.isLivePublished ?? false,
      },
      createDraftRevision,
    );
    const payload = parseStructuredProgrammePayload({
      lenderId: existing.lenderId,
      code: existing.code,
      label: existing.label,
      ...raw,
    });
    const updateInput = structuredPayloadToUpdateInput(payload, input.actorUserId);
    const updated = createDraftRevision
      ? await lenderRegistryRepository.createDraftFromPublished(input.programId, updateInput)
      : await lenderRegistryRepository.updateProgram(input.programId, updateInput);
    await lenderRegistryRepository.recordProgramAudit({
      organizationId: input.organizationId,
      programId: updated.id,
      lineageId: updated.lineageId ?? existing.lineageId ?? existing.id,
      action: createDraftRevision ? "draft_revision_created" : "updated",
      previousValue: existing,
      newValue: updated,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      reason: createDraftRevision ? "draft_revision_created" : "lender_program_updated",
    });
    return updated;
  },
};

export function toProgrammeVersionView(record: {
  id: string;
  organizationId: string;
  employmentTypes?: string[] | null;
}): Pick<ProgrammeVersionRecord, "id" | "organizationId" | "employmentFamily"> {
  return {
    id: record.id,
    organizationId: record.organizationId,
    employmentFamily: deriveEmploymentFamily((record.employmentTypes ?? []) as never),
  };
}
