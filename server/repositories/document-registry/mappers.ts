import type {
  EnterpriseDocumentDefinitionRecord,
  EnterpriseDocumentTypeRecord,
} from "@/types/enterprise-document-registry";

function toIso(d: Date): string {
  return d.toISOString();
}

export function normalizeDocumentRegistryCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_-]/g, "");
}

export function mapTypeRow(row: {
  id: string;
  organizationId: string;
  code: string;
  label: string;
  description: string | null;
  category: EnterpriseDocumentTypeRecord["category"];
  sortOrder: number;
  status: EnterpriseDocumentTypeRecord["status"];
  enabled: boolean;
  versionNumber: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  notes: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  deletionReason: string | null;
  approvalStatus: EnterpriseDocumentTypeRecord["approvalStatus"];
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseDocumentTypeRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    label: row.label,
    description: row.description,
    category: row.category,
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

export function mapDefinitionRow(row: {
  id: string;
  organizationId: string;
  typeId: string;
  code: string;
  label: string;
  description: string | null;
  category: EnterpriseDocumentDefinitionRecord["category"];
  classification: EnterpriseDocumentDefinitionRecord["classification"];
  lifecycleStatus: EnterpriseDocumentDefinitionRecord["lifecycleStatus"];
  status: EnterpriseDocumentDefinitionRecord["status"];
  enabled: boolean;
  versionNumber: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  notes: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  deletionReason: string | null;
  approvalStatus: EnterpriseDocumentDefinitionRecord["approvalStatus"];
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseDocumentDefinitionRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    typeId: row.typeId,
    code: row.code,
    label: row.label,
    description: row.description,
    category: row.category,
    classification: row.classification,
    lifecycleStatus: row.lifecycleStatus,
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
