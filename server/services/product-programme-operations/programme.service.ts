import { lenderRegistryRepository } from "@server/repositories/lender-registry/lender-registry.repository";
import {
  assertAdditionalFiltersAgainstProgramme,
  assertRecordAdditionalFilters,
  parseStructuredProgrammePayload,
} from "@/lib/product-programme-operations/request-schema";
import { assertFilterFieldsAreModuleScoped } from "@/lib/product-programme-operations/additional-eligibility-filters/module-fields";
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
  type StructuredProgrammePayload,
} from "@/types/product-programme-operations";
import { evaluateProgrammeCompleteness } from "@/lib/product-programme-operations/completeness";
import { deriveEmploymentFamily } from "@/lib/product-programme-operations/employment";
import { durablePolicyRepository } from "@server/repositories/credit-risk-policy/durable-policy.repository";
import {
  LENDER_CATEGORY_PUBLICATION_REQUIRED,
  publicationLenderCategoryDecision,
} from "@/lib/home-loan-recommendation/lender-category-governance";
import { readPublicationLenderCategory } from "@server/services/home-loan-recommendation/hl-recommendation-masters.service";
import {
  CANONICAL_PRODUCT_CODE_PUBLICATION_REQUIRED,
  canonicalProductPublicationDecision,
} from "@/constants/enterprise-product-master";
import { programmeLifecycleDecision } from "@/lib/enterprise-lender-registry/programme-versioning";

async function assertPublishedPolicyVersion(policyVersionId: string | null, organizationId: string): Promise<void> {
  if (policyVersionId === null) return;
  if (!(await durablePolicyRepository.isPublishedVersion(policyVersionId, organizationId))) {
    throw new ProgrammeValidationError("Published policy version is invalid", [
      { field: "policyVersionId", message: "Select a published policy version from this organization." },
    ]);
  }
}

