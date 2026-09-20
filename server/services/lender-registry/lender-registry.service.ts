import type { RegistryStatus } from "@prisma/client";

import type {

  CreateLenderCategoryInput,

  CreateLenderContactInput,

  CreateLenderDocumentInput,

  CreateLenderInput,

  CreateLenderProgramInput,

  LenderProgramQuery,

  LenderQuery,

  LenderRegistryListQuery,

  UpdateLenderCategoryInput,

  UpdateLenderInput,

  UpdateLenderProgramInput,

} from "@/types/enterprise-lender-registry";

import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";

import { lenderContactsDocumentsRepository } from "@server/repositories/lender-registry/lender-contacts-documents.repository";

import { lenderRegistryRepository } from "@server/repositories/lender-registry/lender-registry.repository";
import {
  executeLenderMerge,
  inspectLenderDependencies,
  previewLenderMerge,
} from "@server/repositories/lender-registry/lender-consolidation.repository";

import { productRegistryRepository } from "@server/repositories/product-registry/product-registry.repository";

import { enterpriseRegistryAuditService } from "@server/services/enterprise-registry/audit.service";
import { validateProgramCreditRiskPolicyRef } from "@/lib/enterprise-lender-registry/resolve-program-policy";
import { normalizeProgramLodRequirements } from "@/lib/document-requests/resolve-program-lod";

function normalizeProgramLodInput(input: {
  requiredDocuments?: unknown;
  requiredDocumentTypeIds?: string[] | null;
}): { requiredDocumentTypeIds?: unknown } {
  if (input.requiredDocuments != null) {
    const reqs = normalizeProgramLodRequirements(input.requiredDocuments);
    return { requiredDocumentTypeIds: reqs.length ? reqs : [] };
  }
  if (input.requiredDocumentTypeIds != null) {
    const reqs = normalizeProgramLodRequirements(input.requiredDocumentTypeIds);
    return { requiredDocumentTypeIds: reqs.length ? reqs : input.requiredDocumentTypeIds };
  }
  return {};
}


function auditSnapshot(record: object) {
  const r = record as Record<string, unknown>;
  return {
    id: r.id,
    code: r.code,
    label: r.label,
    status: r.status,
    enabled: r.enabled,
    lifecycleStatus: r.lifecycleStatus ?? null,
    lenderId: r.lenderId ?? null,
    productId: r.productId ?? null,
    productCode: r.productCode ?? null,
    productsSupported: r.productsSupported ?? null,
    roiPercent: r.roiPercent ?? null,
    processingFeePct: r.processingFeePct ?? null,
    maxLtvPercent: r.maxLtvPercent ?? null,
    maxTenureMonths: r.maxTenureMonths ?? null,
    minFundingAmount: r.minFundingAmount ?? null,
    maxFundingAmount: r.maxFundingAmount ?? null,
    minCibil: r.minCibil ?? null,
    minIncomeAmount: r.minIncomeAmount ?? null,
    maxFoirPercent: r.maxFoirPercent ?? null,
    maxDbrPercent: r.maxDbrPercent ?? null,
    minAge: r.minAge ?? null,
    maxAge: r.maxAge ?? null,
    employmentType: r.employmentType ?? null,
    borrowerType: r.borrowerType ?? null,
    creditRiskPolicyRef: r.creditRiskPolicyRef ?? null,
    requiredDocumentTypeIds: r.requiredDocumentTypeIds ?? null,
    requiredDocuments: r.requiredDocuments ?? null,
  };
}



export class LenderRegistryService {

  async queryCategories(query: LenderRegistryListQuery) {

    const organizationId = await resolvePilotOrganizationId();

    return lenderRegistryRepository.queryCategories(organizationId, query);

  }



  async getCategoryById(id: string) {

    return lenderRegistryRepository.findCategoryById(id);

  }



