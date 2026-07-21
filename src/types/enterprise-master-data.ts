/**
 * CO-ARCH-001 — Enterprise Master Data types.
 * Tier 0 metadata contract shared by Tier 1 Reference Master and Tier 2 Business Registries.
 */

import type {
  EnterpriseRegistryModule,
  ReferenceMasterDomain,
  RegistryApprovalStatus,
  RegistryAuditAction,
  RegistryImportBatchStatus,
  RegistryStatus,
} from "@prisma/client";

export type {
  EnterpriseRegistryModule,
  ReferenceMasterDomain,
  RegistryApprovalStatus,
  RegistryAuditAction,
  RegistryImportBatchStatus,
  RegistryStatus,
};

/** Standard metadata block applied to Tier 1 & Tier 2 registry entity rows (future phases). */
export interface EnterpriseRegistryMetadataBlock {
  organizationId: string;
  code: string;
  label: string;
  description?: string | null;
  status: RegistryStatus;
  enabled: boolean;
  versionNumber: number;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  notes?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
  approvalStatus?: RegistryApprovalStatus | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export interface EnterpriseRegistryAuditEntryRecord {
  id: string;
  organizationId: string;
  registryModule: EnterpriseRegistryModule;
  entityId: string;
  entityCode?: string | null;
  action: RegistryAuditAction;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  actorUserId: string;
  actorName?: string | null;
  reason?: string | null;
  at: string;
}

export interface EnterpriseRegistryAttachmentRecord {
  id: string;
  organizationId: string;
  registryModule: EnterpriseRegistryModule;
  entityId: string;
  fileName: string;
  storageKey: string;
  mimeType?: string | null;
  byteSize?: number | null;
  uploadedBy: string;
  uploadedAt: string;
}

export interface EnterpriseRegistryImportBatchRecord {
  id: string;
  organizationId: string;
  registryModule: EnterpriseRegistryModule;
  fileName?: string | null;
  status: RegistryImportBatchStatus;
  rowCount: number;
  successCount: number;
  errorCount: number;
  errorSummary?: Record<string, unknown> | null;
  importedBy: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppendRegistryAuditInput {
  organizationId: string;
  registryModule: EnterpriseRegistryModule;
  entityId: string;
  entityCode?: string;
  action: RegistryAuditAction;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  actorUserId: string;
  actorName?: string;
  reason?: string;
}

export interface CreateRegistryAttachmentInput {
  organizationId: string;
  registryModule: EnterpriseRegistryModule;
  entityId: string;
  fileName: string;
  storageKey: string;
  mimeType?: string;
  byteSize?: number;
  uploadedBy: string;
}

export interface CreateRegistryImportBatchInput {
  organizationId: string;
  registryModule: EnterpriseRegistryModule;
  fileName?: string;
  importedBy: string;
}

export interface RegistryAuditQuery {
  registryModule?: EnterpriseRegistryModule;
  entityId?: string;
  page?: number;
  pageSize?: number;
}

/** Tier 1 Reference Master — persisted lookup option. */
export interface EnterpriseReferenceMasterRecord {
  id: string;
  organizationId: string;
  domain: ReferenceMasterDomain;
  code: string;
  label: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder: number;
  meta?: Record<string, unknown> | null;
  status: RegistryStatus;
  enabled: boolean;
  versionNumber: number;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  notes?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
  approvalStatus: RegistryApprovalStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceMasterQuery {
  domain: ReferenceMasterDomain;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RegistryStatus | "all";
  enabled?: boolean | "all";
  parentId?: string | "root" | null;
  includeDeleted?: boolean;
  sortBy?: "sortOrder" | "label" | "code" | "modifiedOn" | "createdOn";
  sortDir?: "asc" | "desc";
}

export interface CreateReferenceMasterInput {
  domain: ReferenceMasterDomain;
  code: string;
  label: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  meta?: Record<string, unknown>;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string;
  createdBy: string;
}

export interface UpdateReferenceMasterInput {
  label?: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  meta?: Record<string, unknown> | null;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string | null;
  modifiedBy: string;
}

export interface ReferenceMasterDomainSummary {
  domain: ReferenceMasterDomain;
  label: string;
  activeCount: number;
  totalCount: number;
}
