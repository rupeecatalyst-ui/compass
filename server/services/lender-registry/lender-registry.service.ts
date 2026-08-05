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

import { productRegistryRepository } from "@server/repositories/product-registry/product-registry.repository";

import { enterpriseRegistryAuditService } from "@server/services/enterprise-registry/audit.service";



function auditSnapshot(record: {

  id: string;

  code: string;

  label: string;

  status: RegistryStatus;

  enabled: boolean;

}) {

  return {

    id: record.id,

    code: record.code,

    label: record.label,

    status: record.status,

    enabled: record.enabled,

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



  async getLenderById(id: string) {

    return lenderRegistryRepository.findLenderById(id);

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

    if (!existing) throw new Error("Lender not found.");



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

    if (!existing) throw new Error("Lender not found.");



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

    if (!existing) throw new Error("Lender not found.");



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

    if (!existing) throw new Error("Lender not found.");



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

    return lenderRegistryRepository.findProgramById(id);

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



    const created = await lenderRegistryRepository.createProgram(organizationId, input);

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



    const updated = await lenderRegistryRepository.updateProgram(id, input);

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