  async createCategory(input: CreateLenderCategoryInput, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const duplicate = await lenderRegistryRepository.findCategoryByCode(

      organizationId,

      input.code,

    );

    if (duplicate) {

      throw new Error(`Lender category "${input.code}" already exists.`);

    }



    const created = await lenderRegistryRepository.createCategory(organizationId, input);

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: created.id,

      entityCode: created.code,

      action: "created",

      newValue: auditSnapshot(created),

      actorUserId: input.createdBy,

      actorName,

    });

    return created;

  }



  async updateCategory(id: string, input: UpdateLenderCategoryInput, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findCategoryById(id);

    if (!existing) throw new Error("Lender category not found.");



    const updated = await lenderRegistryRepository.updateCategory(id, input);

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "updated",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: input.modifiedBy,

      actorName,

    });

    return updated;

  }



  async activateCategory(id: string, actorId: string, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findCategoryById(id);

    if (!existing) throw new Error("Lender category not found.");



    const updated = await lenderRegistryRepository.setCategoryStatus(

      id,

      "active",

      actorId,

      true,

    );

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "activated",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: actorId,

      actorName,

    });

    return updated;

  }



  async deactivateCategory(id: string, actorId: string, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findCategoryById(id);

    if (!existing) throw new Error("Lender category not found.");



    const updated = await lenderRegistryRepository.setCategoryStatus(

      id,

      "inactive",

      actorId,

      false,

    );

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "deactivated",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: actorId,

      actorName,

    });

    return updated;

  }



  async softDeleteCategory(id: string, actorId: string, reason?: string, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findCategoryById(id);

    if (!existing) throw new Error("Lender category not found.");



    const updated = await lenderRegistryRepository.softDeleteCategory(id, actorId, reason);

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "soft_deleted",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: actorId,

      actorName,

      reason,

    });

    return updated;

  }



  async queryLenders(query: LenderQuery) {

    const organizationId = await resolvePilotOrganizationId();

    return lenderRegistryRepository.queryLenders(organizationId, query);

  }

  async previewLenderMerge(sourceId: string, targetId: string) {
    return previewLenderMerge(await resolvePilotOrganizationId(), sourceId, targetId);
  }

  async mergeLenders(input: {
    sourceId: string;
    targetId: string;
    actorUserId: string;
    actorName?: string;
    reason: string;
  }) {
    return executeLenderMerge({
      organizationId: await resolvePilotOrganizationId(),
      ...input,
    });
  }



  async getLenderById(id: string) {
    const organizationId = await resolvePilotOrganizationId();
    const lender = await lenderRegistryRepository.findLenderById(id);
    return lender?.organizationId === organizationId ? lender : null;
  }



  async createLender(input: CreateLenderInput, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const category = await lenderRegistryRepository.findCategoryById(input.categoryId);

    if (!category || category.organizationId !== organizationId) {

      throw new Error("Lender category not found.");

    }



    const duplicate = input.code
      ? await lenderRegistryRepository.findLenderByCode(organizationId, input.code)
      : null;

    if (duplicate) throw new Error(`Lender "${input.code}" already exists.`);

    const normalizeIdentity = (value?: string | null) =>
      (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const proposedNames = new Set(
      [input.label, input.displayName, input.legalName]
        .map(normalizeIdentity)
        .filter(Boolean),
    );
    const existingLenders = await lenderRegistryRepository.queryLenders(organizationId, {
      pageSize: 5000,
      status: "all",
      enabled: "all",
    });
    const likelyDuplicate = existingLenders.items.find((row) => {
      const names = [row.label, row.displayName, row.legalName]
        .map(normalizeIdentity)
        .filter(Boolean);
      return names.some((name) => proposedNames.has(name)) ||
        Boolean(input.rbiRegistrationNumber && row.rbiRegistrationNumber &&
          normalizeIdentity(input.rbiRegistrationNumber) === normalizeIdentity(row.rbiRegistrationNumber));
    });
    if (likelyDuplicate) {
      throw new Error(
        `Possible duplicate lender: ${likelyDuplicate.label} (${likelyDuplicate.code}). Review or merge the existing master before creating another.`,
      );
    }



    const created = await lenderRegistryRepository.createLender(organizationId, input);

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: created.id,

      entityCode: created.code,

      action: "created",

      newValue: auditSnapshot(created),

      actorUserId: input.createdBy,

      actorName,

    });

    return created;

  }



  async updateLender(id: string, input: UpdateLenderInput, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findLenderById(id);

    if (!existing || existing.organizationId !== organizationId) throw new Error("Lender not found.");



    if (input.categoryId) {

      const category = await lenderRegistryRepository.findCategoryById(input.categoryId);

      if (!category || category.organizationId !== organizationId) {

        throw new Error("Lender category not found.");

      }

    }



    const updated = await lenderRegistryRepository.updateLender(id, input);

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "updated",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: input.modifiedBy,

      actorName,

    });

    return updated;

  }



  async activateLender(id: string, actorId: string, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findLenderById(id);

    if (!existing || existing.organizationId !== organizationId) throw new Error("Lender not found.");



    const updated = await lenderRegistryRepository.setLenderStatus(id, "active", actorId, true);

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "activated",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: actorId,

      actorName,

    });

    return updated;

  }



  async deactivateLender(id: string, actorId: string, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findLenderById(id);

    if (!existing || existing.organizationId !== organizationId) throw new Error("Lender not found.");



    const updated = await lenderRegistryRepository.setLenderStatus(

      id,

      "inactive",

      actorId,

      false,

    );

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "deactivated",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: actorId,

      actorName,

    });

    return updated;

  }



  async softDeleteLender(id: string, actorId: string, reason?: string, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findLenderById(id);

    if (!existing || existing.organizationId !== organizationId) throw new Error("Lender not found.");

    const dependencies = await inspectLenderDependencies(organizationId, id);
    const dependencyTotal = Object.values(dependencies).reduce((sum, count) => sum + count, 0);
    if (dependencyTotal > 0) {
      throw new Error(
        `Lender has ${dependencyTotal} durable dependency reference(s). Merge it into a canonical lender instead of deleting it.`,
      );
    }



    const updated = await lenderRegistryRepository.softDeleteLender(id, actorId, reason);

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "soft_deleted",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: actorId,

      actorName,

      reason,

    });

    return updated;

  }



  async queryPrograms(query: LenderProgramQuery) {

    const organizationId = await resolvePilotOrganizationId();

    return lenderRegistryRepository.queryPrograms(organizationId, query);

  }



  async getProgramById(id: string) {
    const organizationId = await resolvePilotOrganizationId();
    const program = await lenderRegistryRepository.findProgramById(id);
    return program?.organizationId === organizationId ? program : null;

  }



  async createProgram(input: CreateLenderProgramInput, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const lender = await lenderRegistryRepository.findLenderById(input.lenderId);

    if (!lender || lender.organizationId !== organizationId) {

      throw new Error("Lender not found.");

    }



    if (input.productId) {

      const product = await productRegistryRepository.findProductById(input.productId);

      if (!product || product.organizationId !== organizationId) {

        throw new Error("Product not found.");

      }

    }



    const duplicate = await lenderRegistryRepository.findProgramByCode(organizationId, input.code);

    if (duplicate) throw new Error(`Lender program "${input.code}" already exists.`);

    const policyCheck = validateProgramCreditRiskPolicyRef(input.creditRiskPolicyRef);
    if (!policyCheck.ok) throw new Error(policyCheck.error);

    const lodNorm = normalizeProgramLodInput(input);
    const created = await lenderRegistryRepository.createProgram(organizationId, {
      ...input,
      ...lodNorm,
      requiredDocumentTypeIds:
        (lodNorm.requiredDocumentTypeIds as never) ?? input.requiredDocumentTypeIds,
    });

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: created.id,

      entityCode: created.code,

      action: "created",

      newValue: auditSnapshot(created),

      actorUserId: input.createdBy,

      actorName,

      reason: "lender_program_created",

    });

    return created;

  }



  async updateProgram(id: string, input: UpdateLenderProgramInput, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findProgramById(id);

    if (!existing) throw new Error("Lender program not found.");



    if (input.lenderId) {

      const lender = await lenderRegistryRepository.findLenderById(input.lenderId);

      if (!lender || lender.organizationId !== organizationId) {

        throw new Error("Lender not found.");

      }

    }



    if (input.productId) {

      const product = await productRegistryRepository.findProductById(input.productId);

      if (!product || product.organizationId !== organizationId) {

        throw new Error("Product not found.");

      }

    }



    if (input.creditRiskPolicyRef !== undefined) {
      const policyCheck = validateProgramCreditRiskPolicyRef(input.creditRiskPolicyRef);
      if (!policyCheck.ok) throw new Error(policyCheck.error);
    }

    const lodNorm = normalizeProgramLodInput(input);
    const updated = await lenderRegistryRepository.updateProgram(id, {
      ...input,
      ...(lodNorm.requiredDocumentTypeIds !== undefined
        ? { requiredDocumentTypeIds: lodNorm.requiredDocumentTypeIds as never }
        : {}),
    });

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "updated",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: input.modifiedBy,

      actorName,

      reason: "lender_program_updated",

    });

    return updated;

  }



  async activateProgram(id: string, actorId: string, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findProgramById(id);

    if (!existing) throw new Error("Lender program not found.");



    const updated = await lenderRegistryRepository.setProgramStatus(id, "active", actorId, true);

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "activated",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: actorId,

      actorName,

    });

    return updated;

  }



  async deactivateProgram(id: string, actorId: string, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findProgramById(id);

    if (!existing) throw new Error("Lender program not found.");



    const updated = await lenderRegistryRepository.setProgramStatus(

      id,

      "inactive",

      actorId,

      false,

    );

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "deactivated",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: actorId,

      actorName,

    });

    return updated;

  }



  async softDeleteProgram(id: string, actorId: string, reason?: string, actorName?: string) {

    const organizationId = await resolvePilotOrganizationId();

    const existing = await lenderRegistryRepository.findProgramById(id);

    if (!existing) throw new Error("Lender program not found.");



    const updated = await lenderRegistryRepository.softDeleteProgram(id, actorId, reason);

    await enterpriseRegistryAuditService.recordChange({

      organizationId,

      registryModule: "lender",

      entityId: updated.id,

      entityCode: updated.code,

      action: "soft_deleted",

      previousValue: auditSnapshot(existing),

      newValue: auditSnapshot(updated),

      actorUserId: actorId,

      actorName,

      reason,

    });

    return updated;

  }

  async listContacts(lenderId: string) {
    const organizationId = await resolvePilotOrganizationId();
    const lender = await lenderRegistryRepository.findLenderById(lenderId);
    if (!lender || lender.isDeleted) throw new Error("Lender not found.");
    return lenderContactsDocumentsRepository.listContacts(organizationId, lenderId);
  }

  async replaceContacts(
    lenderId: string,
    contacts: CreateLenderContactInput[],
    actorId: string,
    actorName?: string,
  ) {
    const organizationId = await resolvePilotOrganizationId();
    const lender = await lenderRegistryRepository.findLenderById(lenderId);
    if (!lender || lender.isDeleted) throw new Error("Lender not found.");

    const previous = await lenderContactsDocumentsRepository.listContacts(
      organizationId,
      lenderId,
    );
    const next = await lenderContactsDocumentsRepository.replaceContacts(
      organizationId,
      lenderId,
      contacts.map((c) => ({ ...c, lenderId, createdBy: c.createdBy || actorId })),
      actorId,
    );

    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "lender",
      entityId: lenderId,
      entityCode: lender.code,
      action: "updated",
      previousValue: { contacts: previous.map((c) => ({ id: c.id, name: c.name, department: c.department })) },
      newValue: { contacts: next.map((c) => ({ id: c.id, name: c.name, department: c.department })) },
      actorUserId: actorId,
      actorName,
      reason: "lender_contacts_replaced",
    });

    return next;
  }

  async listDocuments(lenderId: string) {
    const organizationId = await resolvePilotOrganizationId();
    const lender = await lenderRegistryRepository.findLenderById(lenderId);
    if (!lender || lender.isDeleted) throw new Error("Lender not found.");
    return lenderContactsDocumentsRepository.listDocuments(organizationId, lenderId);
  }

  async replaceDocuments(
    lenderId: string,
    docs: CreateLenderDocumentInput[],
    actorId: string,
    actorName?: string,
  ) {
    const organizationId = await resolvePilotOrganizationId();
    const lender = await lenderRegistryRepository.findLenderById(lenderId);
    if (!lender || lender.isDeleted) throw new Error("Lender not found.");

    const previous = await lenderContactsDocumentsRepository.listDocuments(
      organizationId,
      lenderId,
    );
    const next = await lenderContactsDocumentsRepository.replaceDocuments(
      organizationId,
      lenderId,
      docs.map((d) => ({ ...d, lenderId, createdBy: d.createdBy || actorId })),
      actorId,
    );

    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "lender",
      entityId: lenderId,
      entityCode: lender.code,
      action: "updated",
      previousValue: { documents: previous.map((d) => ({ id: d.id, title: d.title, kind: d.kind })) },
      newValue: { documents: next.map((d) => ({ id: d.id, title: d.title, kind: d.kind })) },
      actorUserId: actorId,
      actorName,
      reason: "lender_documents_replaced",
    });

    return next;
  }

}



export const lenderRegistryService = new LenderRegistryService();


