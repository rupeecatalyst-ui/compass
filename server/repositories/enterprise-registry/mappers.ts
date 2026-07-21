import type { Prisma } from "@prisma/client";
import type {
  AppendRegistryAuditInput,
  EnterpriseRegistryAttachmentRecord,
  EnterpriseRegistryAuditEntryRecord,
  EnterpriseRegistryImportBatchRecord,
} from "@/types/enterprise-master-data";

function toIso(d: Date): string {
  return d.toISOString();
}

function jsonToRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function mapPrismaAuditToDomain(
  row: {
    id: string;
    organizationId: string;
    registryModule: EnterpriseRegistryAuditEntryRecord["registryModule"];
    entityId: string;
    entityCode: string | null;
    action: EnterpriseRegistryAuditEntryRecord["action"];
    previousValue: Prisma.JsonValue | null;
    newValue: Prisma.JsonValue | null;
    actorUserId: string;
    actorName: string | null;
    reason: string | null;
    at: Date;
  },
): EnterpriseRegistryAuditEntryRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    registryModule: row.registryModule,
    entityId: row.entityId,
    entityCode: row.entityCode,
    action: row.action,
    previousValue: jsonToRecord(row.previousValue),
    newValue: jsonToRecord(row.newValue),
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    reason: row.reason,
    at: toIso(row.at),
  };
}

export function mapPrismaAttachmentToDomain(row: {
  id: string;
  organizationId: string;
  registryModule: EnterpriseRegistryAttachmentRecord["registryModule"];
  entityId: string;
  fileName: string;
  storageKey: string;
  mimeType: string | null;
  byteSize: number | null;
  uploadedBy: string;
  uploadedAt: Date;
}): EnterpriseRegistryAttachmentRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    registryModule: row.registryModule,
    entityId: row.entityId,
    fileName: row.fileName,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    uploadedBy: row.uploadedBy,
    uploadedAt: toIso(row.uploadedAt),
  };
}

export function mapPrismaImportBatchToDomain(row: {
  id: string;
  organizationId: string;
  registryModule: EnterpriseRegistryImportBatchRecord["registryModule"];
  fileName: string | null;
  status: EnterpriseRegistryImportBatchRecord["status"];
  rowCount: number;
  successCount: number;
  errorCount: number;
  errorSummary: Prisma.JsonValue | null;
  importedBy: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseRegistryImportBatchRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    registryModule: row.registryModule,
    fileName: row.fileName,
    status: row.status,
    rowCount: row.rowCount,
    successCount: row.successCount,
    errorCount: row.errorCount,
    errorSummary: jsonToRecord(row.errorSummary),
    importedBy: row.importedBy,
    startedAt: row.startedAt ? toIso(row.startedAt) : null,
    completedAt: row.completedAt ? toIso(row.completedAt) : null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export type AuditCreateData = AppendRegistryAuditInput;
