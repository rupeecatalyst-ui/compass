import type { RegistryStatus } from "@prisma/client";
import type {
  CreateDocumentDefinitionInput,
  CreateDocumentTypeInput,
  DocumentDefinitionQuery,
  DocumentRegistryListQuery,
  UpdateDocumentDefinitionInput,
  UpdateDocumentTypeInput,
} from "@/types/enterprise-document-registry";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { documentRegistryRepository } from "@server/repositories/document-registry/document-registry.repository";
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

export class DocumentRegistryService {
  async queryTypes(query: DocumentRegistryListQuery) {
    const organizationId = await resolvePilotOrganizationId();
    return documentRegistryRepository.queryTypes(organizationId, query);
  }

  async getTypeById(id: string) {
    return documentRegistryRepository.findTypeById(id);
  }

  async createType(input: CreateDocumentTypeInput, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const duplicate = await documentRegistryRepository.findTypeByCode(
      organizationId,
      input.code,
    );
    if (duplicate) {
      throw new Error(`Document type "${input.code}" already exists.`);
    }

    const created = await documentRegistryRepository.createType(organizationId, input);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "document",
      entityId: created.id,
      entityCode: created.code,
      action: "created",
      newValue: auditSnapshot(created),
      actorUserId: input.createdBy,
      actorName,
    });
    return created;
  }

  async updateType(id: string, input: UpdateDocumentTypeInput, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await documentRegistryRepository.findTypeById(id);
    if (!existing) throw new Error("Document type not found.");

    const updated = await documentRegistryRepository.updateType(id, input);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "document",
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

  async activateType(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await documentRegistryRepository.findTypeById(id);
    if (!existing) throw new Error("Document type not found.");

    const updated = await documentRegistryRepository.setTypeStatus(
      id,
      "active",
      actorId,
      true,
    );
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "document",
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

  async deactivateType(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await documentRegistryRepository.findTypeById(id);
    if (!existing) throw new Error("Document type not found.");

    const updated = await documentRegistryRepository.setTypeStatus(
      id,
      "inactive",
      actorId,
      false,
    );
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "document",
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

  async softDeleteType(id: string, actorId: string, reason?: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await documentRegistryRepository.findTypeById(id);
    if (!existing) throw new Error("Document type not found.");

    const updated = await documentRegistryRepository.softDeleteType(id, actorId, reason);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "document",
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

  async queryDefinitions(query: DocumentDefinitionQuery) {
    const organizationId = await resolvePilotOrganizationId();
    return documentRegistryRepository.queryDefinitions(organizationId, query);
  }

  async getDefinitionById(id: string) {
    return documentRegistryRepository.findDefinitionById(id);
  }

  async createDefinition(input: CreateDocumentDefinitionInput, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const type = await documentRegistryRepository.findTypeById(input.typeId);
    if (!type || type.organizationId !== organizationId) {
      throw new Error("Document type not found.");
    }

    const duplicate = await documentRegistryRepository.findDefinitionByCode(
      organizationId,
      input.code,
    );
    if (duplicate) throw new Error(`Document definition "${input.code}" already exists.`);

    const created = await documentRegistryRepository.createDefinition(organizationId, input);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "document",
      entityId: created.id,
      entityCode: created.code,
      action: "created",
      newValue: auditSnapshot(created),
      actorUserId: input.createdBy,
      actorName,
    });
    return created;
  }

  async updateDefinition(
    id: string,
    input: UpdateDocumentDefinitionInput,
    actorName?: string,
  ) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await documentRegistryRepository.findDefinitionById(id);
    if (!existing) throw new Error("Document definition not found.");

    if (input.typeId) {
      const type = await documentRegistryRepository.findTypeById(input.typeId);
      if (!type || type.organizationId !== organizationId) {
        throw new Error("Document type not found.");
      }
    }

    const updated = await documentRegistryRepository.updateDefinition(id, input);
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "document",
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

  async activateDefinition(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await documentRegistryRepository.findDefinitionById(id);
    if (!existing) throw new Error("Document definition not found.");

    const updated = await documentRegistryRepository.setDefinitionStatus(
      id,
      "active",
      actorId,
      true,
    );
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "document",
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

  async deactivateDefinition(id: string, actorId: string, actorName?: string) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await documentRegistryRepository.findDefinitionById(id);
    if (!existing) throw new Error("Document definition not found.");

    const updated = await documentRegistryRepository.setDefinitionStatus(
      id,
      "inactive",
      actorId,
      false,
    );
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "document",
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

  async softDeleteDefinition(
    id: string,
    actorId: string,
    reason?: string,
    actorName?: string,
  ) {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await documentRegistryRepository.findDefinitionById(id);
    if (!existing) throw new Error("Document definition not found.");

    const updated = await documentRegistryRepository.softDeleteDefinition(
      id,
      actorId,
      reason,
    );
    await enterpriseRegistryAuditService.recordChange({
      organizationId,
      registryModule: "document",
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
}

export const documentRegistryService = new DocumentRegistryService();
