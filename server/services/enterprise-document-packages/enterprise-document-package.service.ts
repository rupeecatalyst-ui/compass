/**
 * CO-DOC-005 — Enterprise Document Package Registry (server).
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import type { Prisma } from "@prisma/client";

function createId() {
  return randomUUID().replace(/-/g, "");
}

export type DurablePackageUpsertInput = {
  clientPackageId: string;
  opportunityId: string;
  loanFileId?: string | null;
  folderName: string;
  status?: string;
  storageStatus?: string;
  fileCount: number;
  totalSizeBytes: number;
  uploadedBy: string;
  createdBy?: string;
  version?: number;
  participantId?: string | null;
  documentScope?: string | null;
  contactId?: string | null;
  customerId?: string | null;
  parentEntityType?: string | null;
  parentEntityId?: string | null;
  documentIds: string[];
  relativePaths: Record<string, string>;
};

export type DurablePackageDto = {
  id: string;
  clientPackageId: string | null;
  opportunityId: string;
  loanFileId: string | null;
  folderName: string;
  status: string;
  storageStatus: string;
  fileCount: number;
  totalSizeBytes: number;
  uploadedBy: string;
  createdBy: string;
  version: number;
  participantId: string | null;
  documentScope: string | null;
  contactId: string | null;
  customerId: string | null;
  parentEntityType: string | null;
  parentEntityId: string | null;
  documentIds: string[];
  relativePaths: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean);
}

function asPathMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = String(v ?? "");
  }
  return out;
}

function serialize(row: {
  id: string;
  clientPackageId: string | null;
  opportunityId: string;
  loanFileId: string | null;
  folderName: string;
  status: string;
  storageStatus: string;
  fileCount: number;
  totalSizeBytes: number;
  uploadedBy: string;
  createdBy: string;
  version: number;
  participantId: string | null;
  documentScope: string | null;
  contactId: string | null;
  customerId: string | null;
  parentEntityType: string | null;
  parentEntityId: string | null;
  documentIdsJson: Prisma.JsonValue | null;
  relativePathsJson: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}): DurablePackageDto {
  return {
    id: row.id,
    clientPackageId: row.clientPackageId,
    opportunityId: row.opportunityId,
    loanFileId: row.loanFileId,
    folderName: row.folderName,
    status: row.status,
    storageStatus: row.storageStatus,
    fileCount: row.fileCount,
    totalSizeBytes: row.totalSizeBytes,
    uploadedBy: row.uploadedBy,
    createdBy: row.createdBy,
    version: row.version,
    participantId: row.participantId,
    documentScope: row.documentScope,
    contactId: row.contactId,
    customerId: row.customerId,
    parentEntityType: row.parentEntityType,
    parentEntityId: row.parentEntityId,
    documentIds: asStringArray(row.documentIdsJson),
    relativePaths: asPathMap(row.relativePathsJson),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const enterpriseDocumentPackageService = {
  async upsert(input: DurablePackageUpsertInput): Promise<DurablePackageDto> {
    const organizationId = await resolvePilotOrganizationId();
    const existing = await prisma.enterpriseDocumentPackage.findFirst({
      where: {
        organizationId,
        OR: [
          { clientPackageId: input.clientPackageId },
          { id: input.clientPackageId },
        ],
      },
    });

    const data = {
      clientPackageId: input.clientPackageId,
      opportunityId: input.opportunityId,
      loanFileId: input.loanFileId ?? null,
      folderName: input.folderName,
      status: input.status || "complete",
      storageStatus: input.storageStatus || "durable_metadata",
      fileCount: input.fileCount,
      totalSizeBytes: input.totalSizeBytes,
      uploadedBy: input.uploadedBy,
      createdBy: input.createdBy || input.uploadedBy,
      version: input.version ?? (existing ? existing.version + 1 : 1),
      participantId: input.participantId ?? null,
      documentScope: input.documentScope ?? "applicant",
      contactId: input.contactId ?? null,
      customerId: input.customerId ?? null,
      parentEntityType: input.parentEntityType ?? "opportunity",
      parentEntityId: input.parentEntityId ?? input.opportunityId,
      documentIdsJson: input.documentIds as Prisma.InputJsonValue,
      relativePathsJson: input.relativePaths as Prisma.InputJsonValue,
    };

    const row = existing
      ? await prisma.enterpriseDocumentPackage.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.enterpriseDocumentPackage.create({
          data: {
            id: createId(),
            organizationId,
            ...data,
          },
        });

    await prisma.enterpriseDocumentPackageAudit.create({
      data: {
        id: createId(),
        organizationId,
        packageId: row.id,
        eventType: existing ? "package_updated" : "package_created",
        title: existing ? "Package Updated" : "Package Created",
        description: `Package “${row.folderName}” ${existing ? "updated" : "created"} (${row.fileCount} files).`,
        actorId: input.uploadedBy,
        metadataJson: {
          clientPackageId: input.clientPackageId,
          fileCount: input.fileCount,
        } as Prisma.InputJsonValue,
      },
    });

    return serialize(row);
  },

  async listByOpportunity(opportunityId: string): Promise<DurablePackageDto[]> {
    const organizationId = await resolvePilotOrganizationId();
    const rows = await prisma.enterpriseDocumentPackage.findMany({
      where: {
        organizationId,
        opportunityId,
        status: { not: "deleted" },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return rows.map(serialize);
  },

  async search(query: string): Promise<DurablePackageDto[]> {
    const organizationId = await resolvePilotOrganizationId();
    const q = query.trim();
    if (!q) return [];
    const rows = await prisma.enterpriseDocumentPackage.findMany({
      where: {
        organizationId,
        status: { not: "deleted" },
        OR: [
          { folderName: { contains: q, mode: "insensitive" } },
          { uploadedBy: { contains: q, mode: "insensitive" } },
          { opportunityId: { contains: q, mode: "insensitive" } },
          { customerId: { contains: q, mode: "insensitive" } },
          { parentEntityId: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    return rows.map(serialize);
  },
};
