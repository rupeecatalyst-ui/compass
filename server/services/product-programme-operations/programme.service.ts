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
import { evaluateProgrammeCompleteness } from "@/lib/product-programme-operations/completeness";
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

  async submit(input: {
    organizationId: string;
    actorUserId: string;
    actorRole: string;
    programId: string;
    actorName?: string;
  }) {
    assertAdmin(input.actorRole);
    const existing = await lenderRegistryRepository.findProgramById(input.programId);
    if (!existing) throw new Error("Lender program not found.");
    if (existing.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    const updated = await lenderRegistryRepository.submitProgram(input.programId, input.actorUserId);
    await lenderRegistryRepository.recordProgramAudit({
      organizationId: input.organizationId,
      programId: updated.id,
      lineageId: updated.lineageId ?? existing.id,
      action: "submitted",
      previousValue: existing,
      newValue: updated,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      reason: "submitted_for_approval",
    });
    return updated;
  },

  async approve(input: {
    organizationId: string;
    actorUserId: string;
    actorRole: string;
    programId: string;
    actorName?: string;
    approvalReason?: string;
  }) {
    assertAdmin(input.actorRole);
    const existing = await lenderRegistryRepository.findProgramById(input.programId);
    if (!existing) throw new Error("Lender program not found.");
    if (existing.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    if (existing.createdBy === input.actorUserId && input.actorRole !== "SUPER_ADMIN") {
      throw new ProgrammePermissionError("Creator cannot approve their own programme.");
    }
    if (existing.createdBy === input.actorUserId && input.actorRole === "SUPER_ADMIN" && !input.approvalReason?.trim()) {
      throw new ProgrammePermissionError("Super Admin self-approval requires an audit reason.");
    }
    const updated = await lenderRegistryRepository.approveProgram(
      input.programId,
      input.actorUserId,
      input.approvalReason?.trim() || "approved",
    );
    await lenderRegistryRepository.recordProgramAudit({
      organizationId: input.organizationId,
      programId: updated.id,
      lineageId: updated.lineageId ?? existing.id,
      action: "approved",
      previousValue: existing,
      newValue: updated,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      reason: input.approvalReason?.trim() || "approved",
    });
    return updated;
  },

  async publish(input: {
    organizationId: string;
    actorUserId: string;
    actorRole: string;
    programId: string;
    actorName?: string;
  }) {
    assertAdmin(input.actorRole);
    const existing = await lenderRegistryRepository.findProgramById(input.programId);
    if (!existing) throw new Error("Lender program not found.");
    if (existing.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    if (existing.approvalStatus !== "approved") {
      throw new ProgrammeValidationError("Programme must be approved before publish", [
        { field: "approvalStatus", message: "Only an approved draft can be published." },
      ]);
    }
    const completeness = evaluateProgrammeCompleteness({
      lenderId: existing.lenderId,
      productId: existing.productId,
      productCode: existing.productCode,
      productVariantCode: existing.productVariantCode,
      code: existing.code,
      label: existing.label,
      description: existing.description,
      applicantTypes: existing.applicantTypes ?? [],
      employmentTypes: (existing.employmentTypes ?? []) as never,
      employmentFamily: deriveEmploymentFamily((existing.employmentTypes ?? []) as never),
      legalConstitutions: (existing.legalConstitutions ?? []) as never,
      residencyEligibility: (existing.residencyEligibility ?? []) as never,
      customerSegments: existing.customerSegments ?? [],
      propertyTypes: existing.propertyTypes ?? [],
      transactionTypes: existing.transactionTypes ?? [],
      geographyStates: existing.eligibleStates ?? [],
      geographyCities: existing.eligibleCities ?? [],
      minCibil: existing.minCibil ?? null,
      maxCibil: existing.maxCibil ?? null,
      minAge: existing.minAge ?? null,
      maxAge: existing.maxAge ?? null,
      incomeAssessmentMethods: existing.incomeAssessmentMethods ?? [],
      minTenureMonths: existing.minTenureMonths ?? null,
      maxTenureMonths: existing.maxTenureMonths ?? null,
      minLoanAmountExact: existing.minLoanAmountExact ?? null,
      maxLoanAmountExact: existing.maxLoanAmountExact ?? null,
      minIncomeExact: existing.minIncomeExact ?? null,
      maxIncomeExact: existing.maxIncomeExact ?? null,
      processingFeeAmountExact: existing.processingFeeAmountExact ?? null,
      minRoiExact: existing.minRoiExact ?? null,
      maxRoiExact: existing.maxRoiExact ?? null,
      processingFeePctExact: existing.processingFeePctExact ?? null,
      minLtvExact: existing.minLtvExact ?? null,
      maxLtvExact: existing.maxLtvExact ?? null,
      minFoirExact: existing.minFoirExact ?? null,
      maxFoirExact: existing.maxFoirExact ?? null,
      minDbrExact: existing.minDbrExact ?? null,
      maxDbrExact: existing.maxDbrExact ?? null,
      spreadExact: existing.spreadExact ?? null,
      rateType: existing.rateType ?? null,
      benchmarkCode: existing.benchmarkCode ?? null,
      processingFeeLabel: existing.processingFeeLabel ?? null,
      concessions: existing.concessions ?? [],
      deviationCategories: existing.deviationCategories ?? [],
      policyVersionId: existing.policyVersionId ?? null,
      creditRiskPolicyRef: existing.creditRiskPolicyRef ?? null,
      requiredDocumentTypeIds: existing.requiredDocumentTypeIds ?? [],
      requiredDocuments: existing.requiredDocuments ?? [],
      averageTatDays: existing.averageTatDays ?? null,
      effectiveFrom: existing.effectiveFrom ?? null,
      reviewAt: existing.reviewAt ?? null,
      effectiveUntil: existing.effectiveUntil ?? null,
      notes: existing.notes ?? null,
      remarks: existing.remarks ?? null,
    });
    if (!completeness.complete) {
      throw new ProgrammeValidationError("Programme is not complete enough to publish", completeness.errors);
    }
    const updated = await lenderRegistryRepository.publishApprovedProgram(input.programId, input.actorUserId);
    await lenderRegistryRepository.recordProgramAudit({
      organizationId: input.organizationId,
      programId: updated.id,
      lineageId: updated.lineageId ?? existing.id,
      action: "published",
      previousValue: existing,
      newValue: updated,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      reason: "published",
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
