import type { Prisma, ReferenceMasterDomain } from "@prisma/client";
import type { EnterpriseReferenceMasterRecord } from "@/types/enterprise-master-data";

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

export function normalizeReferenceMasterCode(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

export function mapPrismaReferenceMasterToDomain(row: {
  id: string;
  organizationId: string;
  domain: ReferenceMasterDomain;
  code: string;
  label: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  meta: Prisma.JsonValue | null;
  status: EnterpriseReferenceMasterRecord["status"];
  enabled: boolean;
  versionNumber: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  notes: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  deletionReason: string | null;
  approvalStatus: EnterpriseReferenceMasterRecord["approvalStatus"];
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseReferenceMasterRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    domain: row.domain,
    code: row.code,
    label: row.label,
    description: row.description,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
    meta: jsonToRecord(row.meta),
    status: row.status,
    enabled: row.enabled,
    versionNumber: row.versionNumber,
    effectiveFrom: row.effectiveFrom ? toIso(row.effectiveFrom) : null,
    effectiveUntil: row.effectiveUntil ? toIso(row.effectiveUntil) : null,
    notes: row.notes,
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt ? toIso(row.deletedAt) : null,
    deletedBy: row.deletedBy,
    deletionReason: row.deletionReason,
    approvalStatus: row.approvalStatus,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt ? toIso(row.approvedAt) : null,
    createdBy: row.createdBy,
    modifiedBy: row.modifiedBy,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}
