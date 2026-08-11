/**
 * CO-CCC-001 — Corporate Compliance Center service.
 */
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  isFinancialDocumentType,
  mapOrgDocCategoryToRepositoryKey,
} from "@/constants/corporate-compliance-center";
import type {
  CccBuildPackageInstanceBody,
  CccComplianceDocumentDto,
  CccComplianceIntelligenceDto,
  CccDispatchCreateBody,
  CccDispatchDto,
  CccDocumentListFilters,
  CccDocumentMetadataPatchBody,
  CccDocumentPackageDefinitionCreateBody,
  CccDocumentPackageDefinitionDto,
  CccDocumentPackageDefinitionPatchBody,
  CccDocumentPackageInstanceDto,
  CccInstitutionProfileCreateBody,
  CccInstitutionProfileDto,
  CccInstitutionProfilePatchBody,
  CccInstitutionRequirementCreateBody,
  CccInstitutionRequirementDto,
  CccInstitutionRequirementPatchBody,
  CccLegalEntityCreateBody,
  CccLegalEntityDto,
  CccLegalEntityPatchBody,
  CccPackageItemSpec,
} from "@/types/corporate-compliance-center";
import type { OrganizationWorkspaceActor } from "@/types/enterprise-organization-workspace";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { cccRepository as repo } from "@server/repositories/corporate-compliance-center/ccc.repository";
import type { Prisma } from "@prisma/client";

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export class CccServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "CccServiceError";
  }
}

function guardPrisma() {
  if (!isEnterprisePersistencePrisma()) {
    throw new CccServiceError(
      "Corporate Compliance Center requires ENTERPRISE_PERSISTENCE_MODE=prisma",
      "PERSISTENCE_REQUIRED",
      503,
    );
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function asItemSpecs(value: unknown): CccPackageItemSpec[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is CccPackageItemSpec => {
      return (
        typeof v === "object" &&
        v !== null &&
        typeof (v as CccPackageItemSpec).documentTypeId === "string" &&
        typeof (v as CccPackageItemSpec).required === "boolean"
      );
    })
    .map((v) => ({
      documentTypeId: v.documentTypeId,
      repositoryKey: v.repositoryKey,
      required: v.required,
    }));
}

function mapLegalEntity(
  row: Awaited<ReturnType<typeof repo.listLegalEntities>>[number],
): CccLegalEntityDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    legalName: row.legalName,
    brandName: row.brandName,
    gst: row.gst,
    pan: row.pan,
    cin: row.cin,
    tan: row.tan,
    status: row.status as CccLegalEntityDto["status"],
    isPrimary: row.isPrimary,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapComplianceDocument(
  row: Awaited<ReturnType<typeof repo.listDocuments>>[number],
): CccComplianceDocumentDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    clientRecordId: row.clientRecordId,
    originalFilename: row.originalFilename,
    displayName: row.displayName,
    categoryId: row.categoryId as CccComplianceDocumentDto["categoryId"],
    documentTypeId: row.documentTypeId,
    documentTypeLabel: row.documentTypeLabel,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    status: row.status as CccComplianceDocumentDto["status"],
    versionNumber: row.versionNumber,
    tags: asStringArray(row.tagsJson),
    versions: [],
    uploadedBy: row.uploadedBy,
    uploadedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    hasContent: row.contentBytes != null,
    legalEntityId: row.legalEntityId,
    repositoryKey: row.repositoryKey as CccComplianceDocumentDto["repositoryKey"],
    financialYear: row.financialYear,
    isCurrentFinancialVersion: row.isCurrentFinancialVersion,
    effectiveDate: row.effectiveDate?.toISOString() ?? null,
    expiryDate: row.expiryDate?.toISOString() ?? null,
    approvalStatus: row.approvalStatus as CccComplianceDocumentDto["approvalStatus"],
    confidentiality: row.confidentiality as CccComplianceDocumentDto["confidentiality"],
    supersededByDocumentId: row.supersededByDocumentId,
    linkedPackageIds: asStringArray(row.linkedPackageIdsJson),
  };
}

