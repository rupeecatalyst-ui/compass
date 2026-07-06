/**
 * Product Library Factory — enterprise product composition blueprint SSOT.
 * Metadata-driven; no workflow, policy, rule, or asset execution.
 */

export type ProductLifecycleStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "deprecated"
  | "archived";

export type ProductOperationalStatus =
  | "active"
  | "inactive"
  | "pilot"
  | "coming_soon"
  | "retired";

export interface ProductCategory {
  id: string;
  categoryCode: string;
  categoryName: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
}

export interface ProductGroup {
  id: string;
  groupCode: string;
  groupName: string;
  categoryId: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
}

export interface ProductEligibilityMetadata {
  minAge?: number;
  maxAge?: number;
  customerCategoryRefs: string[];
  geographyRefs: string[];
  notes?: string;
}

export interface ProductFeature {
  id: string;
  label: string;
  description: string;
}

export interface ProductBenefit {
  id: string;
  label: string;
  description: string;
}

/** Reference-only dependency — no duplicated business logic. */
export interface ProductDependency {
  id: string;
  dependencyType: "policy" | "workflow" | "rule" | "document" | "product";
  refId: string;
  label: string;
  required: boolean;
}

export interface ProductDocumentationRef {
  id: string;
  docType: string;
  refId: string;
  label: string;
  status: "draft" | "published" | "outdated";
}

/** Generic enterprise asset reference — EAL-ready, metadata only. */
export type EnterpriseAssetType =
  | "DOCUMENT_PACK"
  | "CHECKLIST_PACK"
  | "SLA_PACK"
  | "NOTIFICATION_PACK"
  | "FEE_TEMPLATE"
  | "CALCULATOR"
  | "COMPLIANCE_PACK"
  | "AI_PROMPT"
  | "API_INTEGRATION"
  | "UI_EXPERIENCE";

export type CompositionAssetStatus = "draft" | "published" | "archived";

export interface ProductCompositionAsset {
  assetId: string;
  assetType: EnterpriseAssetType;
  version: string;
  status: CompositionAssetStatus;
  description: string;
}

/**
 * Immutable product definition version.
 * Composition metadata belongs to the version; published snapshots are frozen.
 */
export interface ProductDefinition {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  description: string;
  shortDescription?: string;
  categoryId: string;
  groupId: string;
  majorVersion: number;
  minorVersion: number;
  lifecycleStatus: ProductLifecycleStatus;
  operationalStatus: ProductOperationalStatus;
  tags: string[];
  features: ProductFeature[];
  benefits: ProductBenefit[];
  eligibilityMetadata: ProductEligibilityMetadata;
  dependencies: ProductDependency[];
  documentationRefs: ProductDocumentationRef[];
  policyIds: string[];
  workflowIds: string[];
  ruleIds: string[];
  decisionMatrixIds: string[];
  documentIds: string[];
  compositionAssets: ProductCompositionAsset[];
  productOwner: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdBy: string;
  approvedBy?: string;
  publishedBy?: string;
  publishedDate?: string;
  lastModified: string;
  tenantId?: string;
}

export interface ProductRegistryEntry {
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  groupName: string;
  latestVersionLabel: string;
  lifecycleStatus: ProductLifecycleStatus;
  operationalStatus: ProductOperationalStatus;
  productOwner: string;
  tagCount: number;
  dependencyCount: number;
  lastModified: string;
}

export interface ProductAuditEntry {
  id: string;
  productId: string;
  productName: string;
  versionLabel: string;
  actor: string;
  action: string;
  timestamp: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

export interface ProductCompositionDashboardMetrics {
  productsWithCompleteComposition: number;
  productsMissingWorkflows: number;
  productsMissingPolicies: number;
  productsMissingRules: number;
  productsMissingEnterpriseAssets: number;
  productsReadyForPublishing: number;
}

export interface ProductLibraryDashboardMetrics {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  pilotProducts: number;
  categoryCount: number;
  groupCount: number;
  deprecatedProducts: number;
  comingSoonProducts: number;
  composition: ProductCompositionDashboardMetrics;
}

export type ProductLibrarySectionId =
  | "overview"
  | "registry"
  | "categories"
  | "lifecycle"
  | "audit";

export type ProductLibraryExtensionPoint =
  | "pricing_engine"
  | "eligibility_calculator"
  | "marketing_catalog"
  | "customer_journey"
  | "ai_recommendations"
  | "enterprise_asset_library";

/** Design-time catalog for platform refs (policy, workflow, rule, decision matrix). */
export type PlatformCompositionRefType = "policy" | "workflow" | "rule" | "decision_matrix";

export interface PlatformCompositionRef {
  refId: string;
  refType: PlatformCompositionRefType;
  version: string;
  status: CompositionAssetStatus;
  description: string;
}