function assertModuleScopedFilters(payload: { productCode?: string | null; additionalEligibilityFilters?: StructuredProgrammePayload["additionalEligibilityFilters"] }): void {
  const unknownField = assertFilterFieldsAreModuleScoped({
    productCode: payload.productCode,
    filters: payload.additionalEligibilityFilters ?? null,
  });
  if (unknownField) {
    throw new ProgrammeValidationError("Filter field is not available in this product module", [
      { field: unknownField, message: "CONFIGURATION_INVALID" },
    ], "CONFIGURATION_INVALID");
  }
}

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
    await assertPublishedPolicyVersion(payload.policyVersionId, input.organizationId);
    assertAdditionalFiltersAgainstProgramme(payload);
    assertModuleScopedFilters(payload);
    const created = await lenderRegistryRepository.createProgram(
      input.organizationId,
      structuredPayloadToCreateInput(payload, input.actorUserId),
      { actorName: input.actorName, reason: "lender_program_created" },
    );
    if (created.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
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
    if (createDraftRevision) {
      throw new ProgrammeValidationError(
        "Unpublish this programme and edit the same record. A new programme version was not created.",
        [{ field: "createDraftRevision", message: "Unpublish the same programme before editing commercial policy." }],
      );
    }
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
        status: existing.status,
        lifecycleStatus: existing.lifecycleStatus,
        isDeleted: existing.isDeleted,
      },
      false,
    );
    const revisionMetaKeys = new Set([
      "createDraftRevision",
      "expectedLockVersion",
      "expectedVersionNumber",
      "changeReason",
      "createdBy",
      "modifiedBy",
    ]);
    const overlay = Object.fromEntries(
      Object.entries(raw).filter(([key]) => !revisionMetaKeys.has(key)),
    );
    const payload = parseStructuredProgrammePayload({
      lenderId: existing.lenderId,
      code: existing.code,
      label: existing.label,
      ...overlay,
    });
    await assertPublishedPolicyVersion(payload.policyVersionId, input.organizationId);
    assertAdditionalFiltersAgainstProgramme(payload);
    assertModuleScopedFilters(payload);
    const updateInput = {
      ...structuredPayloadToUpdateInput(payload, input.actorUserId),
      expectedVersionNumber:
        typeof raw.expectedVersionNumber === "number" ? raw.expectedVersionNumber : undefined,
      changeReason: typeof raw.changeReason === "string" ? raw.changeReason : "draft_saved",
    };
    return lenderRegistryRepository.updateProgram(input.programId, updateInput);
  },

  async submit(input: {
    organizationId: string;
    actorUserId: string;
    actorRole: string;
    programId: string;
    actorName?: string;
    expectedVersionNumber?: number;
  }) {
    const existing = await lenderRegistryRepository.findProgramById(input.programId);
    if (!existing) throw new Error("Lender program not found.");
    if (existing.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    const decision = programmeLifecycleDecision({
      action: "submit",
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
      createdBy: existing.createdBy,
    });
    if (!decision.ok) throw new ProgrammePermissionError(decision.message);
    assertRecordAdditionalFilters(existing);
    return lenderRegistryRepository.submitProgram(input.programId, input.actorUserId, {
      actorName: input.actorName,
      reason: "submitted_for_approval",
      expectedVersionNumber: input.expectedVersionNumber,
    });
  },

  async approve(input: {
    organizationId: string;
    actorUserId: string;
    actorRole: string;
    programId: string;
    actorName?: string;
    approvalReason?: string;
    expectedVersionNumber?: number;
  }) {
    const existing = await lenderRegistryRepository.findProgramById(input.programId);
    if (!existing) throw new Error("Lender program not found.");
    if (existing.organizationId !== input.organizationId) {
      throw new ProgrammePermissionError("Cross-tenant programme access is forbidden.", "TENANT_FORBIDDEN");
    }
    const decision = programmeLifecycleDecision({
      action: "approve",
      actorRole: input.actorRole,
      actorUserId: input.actorUserId,
      createdBy: existing.createdBy,
      approvalReason: input.approvalReason,
    });
    if (!decision.ok) throw new ProgrammePermissionError(decision.message);
    assertRecordAdditionalFilters(existing);
    return lenderRegistryRepository.approveProgram(
      input.programId,
      input.actorUserId,
      input.approvalReason?.trim() || "approved",
      { actorName: input.actorName, expectedVersionNumber: input.expectedVersionNumber },
    );
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
    assertRecordAdditionalFilters(existing);
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
      propertyCategories: existing.propertyCategories ?? [],
      constructionStatuses: existing.constructionStatuses ?? [],
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
    await assertPublishedPolicyVersion(existing.policyVersionId ?? null, input.organizationId);
    const categoryAssignment = await readPublicationLenderCategory({
      organizationId: input.organizationId,
      lenderId: existing.lenderId,
    });
    const categoryGate = publicationLenderCategoryDecision({
      category: categoryAssignment?.category ?? null,
      lifecycleStatus: categoryAssignment?.lifecycleStatus ?? null,
      isDeleted: categoryAssignment?.isDeleted,
      effectiveFrom: categoryAssignment?.effectiveFrom,
      effectiveUntil: categoryAssignment?.effectiveUntil,
      now: new Date(),
    });
    if (!categoryGate.ok) {
      throw new ProgrammeValidationError(LENDER_CATEGORY_PUBLICATION_REQUIRED, [
        { field: "lenderCategory", message: LENDER_CATEGORY_PUBLICATION_REQUIRED },
      ]);
    }
    const productIdentity = canonicalProductPublicationDecision(existing.productCode);
    if (!productIdentity.ok) {
      throw new ProgrammeValidationError(CANONICAL_PRODUCT_CODE_PUBLICATION_REQUIRED, [
        { field: "productCode", message: CANONICAL_PRODUCT_CODE_PUBLICATION_REQUIRED },
      ]);
    }
    const updated = await lenderRegistryRepository.publishApprovedProgram(
      input.programId,
      input.actorUserId,
      input.actorName,
    );
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