function mapInstitution(
  row: Awaited<ReturnType<typeof repo.listInstitutions>>[number],
): CccInstitutionProfileDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    institutionType: row.institutionType as CccInstitutionProfileDto["institutionType"],
    contactEmail: row.contactEmail,
    contactName: row.contactName,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapRequirement(
  row: Awaited<ReturnType<typeof repo.listRequirements>>[number],
): CccInstitutionRequirementDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    institutionId: row.institutionId,
    documentTypeId: row.documentTypeId,
    documentTypeLabel: row.documentTypeLabel,
    categoryId: row.categoryId,
    repositoryKey: row.repositoryKey as CccInstitutionRequirementDto["repositoryKey"],
    mandatory: row.mandatory,
    financialYearsRequired: asStringArray(row.financialYearsRequiredJson),
    renewalFrequencyMonths: row.renewalFrequencyMonths,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPackageDefinition(
  row: Awaited<ReturnType<typeof repo.listPackageDefinitions>>[number],
): CccDocumentPackageDefinitionDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    name: row.name,
    description: row.description,
    packageKind: row.packageKind as CccDocumentPackageDefinitionDto["packageKind"],
    itemSpecs: asItemSpecs(row.itemSpecsJson),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPackageInstance(
  row: Awaited<ReturnType<typeof repo.listPackageInstances>>[number],
): CccDocumentPackageInstanceDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    definitionId: row.definitionId,
    legalEntityId: row.legalEntityId,
    name: row.name,
    status: row.status as CccDocumentPackageInstanceDto["status"],
    resolvedDocumentIds: asStringArray(row.resolvedDocumentIdsJson),
    versionNumber: row.versionNumber,
    builtAt: row.builtAt?.toISOString() ?? null,
    builtBy: row.builtBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapDispatch(
  row: NonNullable<Awaited<ReturnType<typeof repo.findDispatch>>>,
): CccDispatchDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    legalEntityId: row.legalEntityId,
    institutionId: row.institutionId,
    packageInstanceId: row.packageInstanceId,
    packageDefinitionId: row.packageDefinitionId,
    recipientEmail: row.recipientEmail,
    recipientName: row.recipientName,
    subject: row.subject,
    bodyPreview: row.bodyPreview,
    status: row.status as CccDispatchDto["status"],
    sentAt: row.sentAt?.toISOString() ?? null,
    sentBy: row.sentBy,
    deliveryStatus: row.deliveryStatus,
    acknowledgementNote: row.acknowledgementNote,
    financialYear: row.financialYear,
    items: row.items.map((item) => ({
      id: item.id,
      organizationDocumentId: item.organizationDocumentId,
      documentVersionNumber: item.documentVersionNumber,
      documentTypeLabel: item.documentTypeLabel,
      originalFilename: item.originalFilename,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function deriveEntityCode(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
  return base || "PRIMARY";
}

function currentFinancialYearLabel(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  const endYear = (startYear + 1) % 100;
  return `FY${startYear}-${String(endYear).padStart(2, "0")}`;
}

export const cccService = {
  async listLegalEntities(): Promise<CccLegalEntityDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const rows = await repo.listLegalEntities(organizationId);
    return rows.map(mapLegalEntity);
  },

  async bootstrapPrimaryEntity(actor: OrganizationWorkspaceActor): Promise<CccLegalEntityDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.listLegalEntities(organizationId);
    if (existing.length > 0) return existing.map(mapLegalEntity);

    const profile = await repo.findOrganizationProfile(organizationId);
    const org = await repo.findOrganization(organizationId);
    const legalName = profile?.legalEntityName ?? profile?.companyName ?? org?.name ?? "Organization";
    const brandName = profile?.brandName ?? org?.name ?? legalName;

    const row = await repo.createLegalEntity({
      organization: { connect: { id: organizationId } },
      code: deriveEntityCode(legalName),
      legalName,
      brandName,
      gst: profile?.gst || null,
      pan: profile?.pan || null,
      cin: profile?.cin || null,
      status: "active",
      isPrimary: true,
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });

    return [mapLegalEntity(row)];
  },

  async createLegalEntity(
    body: CccLegalEntityCreateBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<CccLegalEntityDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    if (body.isPrimary) {
      await repo.clearPrimaryLegalEntity(organizationId);
    }
    const row = await repo.createLegalEntity({
      organization: { connect: { id: organizationId } },
      code: body.code,
      legalName: body.legalName,
      brandName: body.brandName ?? null,
      gst: body.gst ?? null,
      pan: body.pan ?? null,
      cin: body.cin ?? null,
      tan: body.tan ?? null,
      status: body.status ?? "active",
      isPrimary: body.isPrimary ?? false,
      notes: body.notes ?? null,
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    return mapLegalEntity(row);
  },

  async patchLegalEntity(
    id: string,
    patch: CccLegalEntityPatchBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<CccLegalEntityDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findLegalEntity(organizationId, id);
    if (!existing) throw new CccServiceError("Legal entity not found", "ENTITY_NOT_FOUND", 404);
    if (patch.isPrimary) {
      await repo.clearPrimaryLegalEntity(organizationId, id);
    }
    const row = await repo.updateLegalEntity(id, {
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.legalName !== undefined ? { legalName: patch.legalName } : {}),
      ...(patch.brandName !== undefined ? { brandName: patch.brandName } : {}),
      ...(patch.gst !== undefined ? { gst: patch.gst } : {}),
      ...(patch.pan !== undefined ? { pan: patch.pan } : {}),
      ...(patch.cin !== undefined ? { cin: patch.cin } : {}),
      ...(patch.tan !== undefined ? { tan: patch.tan } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.isPrimary !== undefined ? { isPrimary: patch.isPrimary } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      modifiedBy: actor.userId,
    });
    return mapLegalEntity(row);
  },

  async deleteLegalEntity(id: string, actor: OrganizationWorkspaceActor): Promise<void> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findLegalEntity(organizationId, id);
    if (!existing) throw new CccServiceError("Legal entity not found", "ENTITY_NOT_FOUND", 404);
    await repo.softDeleteLegalEntity(id, actor.userId);
  },

  async listDocuments(filters?: CccDocumentListFilters): Promise<CccComplianceDocumentDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const rows = await repo.listDocuments(organizationId, filters);
    return rows.map(mapComplianceDocument);
  },

  async patchDocumentMetadata(
    documentId: string,
    patch: CccDocumentMetadataPatchBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<CccComplianceDocumentDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findDocument(organizationId, documentId);
    if (!existing) throw new CccServiceError("Document not found", "DOCUMENT_NOT_FOUND", 404);

    if (patch.isCurrentFinancialVersion && (patch.financialYear ?? existing.financialYear) && (patch.legalEntityId ?? existing.legalEntityId)) {
      await repo.unsetCurrentFinancialVersion(
        organizationId,
        patch.legalEntityId ?? existing.legalEntityId!,
        existing.documentTypeId,
        patch.financialYear ?? existing.financialYear!,
        documentId,
      );
    }

    const row = await repo.updateDocument(documentId, {
      ...(patch.legalEntityId !== undefined
        ? patch.legalEntityId
          ? { legalEntity: { connect: { id: patch.legalEntityId } } }
          : { legalEntity: { disconnect: true } }
        : {}),
      ...(patch.repositoryKey !== undefined ? { repositoryKey: patch.repositoryKey } : {}),
      ...(patch.financialYear !== undefined ? { financialYear: patch.financialYear } : {}),
      ...(patch.isCurrentFinancialVersion !== undefined
        ? { isCurrentFinancialVersion: patch.isCurrentFinancialVersion }
        : {}),
      ...(patch.effectiveDate !== undefined
        ? { effectiveDate: patch.effectiveDate ? new Date(patch.effectiveDate) : null }
        : {}),
      ...(patch.expiryDate !== undefined
        ? { expiryDate: patch.expiryDate ? new Date(patch.expiryDate) : null }
        : {}),
      ...(patch.approvalStatus !== undefined ? { approvalStatus: patch.approvalStatus } : {}),
      ...(patch.confidentiality !== undefined ? { confidentiality: patch.confidentiality } : {}),
      ...(patch.supersededByDocumentId !== undefined
        ? {
            supersededByDocumentId: patch.supersededByDocumentId,
            approvalStatus: patch.approvalStatus ?? "superseded",
          }
        : {}),
      modifiedBy: actor.userId,
    });

    if (patch.isCurrentFinancialVersion && row.financialYear && row.legalEntityId) {
      await repo.unsetCurrentFinancialVersion(
        organizationId,
        row.legalEntityId,
        row.documentTypeId,
        row.financialYear,
        documentId,
      );
      const refreshed = await repo.findDocument(organizationId, documentId);
      return mapComplianceDocument(refreshed!);
    }

    return mapComplianceDocument(row);
  },

  async listInstitutions(): Promise<CccInstitutionProfileDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    return (await repo.listInstitutions(organizationId)).map(mapInstitution);
  },

  async createInstitution(
    body: CccInstitutionProfileCreateBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<CccInstitutionProfileDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const row = await repo.createInstitution({
      organization: { connect: { id: organizationId } },
      name: body.name,
      institutionType: body.institutionType,
      contactEmail: body.contactEmail ?? null,
      contactName: body.contactName ?? null,
      notes: body.notes ?? null,
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    return mapInstitution(row);
  },

  async patchInstitution(
    id: string,
    patch: CccInstitutionProfilePatchBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<CccInstitutionProfileDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findInstitution(organizationId, id);
    if (!existing) throw new CccServiceError("Institution not found", "INSTITUTION_NOT_FOUND", 404);
    const row = await repo.updateInstitution(id, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.institutionType !== undefined ? { institutionType: patch.institutionType } : {}),
      ...(patch.contactEmail !== undefined ? { contactEmail: patch.contactEmail } : {}),
      ...(patch.contactName !== undefined ? { contactName: patch.contactName } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      modifiedBy: actor.userId,
    });
    return mapInstitution(row);
  },

  async deleteInstitution(id: string, actor: OrganizationWorkspaceActor): Promise<void> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findInstitution(organizationId, id);
    if (!existing) throw new CccServiceError("Institution not found", "INSTITUTION_NOT_FOUND", 404);
    await repo.softDeleteInstitution(id, actor.userId);
  },

  async listRequirements(institutionId: string): Promise<CccInstitutionRequirementDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const institution = await repo.findInstitution(organizationId, institutionId);
    if (!institution) throw new CccServiceError("Institution not found", "INSTITUTION_NOT_FOUND", 404);
    return (await repo.listRequirements(organizationId, institutionId)).map(mapRequirement);
  },

  async createRequirement(
    institutionId: string,
    body: CccInstitutionRequirementCreateBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<CccInstitutionRequirementDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const institution = await repo.findInstitution(organizationId, institutionId);
    if (!institution) throw new CccServiceError("Institution not found", "INSTITUTION_NOT_FOUND", 404);
    const row = await repo.createRequirement({
      organization: { connect: { id: organizationId } },
      institution: { connect: { id: institutionId } },
      documentTypeId: body.documentTypeId,
      documentTypeLabel: body.documentTypeLabel,
      categoryId: body.categoryId ?? null,
      repositoryKey: body.repositoryKey ?? null,
      mandatory: body.mandatory ?? true,
      financialYearsRequiredJson: asInputJson(body.financialYearsRequired ?? []),
      renewalFrequencyMonths: body.renewalFrequencyMonths ?? null,
      notes: body.notes ?? null,
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    return mapRequirement(row);
  },

  async patchRequirement(
    id: string,
    patch: CccInstitutionRequirementPatchBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<CccInstitutionRequirementDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findRequirement(organizationId, id);
    if (!existing) throw new CccServiceError("Requirement not found", "REQUIREMENT_NOT_FOUND", 404);
    const row = await repo.updateRequirement(id, {
      ...(patch.documentTypeId !== undefined ? { documentTypeId: patch.documentTypeId } : {}),
      ...(patch.documentTypeLabel !== undefined ? { documentTypeLabel: patch.documentTypeLabel } : {}),
      ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
      ...(patch.repositoryKey !== undefined ? { repositoryKey: patch.repositoryKey } : {}),
      ...(patch.mandatory !== undefined ? { mandatory: patch.mandatory } : {}),
      ...(patch.financialYearsRequired !== undefined
        ? { financialYearsRequiredJson: asInputJson(patch.financialYearsRequired) }
        : {}),
      ...(patch.renewalFrequencyMonths !== undefined
        ? { renewalFrequencyMonths: patch.renewalFrequencyMonths }
        : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      modifiedBy: actor.userId,
    });
    return mapRequirement(row);
  },

  async deleteRequirement(id: string, actor: OrganizationWorkspaceActor): Promise<void> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findRequirement(organizationId, id);
    if (!existing) throw new CccServiceError("Requirement not found", "REQUIREMENT_NOT_FOUND", 404);
    await repo.softDeleteRequirement(id, actor.userId);
  },

  async listPackageDefinitions(): Promise<CccDocumentPackageDefinitionDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    return (await repo.listPackageDefinitions(organizationId)).map(mapPackageDefinition);
  },

  async createPackageDefinition(
    body: CccDocumentPackageDefinitionCreateBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<CccDocumentPackageDefinitionDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const row = await repo.createPackageDefinition({
      organization: { connect: { id: organizationId } },
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      packageKind: body.packageKind,
      itemSpecsJson: asInputJson(body.itemSpecs),
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });
    return mapPackageDefinition(row);
  },

  async patchPackageDefinition(
    id: string,
    patch: CccDocumentPackageDefinitionPatchBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<CccDocumentPackageDefinitionDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findPackageDefinition(organizationId, id);
    if (!existing) throw new CccServiceError("Package definition not found", "PACKAGE_NOT_FOUND", 404);
    const row = await repo.updatePackageDefinition(id, {
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.packageKind !== undefined ? { packageKind: patch.packageKind } : {}),
      ...(patch.itemSpecs !== undefined ? { itemSpecsJson: asInputJson(patch.itemSpecs) } : {}),
      modifiedBy: actor.userId,
    });
    return mapPackageDefinition(row);
  },

  async deletePackageDefinition(id: string, actor: OrganizationWorkspaceActor): Promise<void> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findPackageDefinition(organizationId, id);
    if (!existing) throw new CccServiceError("Package definition not found", "PACKAGE_NOT_FOUND", 404);
    await repo.softDeletePackageDefinition(id, actor.userId);
  },

  async buildPackageInstance(
    definitionId: string,
    body: CccBuildPackageInstanceBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<CccDocumentPackageInstanceDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const definition = await repo.findPackageDefinition(organizationId, definitionId);
    if (!definition) throw new CccServiceError("Package definition not found", "PACKAGE_NOT_FOUND", 404);

    const itemSpecs = asItemSpecs(definition.itemSpecsJson);
    const resolvedIds: string[] = [];

    for (const spec of itemSpecs) {
      const doc = await repo.findLatestApprovedDocument(
        organizationId,
        spec.documentTypeId,
        body.legalEntityId,
        spec.repositoryKey ?? null,
      );
      if (doc) {
        resolvedIds.push(doc.id);
      } else if (spec.required) {
        throw new CccServiceError(
          `Missing approved document for type ${spec.documentTypeId}`,
          "PACKAGE_BUILD_INCOMPLETE",
          422,
        );
      }
    }

    const row = await repo.createPackageInstance({
      organization: { connect: { id: organizationId } },
      definition: { connect: { id: definitionId } },
      ...(body.legalEntityId ? { legalEntity: { connect: { id: body.legalEntityId } } } : {}),
      name: body.name ?? `${definition.name} — ${new Date().toISOString().slice(0, 10)}`,
      status: resolvedIds.length > 0 ? "ready" : "draft",
      resolvedDocumentIdsJson: asInputJson(resolvedIds),
      versionNumber: 1,
      builtAt: new Date(),
      builtBy: actor.displayName ?? actor.userId,
      createdBy: actor.userId,
      modifiedBy: actor.userId,
    });

    return mapPackageInstance(row);
  },

  async listPackageInstances(): Promise<CccDocumentPackageInstanceDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    return (await repo.listPackageInstances(organizationId)).map(mapPackageInstance);
  },

  async getPackageInstance(id: string): Promise<CccDocumentPackageInstanceDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const row = await repo.findPackageInstance(organizationId, id);
    if (!row) throw new CccServiceError("Package instance not found", "INSTANCE_NOT_FOUND", 404);
    return mapPackageInstance(row);
  },

  async listDispatches(): Promise<CccDispatchDto[]> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const rows = await repo.listDispatches(organizationId);
    return rows.map(mapDispatch);
  },

  async getDispatch(id: string): Promise<CccDispatchDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const row = await repo.findDispatch(organizationId, id);
    if (!row) throw new CccServiceError("Dispatch not found", "DISPATCH_NOT_FOUND", 404);
    return mapDispatch(row);
  },

  async createDispatch(
    body: CccDispatchCreateBody,
    actor: OrganizationWorkspaceActor,
  ): Promise<CccDispatchDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();

    const itemsCreate: Prisma.CccDispatchItemCreateWithoutDispatchInput[] = [];
    if (body.packageInstanceId) {
      const instance = await repo.findPackageInstance(organizationId, body.packageInstanceId);
      if (!instance) throw new CccServiceError("Package instance not found", "INSTANCE_NOT_FOUND", 404);
      for (const docId of asStringArray(instance.resolvedDocumentIdsJson)) {
        const doc = await repo.findDocument(organizationId, docId);
        if (doc) {
          itemsCreate.push({
            organizationDocument: { connect: { id: doc.id } },
            documentVersionNumber: doc.versionNumber,
            documentTypeLabel: doc.documentTypeLabel,
            originalFilename: doc.originalFilename,
          });
        }
      }
    }

    const row = await repo.createDispatch({
      organization: { connect: { id: organizationId } },
      ...(body.legalEntityId ? { legalEntity: { connect: { id: body.legalEntityId } } } : {}),
      ...(body.institutionId ? { institution: { connect: { id: body.institutionId } } } : {}),
      ...(body.packageInstanceId
        ? { packageInstance: { connect: { id: body.packageInstanceId } } }
        : {}),
      ...(body.packageDefinitionId
        ? { packageDefinition: { connect: { id: body.packageDefinitionId } } }
        : {}),
      recipientEmail: body.recipientEmail,
      recipientName: body.recipientName ?? null,
      subject: body.subject ?? null,
      bodyPreview: body.bodyPreview ?? null,
      financialYear: body.financialYear ?? null,
      status: "draft",
      createdBy: actor.userId,
      modifiedBy: actor.userId,
      items: itemsCreate.length > 0 ? { create: itemsCreate } : undefined,
    });

    return mapDispatch(row);
  },

  async sendDispatch(id: string, actor: OrganizationWorkspaceActor): Promise<CccDispatchDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const existing = await repo.findDispatch(organizationId, id);
    if (!existing) throw new CccServiceError("Dispatch not found", "DISPATCH_NOT_FOUND", 404);

    const row = await repo.updateDispatch(id, {
      status: "sent",
      sentAt: new Date(),
      sentBy: actor.displayName ?? actor.userId,
      deliveryStatus: "simulated_sent",
      modifiedBy: actor.userId,
    });

    if (existing.packageInstanceId) {
      await repo.updatePackageInstance(existing.packageInstanceId, {
        status: "dispatched",
        modifiedBy: actor.userId,
      });
    }

    return mapDispatch(row);
  },

  async deriveComplianceIntelligence(): Promise<CccComplianceIntelligenceDto> {
    guardPrisma();
    const organizationId = await resolvePilotOrganizationId();
    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    const expiring = await repo.listDocumentsExpiringBefore(organizationId, in30Days);
    const expired = expiring.filter((d) => d.expiryDate && d.expiryDate < now);
    const expiringSoon = expiring.filter((d) => d.expiryDate && d.expiryDate >= now);

    const pendingApproval = await repo.listDocumentsPendingApproval(organizationId);
    const pendingDispatches = await repo.listPendingDispatches(organizationId);

    const currentFy = currentFinancialYearLabel();
    const financialDocs = await repo.listDocuments(organizationId, { repositoryKey: "financial" });
    const hasCurrentFy = financialDocs.some(
      (d) =>
        d.financialYear === currentFy &&
        d.approvalStatus === "approved" &&
        isFinancialDocumentType(d.documentTypeId),
    );

    const alerts: CccComplianceIntelligenceDto["alerts"] = [];

    for (const doc of expired) {
      alerts.push({
        id: `expired-${doc.id}`,
        severity: "critical",
        category: "expired",
        title: `${doc.documentTypeLabel} expired`,
        description: `${doc.originalFilename} expired on ${doc.expiryDate!.toISOString().slice(0, 10)}`,
        documentId: doc.id,
        dueDate: doc.expiryDate!.toISOString(),
      });
    }

    for (const doc of expiringSoon) {
      alerts.push({
        id: `expiring-${doc.id}`,
        severity: "warning",
        category: "expiring",
        title: `${doc.documentTypeLabel} expiring soon`,
        description: `${doc.originalFilename} expires on ${doc.expiryDate!.toISOString().slice(0, 10)}`,
        documentId: doc.id,
        dueDate: doc.expiryDate!.toISOString(),
      });
    }

    if (!hasCurrentFy) {
      alerts.push({
        id: `missing-fy-${currentFy}`,
        severity: "warning",
        category: "missing_fy",
        title: `Missing approved financial statements for ${currentFy}`,
        description: "Upload and approve current-year financial documents in the Financial Repository.",
      });
    }

    for (const doc of pendingApproval) {
      alerts.push({
        id: `pending-approval-${doc.id}`,
        severity: "info",
        category: "pending_approval",
        title: `${doc.documentTypeLabel} pending approval`,
        description: `${doc.originalFilename} is ${doc.approvalStatus}`,
        documentId: doc.id,
      });
    }

    for (const dispatch of pendingDispatches) {
      alerts.push({
        id: `pending-dispatch-${dispatch.id}`,
        severity: "info",
        category: "pending_dispatch",
        title: `Dispatch pending: ${dispatch.recipientEmail}`,
        description: `Dispatch status is ${dispatch.status}`,
        entityId: dispatch.id,
      });
    }

    return {
      alerts,
      summary: {
        expiringCount: expiringSoon.length,
        expiredCount: expired.length,
        missingFyCount: hasCurrentFy ? 0 : 1,
        pendingApprovalCount: pendingApproval.length,
        pendingDispatchCount: pendingDispatches.length,
      },
      generatedAt: now.toISOString(),
    };
  },
};

