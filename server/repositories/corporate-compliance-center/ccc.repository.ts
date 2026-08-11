/**
 * CO-CCC-001 — Corporate Compliance Center repository (Prisma data access).
 */
import { prisma } from "@server/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { CccDocumentListFilters } from "@/types/corporate-compliance-center";

export const cccRepository = {
  prisma,

  listLegalEntities(organizationId: string) {
    return prisma.cccLegalEntity.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: [{ isPrimary: "desc" }, { legalName: "asc" }],
    });
  },

  findLegalEntity(organizationId: string, id: string) {
    return prisma.cccLegalEntity.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
  },

  createLegalEntity(data: Prisma.CccLegalEntityCreateInput) {
    return prisma.cccLegalEntity.create({ data });
  },

  updateLegalEntity(id: string, data: Prisma.CccLegalEntityUpdateInput) {
    return prisma.cccLegalEntity.update({ where: { id }, data });
  },

  softDeleteLegalEntity(id: string, modifiedBy: string) {
    return prisma.cccLegalEntity.update({
      where: { id },
      data: { isDeleted: true, modifiedBy },
    });
  },

  clearPrimaryLegalEntity(organizationId: string, exceptId?: string) {
    return prisma.cccLegalEntity.updateMany({
      where: {
        organizationId,
        isDeleted: false,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isPrimary: false },
    });
  },

  listDocuments(organizationId: string, filters?: CccDocumentListFilters) {
    return prisma.organizationDocument.findMany({
      where: {
        organizationId,
        status: { not: "archived" },
        ...(filters?.repositoryKey ? { repositoryKey: filters.repositoryKey } : {}),
        ...(filters?.legalEntityId ? { legalEntityId: filters.legalEntityId } : {}),
        ...(filters?.financialYear ? { financialYear: filters.financialYear } : {}),
        ...(filters?.approvalStatus ? { approvalStatus: filters.approvalStatus } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  findDocument(organizationId: string, documentId: string) {
    return prisma.organizationDocument.findFirst({
      where: { id: documentId, organizationId },
    });
  },

  updateDocument(id: string, data: Prisma.OrganizationDocumentUpdateInput) {
    return prisma.organizationDocument.update({ where: { id }, data });
  },

  unsetCurrentFinancialVersion(
    organizationId: string,
    legalEntityId: string,
    documentTypeId: string,
    financialYear: string,
    exceptId: string,
  ) {
    return prisma.organizationDocument.updateMany({
      where: {
        organizationId,
        legalEntityId,
        documentTypeId,
        financialYear,
        isCurrentFinancialVersion: true,
        id: { not: exceptId },
      },
      data: { isCurrentFinancialVersion: false },
    });
  },

  listInstitutions(organizationId: string) {
    return prisma.cccInstitutionProfile.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { name: "asc" },
    });
  },

  findInstitution(organizationId: string, id: string) {
    return prisma.cccInstitutionProfile.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
  },

  createInstitution(data: Prisma.CccInstitutionProfileCreateInput) {
    return prisma.cccInstitutionProfile.create({ data });
  },

  updateInstitution(id: string, data: Prisma.CccInstitutionProfileUpdateInput) {
    return prisma.cccInstitutionProfile.update({ where: { id }, data });
  },

  softDeleteInstitution(id: string, modifiedBy: string) {
    return prisma.cccInstitutionProfile.update({
      where: { id },
      data: { isDeleted: true, modifiedBy },
    });
  },

  listRequirements(organizationId: string, institutionId: string) {
    return prisma.cccInstitutionRequirement.findMany({
      where: { organizationId, institutionId, isDeleted: false },
      orderBy: { documentTypeLabel: "asc" },
    });
  },

  findRequirement(organizationId: string, id: string) {
    return prisma.cccInstitutionRequirement.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
  },

  createRequirement(data: Prisma.CccInstitutionRequirementCreateInput) {
    return prisma.cccInstitutionRequirement.create({ data });
  },

  updateRequirement(id: string, data: Prisma.CccInstitutionRequirementUpdateInput) {
    return prisma.cccInstitutionRequirement.update({ where: { id }, data });
  },

  softDeleteRequirement(id: string, modifiedBy: string) {
    return prisma.cccInstitutionRequirement.update({
      where: { id },
      data: { isDeleted: true, modifiedBy },
    });
  },

  listPackageDefinitions(organizationId: string) {
    return prisma.cccDocumentPackageDefinition.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { name: "asc" },
    });
  },

  findPackageDefinition(organizationId: string, id: string) {
    return prisma.cccDocumentPackageDefinition.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
  },

  createPackageDefinition(data: Prisma.CccDocumentPackageDefinitionCreateInput) {
    return prisma.cccDocumentPackageDefinition.create({ data });
  },

  updatePackageDefinition(id: string, data: Prisma.CccDocumentPackageDefinitionUpdateInput) {
    return prisma.cccDocumentPackageDefinition.update({ where: { id }, data });
  },

  softDeletePackageDefinition(id: string, modifiedBy: string) {
    return prisma.cccDocumentPackageDefinition.update({
      where: { id },
      data: { isDeleted: true, modifiedBy },
    });
  },

  listPackageInstances(organizationId: string) {
    return prisma.cccDocumentPackageInstance.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    });
  },

  findPackageInstance(organizationId: string, id: string) {
    return prisma.cccDocumentPackageInstance.findFirst({
      where: { id, organizationId },
    });
  },

  createPackageInstance(data: Prisma.CccDocumentPackageInstanceCreateInput) {
    return prisma.cccDocumentPackageInstance.create({ data });
  },

  updatePackageInstance(id: string, data: Prisma.CccDocumentPackageInstanceUpdateInput) {
    return prisma.cccDocumentPackageInstance.update({ where: { id }, data });
  },

  findLatestApprovedDocument(
    organizationId: string,
    documentTypeId: string,
    legalEntityId?: string | null,
    repositoryKey?: string | null,
  ) {
    return prisma.organizationDocument.findFirst({
      where: {
        organizationId,
        documentTypeId,
        approvalStatus: "approved",
        status: { not: "archived" },
        ...(legalEntityId ? { legalEntityId } : {}),
        ...(repositoryKey ? { repositoryKey } : {}),
      },
      orderBy: [{ isCurrentFinancialVersion: "desc" }, { versionNumber: "desc" }, { updatedAt: "desc" }],
    });
  },

  listDispatches(organizationId: string) {
    return prisma.cccDispatch.findMany({
      where: { organizationId },
      include: { items: true },
      orderBy: { updatedAt: "desc" },
    });
  },

  findDispatch(organizationId: string, id: string) {
    return prisma.cccDispatch.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
  },

  createDispatch(data: Prisma.CccDispatchCreateInput) {
    return prisma.cccDispatch.create({ data, include: { items: true } });
  },

  updateDispatch(id: string, data: Prisma.CccDispatchUpdateInput) {
    return prisma.cccDispatch.update({ where: { id }, data, include: { items: true } });
  },

  findOrganizationProfile(organizationId: string) {
    return prisma.organizationWorkspaceProfile.findUnique({ where: { organizationId } });
  },

  findOrganization(organizationId: string) {
    return prisma.organization.findUnique({ where: { id: organizationId } });
  },

  listDocumentsExpiringBefore(organizationId: string, before: Date) {
    return prisma.organizationDocument.findMany({
      where: {
        organizationId,
        expiryDate: { lte: before, not: null },
        approvalStatus: { not: "superseded" },
        status: { not: "archived" },
      },
    });
  },

  listDocumentsPendingApproval(organizationId: string) {
    return prisma.organizationDocument.findMany({
      where: {
        organizationId,
        approvalStatus: { in: ["draft", "pending"] },
        status: { not: "archived" },
      },
    });
  },

  listPendingDispatches(organizationId: string) {
    return prisma.cccDispatch.findMany({
      where: {
        organizationId,
        status: { in: ["draft", "previewed", "queued"] },
      },
    });
  },
};
