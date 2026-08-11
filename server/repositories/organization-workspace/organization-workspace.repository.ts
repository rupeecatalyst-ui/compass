/**
 * CO-ORG-001 — Organization Workspace repository (Prisma data access).
 */
import { prisma } from "@server/lib/prisma";
import type { Prisma } from "@prisma/client";

export const organizationWorkspaceRepository = {
  prisma,

  findOrganizationById(organizationId: string) {
    return prisma.organization.findUnique({ where: { id: organizationId } });
  },

  findProfile(organizationId: string) {
    return prisma.organizationWorkspaceProfile.findUnique({ where: { organizationId } });
  },

  createProfile(data: Prisma.OrganizationWorkspaceProfileCreateInput) {
    return prisma.organizationWorkspaceProfile.create({ data });
  },

  updateProfile(organizationId: string, data: Prisma.OrganizationWorkspaceProfileUpdateInput) {
    return prisma.organizationWorkspaceProfile.update({ where: { organizationId }, data });
  },

  findSettings(organizationId: string) {
    return prisma.organizationWorkspaceSettings.findUnique({ where: { organizationId } });
  },

  createSettings(data: Prisma.OrganizationWorkspaceSettingsCreateInput) {
    return prisma.organizationWorkspaceSettings.create({ data });
  },

  updateSettings(organizationId: string, data: Prisma.OrganizationWorkspaceSettingsUpdateInput) {
    return prisma.organizationWorkspaceSettings.update({ where: { organizationId }, data });
  },

  findBusinessConfig(organizationId: string) {
    return prisma.organizationBusinessConfig.findUnique({ where: { organizationId } });
  },

  createBusinessConfig(data: Prisma.OrganizationBusinessConfigCreateInput) {
    return prisma.organizationBusinessConfig.create({ data });
  },

  updateBusinessConfig(
    organizationId: string,
    data: Prisma.OrganizationBusinessConfigUpdateInput,
  ) {
    return prisma.organizationBusinessConfig.update({ where: { organizationId }, data });
  },

  findSecurityConfig(organizationId: string) {
    return prisma.organizationSecurityConfig.findUnique({ where: { organizationId } });
  },

  createSecurityConfig(data: Prisma.OrganizationSecurityConfigCreateInput) {
    return prisma.organizationSecurityConfig.create({ data });
  },

  updateSecurityConfig(
    organizationId: string,
    data: Prisma.OrganizationSecurityConfigUpdateInput,
  ) {
    return prisma.organizationSecurityConfig.update({ where: { organizationId }, data });
  },

  listDirectors(organizationId: string) {
    return prisma.organizationDirector.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  findDirector(organizationId: string, directorId: string) {
    return prisma.organizationDirector.findFirst({
      where: { id: directorId, organizationId, isDeleted: false },
    });
  },

  createDirector(data: Prisma.OrganizationDirectorCreateInput) {
    return prisma.organizationDirector.create({ data });
  },

  updateDirector(id: string, data: Prisma.OrganizationDirectorUpdateInput) {
    return prisma.organizationDirector.update({ where: { id }, data });
  },

  softDeleteDirector(id: string, modifiedBy: string) {
    return prisma.organizationDirector.update({
      where: { id },
      data: { isDeleted: true, modifiedBy },
    });
  },

  listBankAccounts(organizationId: string) {
    return prisma.organizationBankAccount.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
  },

  findBankAccount(organizationId: string, accountId: string) {
    return prisma.organizationBankAccount.findFirst({
      where: { id: accountId, organizationId, isDeleted: false },
    });
  },

  createBankAccount(data: Prisma.OrganizationBankAccountCreateInput) {
    return prisma.organizationBankAccount.create({ data });
  },

  updateBankAccount(id: string, data: Prisma.OrganizationBankAccountUpdateInput) {
    return prisma.organizationBankAccount.update({ where: { id }, data });
  },

  softDeleteBankAccount(id: string, modifiedBy: string) {
    return prisma.organizationBankAccount.update({
      where: { id },
      data: { isDeleted: true, modifiedBy },
    });
  },

  listDigitalSignatures(organizationId: string) {
    return prisma.organizationDigitalSignature.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { createdAt: "asc" },
    });
  },

  findDigitalSignature(organizationId: string, signatureId: string) {
    return prisma.organizationDigitalSignature.findFirst({
      where: { id: signatureId, organizationId, isDeleted: false },
    });
  },

  createDigitalSignature(data: Prisma.OrganizationDigitalSignatureCreateInput) {
    return prisma.organizationDigitalSignature.create({ data });
  },

  updateDigitalSignature(id: string, data: Prisma.OrganizationDigitalSignatureUpdateInput) {
    return prisma.organizationDigitalSignature.update({ where: { id }, data });
  },

  softDeleteDigitalSignature(id: string, modifiedBy: string) {
    return prisma.organizationDigitalSignature.update({
      where: { id },
      data: { isDeleted: true, modifiedBy },
    });
  },

  findSeal(organizationId: string) {
    return prisma.organizationSeal.findUnique({ where: { organizationId } });
  },

  createSeal(data: Prisma.OrganizationSealCreateInput) {
    return prisma.organizationSeal.create({ data });
  },

  updateSeal(organizationId: string, data: Prisma.OrganizationSealUpdateInput) {
    return prisma.organizationSeal.update({ where: { organizationId }, data });
  },

  listDocuments(organizationId: string, status?: string) {
    return prisma.organizationDocument.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  findDocument(organizationId: string, documentId: string) {
    return prisma.organizationDocument.findFirst({
      where: { id: documentId, organizationId },
    });
  },

  createDocument(data: Prisma.OrganizationDocumentCreateInput) {
    return prisma.organizationDocument.create({ data });
  },

  updateDocument(id: string, data: Prisma.OrganizationDocumentUpdateInput) {
    return prisma.organizationDocument.update({ where: { id }, data });
  },

  listTemplateTypes(organizationId: string) {
    return prisma.organizationDocumentTemplateType.findMany({
      where: { organizationId, isDeleted: false },
      orderBy: { sortOrder: "asc" },
    });
  },

  findTemplateType(organizationId: string, templateId: string) {
    return prisma.organizationDocumentTemplateType.findFirst({
      where: { id: templateId, organizationId, isDeleted: false },
    });
  },

  createTemplateType(data: Prisma.OrganizationDocumentTemplateTypeCreateInput) {
    return prisma.organizationDocumentTemplateType.create({ data });
  },

  updateTemplateType(id: string, data: Prisma.OrganizationDocumentTemplateTypeUpdateInput) {
    return prisma.organizationDocumentTemplateType.update({ where: { id }, data });
  },

  softDeleteTemplateType(id: string, modifiedBy: string) {
    return prisma.organizationDocumentTemplateType.update({
      where: { id },
      data: { isDeleted: true, modifiedBy },
    });
  },

  createActivityEvent(data: Prisma.OrganizationActivityEventCreateInput) {
    return prisma.organizationActivityEvent.create({ data });
  },

  listActivityEvents(organizationId: string, limit = 50) {
    return prisma.organizationActivityEvent.findMany({
      where: { organizationId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
  },

  createAuditEntry(data: Prisma.OrganizationAuditEntryCreateInput) {
    return prisma.organizationAuditEntry.create({ data });
  },

  listAuditEntries(organizationId: string, limit = 100) {
    return prisma.organizationAuditEntry.findMany({
      where: { organizationId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
  },
};
