import type { Prisma } from "@prisma/client";
import type {
  EnterpriseProductCategoryRecord,
  EnterpriseProductGroupRecord,
  EnterpriseProductRecord,
} from "@/types/enterprise-product-registry";

function toIso(d: Date): string {
  return d.toISOString();
}

function jsonToStringArray(value: Prisma.JsonValue | null): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === "string");
}

export function normalizeProductRegistryCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_-]/g, "");
}

export function mapCategoryRow(row: {
  id: string;
  organizationId: string;
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  status: EnterpriseProductCategoryRecord["status"];
  enabled: boolean;
  versionNumber: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  notes: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  deletionReason: string | null;
  approvalStatus: EnterpriseProductCategoryRecord["approvalStatus"];
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseProductCategoryRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    label: row.label,
    description: row.description,
    sortOrder: row.sortOrder,
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

export function mapGroupRow(row: {
  id: string;
  organizationId: string;
  categoryId: string;
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  status: EnterpriseProductGroupRecord["status"];
  enabled: boolean;
  versionNumber: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  notes: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  deletionReason: string | null;
  approvalStatus: EnterpriseProductGroupRecord["approvalStatus"];
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseProductGroupRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    categoryId: row.categoryId,
    code: row.code,
    label: row.label,
    description: row.description,
    sortOrder: row.sortOrder,
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

export function mapProductRow(row: {
  id: string;
  organizationId: string;
  categoryId: string;
  groupId: string;
  code: string;
  label: string;
  description: string | null;
  shortDescription: string | null;
  lifecycleStatus: EnterpriseProductRecord["lifecycleStatus"];
  operationalStatus: EnterpriseProductRecord["operationalStatus"];
  majorVersion: number;
  minorVersion: number;
  tags: Prisma.JsonValue | null;
  productOwner: string | null;
  sortOrder?: number;
  parentProductId?: string | null;
  isSecured?: boolean | null;
  customerSegment?: Prisma.JsonValue | null;
  remarks?: string | null;
  status: EnterpriseProductRecord["status"];
  enabled: boolean;
  versionNumber: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  notes: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  deletionReason: string | null;
  approvalStatus: EnterpriseProductRecord["approvalStatus"];
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseProductRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    categoryId: row.categoryId,
    groupId: row.groupId,
    code: row.code,
    label: row.label,
    description: row.description,
    shortDescription: row.shortDescription,
    lifecycleStatus: row.lifecycleStatus,
    operationalStatus: row.operationalStatus,
    majorVersion: row.majorVersion,
    minorVersion: row.minorVersion,
    tags: jsonToStringArray(row.tags),
    productOwner: row.productOwner,
    sortOrder: row.sortOrder ?? 0,
    parentProductId: row.parentProductId ?? null,
    isSecured: row.isSecured ?? null,
    customerSegment: jsonToStringArray(row.customerSegment ?? null),
    remarks: row.remarks ?? null,
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
