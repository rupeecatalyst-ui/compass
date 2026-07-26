/**
 * CO-ARCH-001-I4b — Enterprise Document Registry types (Infrastructure).
 */
import type {
  DocumentRegistryCategory,
  DocumentRegistryClassification,
  DocumentRegistryLifecycleStatus,
  RegistryApprovalStatus,
  RegistryStatus,
} from "@prisma/client";

export type {
  DocumentRegistryCategory,
  DocumentRegistryClassification,
  DocumentRegistryLifecycleStatus,
};

export interface EnterpriseDocumentTypeRecord {
  id: string;
  organizationId: string;
  code: string;
  label: string;
  description?: string | null;
  category: DocumentRegistryCategory;
  sortOrder: number;
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

export interface EnterpriseDocumentDefinitionRecord {
  id: string;
  organizationId: string;
  typeId: string;
  code: string;
  label: string;
  description?: string | null;
  category: DocumentRegistryCategory;
  classification: DocumentRegistryClassification;
  lifecycleStatus: DocumentRegistryLifecycleStatus;
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

export interface DocumentRegistryListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RegistryStatus | "all";
  enabled?: boolean | "all";
  includeDeleted?: boolean;
  sortBy?: "sortOrder" | "label" | "code" | "modifiedOn" | "createdOn";
  sortDir?: "asc" | "desc";
  category?: DocumentRegistryCategory | "all";
}

export interface DocumentDefinitionQuery extends DocumentRegistryListQuery {
  typeId?: string;
  lifecycleStatus?: DocumentRegistryLifecycleStatus | "all";
  classification?: DocumentRegistryClassification | "all";
}

export interface CreateDocumentTypeInput {
  code: string;
  label: string;
  description?: string;
  category: DocumentRegistryCategory;
  sortOrder?: number;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string;
  createdBy: string;
}

export interface UpdateDocumentTypeInput {
  label?: string;
  description?: string | null;
  category?: DocumentRegistryCategory;
  sortOrder?: number;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string | null;
  modifiedBy: string;
}

export interface CreateDocumentDefinitionInput {
  typeId: string;
  code: string;
  label: string;
  description?: string;
  category: DocumentRegistryCategory;
  classification?: DocumentRegistryClassification;
  lifecycleStatus?: DocumentRegistryLifecycleStatus;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string;
  createdBy: string;
}

export interface UpdateDocumentDefinitionInput {
  label?: string;
  description?: string | null;
  typeId?: string;
  category?: DocumentRegistryCategory;
  classification?: DocumentRegistryClassification;
  lifecycleStatus?: DocumentRegistryLifecycleStatus;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string | null;
  modifiedBy: string;
}