/** Shared mapper for organization workspace mapDocument extension. */
export function mapOrganizationDocumentCccFields(
  row: Awaited<ReturnType<typeof repo.findDocument>>,
): Pick<
  CccComplianceDocumentDto,
  | "legalEntityId"
  | "repositoryKey"
  | "financialYear"
  | "isCurrentFinancialVersion"
  | "effectiveDate"
  | "expiryDate"
  | "approvalStatus"
  | "confidentiality"
  | "supersededByDocumentId"
  | "linkedPackageIds"
> {
  if (!row) {
    return {
      legalEntityId: null,
      repositoryKey: null,
      financialYear: null,
      isCurrentFinancialVersion: false,
      effectiveDate: null,
      expiryDate: null,
      approvalStatus: "draft",
      confidentiality: "internal",
      supersededByDocumentId: null,
      linkedPackageIds: [],
    };
  }
  return {
    legalEntityId: row.legalEntityId,
    repositoryKey: row.repositoryKey as CccComplianceDocumentDto["repositoryKey"],
    financialYear: row.financialYear,
    isCurrentFinancialVersion: row.isCurrentFinancialVersion,
    effectiveDate: row.effectiveDate?.toISOString() ?? null,
    expiryDate: row.expiryDate?.toISOString() ?? null,
    approvalStatus: row.approvalStatus as CccComplianceDocumentDto["approvalStatus"],
    confidentiality: row.confidentiality as CccComplianceDocumentDto["confidentiality"],
    supersededByDocumentId: row.supersededByDocumentId,
    linkedPackageIds: asStringArray(row.linkedPackageIdsJson),
  };
}

export { mapOrgDocCategoryToRepositoryKey, isFinancialDocumentType };
