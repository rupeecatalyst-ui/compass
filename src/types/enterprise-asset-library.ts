/**
 * Enterprise Asset Library (EAL) — governed repository for all reusable enterprise assets.
 * Foundation only; no asset-type execution logic.
 * ADR-005: parent repository for reusable enterprise assets.
 * ADR-009: Product compositionAssets[] references EAL assetIds (design-time).
 */

export type EnterpriseAssetType =
  | "DOCUMENT_PACK"
  | "CHECKLIST_PACK"
  | "NOTIFICATION_PACK"
  | "SLA_PACK"
  | "FEE_TEMPLATE"
  | "CALCULATOR"
  | "COMPLIANCE_PACK"
  | "AI_PROMPT"
  | "API_INTEGRATION"
  | "UI_EXPERIENCE"
  | "CUSTOM";

export type EnterpriseAssetLifecycleStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "deprecated"
  | "archived";

export type EnterpriseAssetOperationalStatus =
  | "active"
  | "inactive"
  | "pilot"
  | "coming_soon"
  | "retired";

export interface EnterpriseAssetCategory {
  id: string;
  categoryCode: string;
  categoryName: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
}

export interface EnterpriseAssetDependency {
  id: string;
  dependencyType: "asset" | "policy" | "workflow" | "rule" | "product";
  refId: string;
  label: string;
  required: boolean;
}

/** Extensible metadata bag — no business logic. */
export type EnterpriseAssetMetadata = Record<string, string | number | boolean | string[]>;

/**
 * Immutable enterprise asset version record.
 * Published versions are frozen snapshots.
 */
export interface EnterpriseAsset {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  assetType: EnterpriseAssetType;
  categoryId: string;
  description: string;
  majorVersion: number;
  minorVersion: number;
  lifecycle: EnterpriseAssetLifecycleStatus;
  status: EnterpriseAssetOperationalStatus;
  tags: string[];
  owner: string;
  dependencies: EnterpriseAssetDependency[];
  metadata: EnterpriseAssetMetadata;
  createdBy: string;
  approvedBy?: string;
  publishedBy?: string;
  createdDate: string;
  updatedDate: string;
  publishedDate?: string;
  tenantId?: string;
}

export interface EnterpriseAssetRegistryEntry {
  assetId: string;
  assetCode: string;
  assetName: string;
  assetType: EnterpriseAssetType;
  categoryName: string;
  versionLabel: string;
  lifecycle: EnterpriseAssetLifecycleStatus;
  status: EnterpriseAssetOperationalStatus;
  owner: string;
  tagCount: number;
  updatedDate: string;
}

export interface EnterpriseAssetAuditEntry {
  id: string;
  assetId: string;
  assetName: string;
  versionLabel: string;
  actor: string;
  action: string;
  timestamp: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

export interface EnterpriseAssetLibraryDashboardMetrics {
  totalAssets: number;
  publishedAssets: number;
  draftAssets: number;
  categoryCount: number;
  assetTypeCount: number;
  deprecatedAssets: number;
  pilotAssets: number;
  customTypeAssets: number;
}

export type EnterpriseAssetLibrarySectionId =
  | "overview"
  | "registry"
  | "categories"
  | "lifecycle"
  | "audit";

export type EnterpriseAssetRegistrySortField =
  | "assetName"
  | "assetType"
  | "categoryName"
  | "versionLabel"
  | "lifecycle"
  | "owner"
  | "updatedDate";

export interface EnterpriseAssetRegistryFilters {
  assetType?: EnterpriseAssetType | "all";
  lifecycle?: EnterpriseAssetLifecycleStatus | "all";
  categoryId?: string | "all";
}
