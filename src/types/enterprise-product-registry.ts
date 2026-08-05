/**
 * CO-ARCH-001-I4a — Enterprise Product Registry types (Infrastructure).
 */

import type {
  ProductLifecycleStatus,
  ProductOperationalStatus,
  RegistryApprovalStatus,
  RegistryStatus,
} from "@prisma/client";

export type {
  ProductLifecycleStatus,
  ProductOperationalStatus,
};

export interface EnterpriseProductCategoryRecord {
  id: string;
  organizationId: string;
  code: string;
  label: string;
  description?: string | null;
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

export interface EnterpriseProductGroupRecord {
  id: string;
  organizationId: string;
  categoryId: string;
  code: string;
  label: string;
  description?: string | null;
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

export interface EnterpriseProductRecord {
  id: string;
  organizationId: string;
  categoryId: string;
  groupId: string;
  code: string;
  label: string;
  description?: string | null;
  shortDescription?: string | null;
  lifecycleStatus: ProductLifecycleStatus;
  operationalStatus: ProductOperationalStatus;
  majorVersion: number;
  minorVersion: number;
  tags?: string[] | null;
  productOwner?: string | null;
  /** CO-ADMIN-005 */
  sortOrder: number;
  parentProductId?: string | null;
  isSecured?: boolean | null;
  customerSegment?: string[] | null;
  remarks?: string | null;
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
  /** CO-PR-005 — presentation-only annotations (not persisted columns). */
  presentationRole?: "canonical" | "legacy";
  presentationBadge?: "Canonical" | "Legacy / Historical";
  presentationFamilyKey?: string;
  canonicalSurvivorId?: string;
  canonicalSurvivorCode?: string;
}

export interface ProductCategoryQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RegistryStatus | "all";
  enabled?: boolean | "all";
  includeDeleted?: boolean;
  sortBy?: "sortOrder" | "label" | "code" | "modifiedOn" | "createdOn";
  sortDir?: "asc" | "desc";
}

export interface ProductGroupQuery extends ProductCategoryQuery {
  categoryId?: string;
}

export interface ProductRegistryQuery extends ProductGroupQuery {
  groupId?: string;
  lifecycleStatus?: ProductLifecycleStatus | "all";
  operationalStatus?: ProductOperationalStatus | "all";
}

export interface CreateProductCategoryInput {
  code: string;
  label: string;
  description?: string;
  sortOrder?: number;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string;
  createdBy: string;
}

export interface UpdateProductCategoryInput {
  label?: string;
  description?: string | null;
  sortOrder?: number;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string | null;
  modifiedBy: string;
}

export interface CreateProductGroupInput {
  categoryId: string;
  code: string;
  label: string;
  description?: string;
  sortOrder?: number;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string;
  createdBy: string;
}

export interface UpdateProductGroupInput {
  label?: string;
  description?: string | null;
  categoryId?: string;
  sortOrder?: number;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string | null;
  modifiedBy: string;
}

export interface CreateProductRegistryInput {
  categoryId: string;
  groupId: string;
  code: string;
  label: string;
  description?: string;
  shortDescription?: string;
  lifecycleStatus?: ProductLifecycleStatus;
  operationalStatus?: ProductOperationalStatus;
  majorVersion?: number;
  minorVersion?: number;
  tags?: string[];
  productOwner?: string;
  sortOrder?: number;
  parentProductId?: string | null;
  isSecured?: boolean | null;
  customerSegment?: string[];
  remarks?: string;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string;
  createdBy: string;
}

export interface UpdateProductRegistryInput {
  label?: string;
  description?: string | null;
  shortDescription?: string | null;
  categoryId?: string;
  groupId?: string;
  lifecycleStatus?: ProductLifecycleStatus;
  operationalStatus?: ProductOperationalStatus;
  majorVersion?: number;
  minorVersion?: number;
  tags?: string[] | null;
  productOwner?: string | null;
  sortOrder?: number;
  parentProductId?: string | null;
  isSecured?: boolean | null;
  customerSegment?: string[] | null;
  remarks?: string | null;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string | null;
  modifiedBy: string;
}
