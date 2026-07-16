import { DEFAULT_PRODUCT_AUDIT_TRAIL } from "@/data/catalyst-one/product-library/product-audit-seed";
import { DEFAULT_PLATFORM_COMPOSITION_CATALOG } from "@/data/catalyst-one/product-library/platform-composition-catalog-seed";
import { DEFAULT_PRODUCT_CATEGORIES } from "@/data/catalyst-one/product-library/product-categories-seed";
import { DEFAULT_PRODUCT_DEFINITIONS } from "@/data/catalyst-one/product-library/product-definitions-seed";
import { DEFAULT_PRODUCT_GROUPS } from "@/data/catalyst-one/product-library/product-groups-seed";
import {
  canTransitionProductLifecycle,
  formatProductVersion,
  isProductPublished,
} from "@/constants/product-library-lifecycle";
import {
  hasEnterpriseAssets,
  isCompositionComplete,
  isReadyForPublishing,
} from "@/lib/product-library/product-composition";
import type {
  PlatformCompositionRef,
  ProductAuditEntry,
  ProductCategory,
  ProductCompositionDashboardMetrics,
  ProductDefinition,
  ProductGroup,
  ProductLibraryDashboardMetrics,
  ProductLifecycleStatus,
  ProductRegistryEntry,
} from "@/types/product-library";

let definitionsOverride: ProductDefinition[] | null = null;
let categoriesOverride: ProductCategory[] | null = null;
let groupsOverride: ProductGroup[] | null = null;
let auditOverride: ProductAuditEntry[] | null = null;
let platformCatalogOverride: PlatformCompositionRef[] | null = null;

export function resetProductLibraryStore(): void {
  definitionsOverride = null;
  categoriesOverride = null;
  groupsOverride = null;
  auditOverride = null;
  platformCatalogOverride = null;
}

export function getAllProductDefinitions(): ProductDefinition[] {
  return definitionsOverride ?? DEFAULT_PRODUCT_DEFINITIONS;
}

export function getProductCategories(): ProductCategory[] {
  return (categoriesOverride ?? DEFAULT_PRODUCT_CATEGORIES)
    .filter((c) => c.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getAllProductCategories(): ProductCategory[] {
  return (categoriesOverride ?? DEFAULT_PRODUCT_CATEGORIES).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getProductCategoryById(id: string): ProductCategory | undefined {
  return getAllProductCategories().find((c) => c.id === id);
}

export function getProductGroups(): ProductGroup[] {
  return (groupsOverride ?? DEFAULT_PRODUCT_GROUPS)
    .filter((g) => g.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getAllProductGroups(): ProductGroup[] {
  return (groupsOverride ?? DEFAULT_PRODUCT_GROUPS).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getProductGroupsForCategory(categoryId: string): ProductGroup[] {
  return getProductGroups().filter((g) => g.categoryId === categoryId);
}

export function getProductGroupById(id: string): ProductGroup | undefined {
  return getAllProductGroups().find((g) => g.id === id);
}

export function getLatestProductDefinitions(): ProductDefinition[] {
  const byProduct = new Map<string, ProductDefinition>();
  for (const def of getAllProductDefinitions()) {
    const existing = byProduct.get(def.productId);
    if (
      !existing ||
      def.majorVersion > existing.majorVersion ||
      (def.majorVersion === existing.majorVersion && def.minorVersion > existing.minorVersion)
    ) {
      byProduct.set(def.productId, def);
    }
  }
  return Array.from(byProduct.values()).sort((a, b) => a.productName.localeCompare(b.productName));
}

export function getProductVersions(productId: string): ProductDefinition[] {
  return getAllProductDefinitions()
    .filter((d) => d.productId === productId)
    .sort((a, b) => {
      if (b.majorVersion !== a.majorVersion) return b.majorVersion - a.majorVersion;
      return b.minorVersion - a.minorVersion;
    });
}

export function getProductById(productId: string): ProductDefinition | undefined {
  return getLatestProductDefinitions().find((d) => d.productId === productId);
}

export function getProductVersionById(versionId: string): ProductDefinition | undefined {
  return getAllProductDefinitions().find((d) => d.id === versionId);
}

export function getPlatformCompositionCatalog(): PlatformCompositionRef[] {
  return platformCatalogOverride ?? DEFAULT_PLATFORM_COMPOSITION_CATALOG;
}

export function getPlatformCompositionRef(refId: string): PlatformCompositionRef | undefined {
  return getPlatformCompositionCatalog().find((e) => e.refId === refId);
}

export function getProductCompositionDashboardMetrics(): ProductCompositionDashboardMetrics {
  const latest = getLatestProductDefinitions();
  return {
    productsWithCompleteComposition: latest.filter(isCompositionComplete).length,
    productsMissingWorkflows: latest.filter((d) => d.workflowIds.length === 0).length,
    productsMissingPolicies: latest.filter((d) => d.policyIds.length === 0).length,
    productsMissingRules: latest.filter((d) => d.ruleIds.length === 0).length,
    productsMissingEnterpriseAssets: latest.filter((d) => !hasEnterpriseAssets(d)).length,
    productsReadyForPublishing: latest.filter(isReadyForPublishing).length,
  };
}

export function getProductAuditTrail(): ProductAuditEntry[] {
  return auditOverride ?? DEFAULT_PRODUCT_AUDIT_TRAIL;
}

export function appendProductAuditEntry(
  entry: Omit<ProductAuditEntry, "id" | "timestamp"> & { timestamp?: string },
): ProductAuditEntry {
  const record: ProductAuditEntry = {
    ...entry,
    id: `pla_${Date.now()}`,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
  const current = getProductAuditTrail();
  auditOverride = [record, ...current];
  return record;
}

export function getAuditTrailForProduct(productId: string): ProductAuditEntry[] {
  return getProductAuditTrail().filter((e) => e.productId === productId);
}

export function getProductRegistry(): ProductRegistryEntry[] {
  return getLatestProductDefinitions().map((def) => {
    const category = getProductCategoryById(def.categoryId);
    const group = getProductGroupById(def.groupId);
    return {
      productId: def.productId,
      productCode: def.productCode,
      productName: def.productName,
      categoryName: category?.categoryName ?? def.categoryId,
      groupName: group?.groupName ?? def.groupId,
      latestVersionLabel: formatProductVersion(def.majorVersion, def.minorVersion),
      lifecycleStatus: def.lifecycleStatus,
      operationalStatus: def.operationalStatus,
      productOwner: def.productOwner,
      tagCount: def.tags.length,
      dependencyCount: def.dependencies.length,
      lastModified: def.lastModified,
    };
  });
}

export function searchProductRegistry(query: string): ProductRegistryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return getProductRegistry();
  return getProductRegistry().filter(
    (r) =>
      r.productCode.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.categoryName.toLowerCase().includes(q) ||
      r.groupName.toLowerCase().includes(q) ||
      r.productOwner.toLowerCase().includes(q) ||
      r.productId.toLowerCase().includes(q),
  );
}

export function getProductLibraryDashboardMetrics(): ProductLibraryDashboardMetrics {
  const latest = getLatestProductDefinitions();
  return {
    totalProducts: latest.length,
    publishedProducts: latest.filter((d) => isProductPublished(d.lifecycleStatus)).length,
    draftProducts: latest.filter((d) => d.lifecycleStatus === "draft").length,
    pilotProducts: latest.filter((d) => d.operationalStatus === "pilot").length,
    categoryCount: getProductCategories().length,
    groupCount: getProductGroups().length,
    deprecatedProducts: latest.filter((d) => d.lifecycleStatus === "deprecated").length,
    comingSoonProducts: latest.filter((d) => d.operationalStatus === "coming_soon").length,
    composition: getProductCompositionDashboardMetrics(),
  };
}

export function getProductsByLifecycleStatus(status: ProductLifecycleStatus): ProductDefinition[] {
  return getLatestProductDefinitions().filter((d) => d.lifecycleStatus === status);
}

export function transitionProductLifecycle(
  productId: string,
  to: ProductLifecycleStatus,
  actor: string,
): ProductDefinition | undefined {
  const all = [...getAllProductDefinitions()];
  const idx = all.findIndex((d) => d.productId === productId && d.lifecycleStatus !== "archived");
  if (idx === -1) return undefined;

  const current = all[idx];
  if (!canTransitionProductLifecycle(current.lifecycleStatus, to)) return undefined;

  const now = new Date().toISOString();
  const updated: ProductDefinition = {
    ...current,
    lifecycleStatus: to,
    lastModified: now,
    ...(to === "approved" ? { approvedBy: actor } : {}),
    ...(to === "published" ? { publishedBy: actor, publishedDate: now } : {}),
  };
  all[idx] = updated;
  definitionsOverride = all;

  appendProductAuditEntry({
    productId: current.productId,
    productName: current.productName,
    versionLabel: formatProductVersion(current.majorVersion, current.minorVersion),
    actor,
    action:
      to === "published"
        ? "Version published"
        : `${to.charAt(0).toUpperCase() + to.slice(1)} product definition`,
    field: "lifecycleStatus",
    oldValue: current.lifecycleStatus,
    newValue: to,
  });

  if (to === "published") {
    appendProductAuditEntry({
      productId: current.productId,
      productName: current.productName,
      versionLabel: formatProductVersion(updated.majorVersion, updated.minorVersion),
      actor,
      action: "Composition snapshot frozen on publish",
      field: "composition",
      oldValue: "",
      newValue: "immutable",
    });
  }

  notifyAtlasProductRegistration(updated);
  return updated;
}

export interface ProductDraftInput {
  productId?: string;
  productCode: string;
  productName: string;
  description: string;
  shortDescription?: string;
  categoryId: string;
  groupId: string;
  operationalStatus: ProductDefinition["operationalStatus"];
  tags?: string[];
  features?: ProductDefinition["features"];
  benefits?: ProductDefinition["benefits"];
  eligibilityMetadata?: ProductDefinition["eligibilityMetadata"];
  dependencies?: ProductDefinition["dependencies"];
  documentationRefs?: ProductDefinition["documentationRefs"];
  policyIds?: string[];
  workflowIds?: string[];
  ruleIds?: string[];
  decisionMatrixIds?: string[];
  documentIds?: string[];
  compositionAssets?: ProductDefinition["compositionAssets"];
  productOwner: string;
  createdBy: string;
}

export function saveProductDraft(draft: ProductDraftInput): ProductDefinition {
  const now = new Date().toISOString();
  const all = [...getAllProductDefinitions()];
  const productId = draft.productId ?? `prod_${Date.now()}`;
  const versions = getProductVersions(productId);
  const latest = versions[0];
  const major =
    latest?.lifecycleStatus === "published" ? latest.majorVersion + 1 : (latest?.majorVersion ?? 1);
  const minor =
    latest?.lifecycleStatus === "published" ? 0 : (latest?.minorVersion ?? 0) + (latest ? 1 : 0);

  const record: ProductDefinition = {
    id: `prod_ver_${Date.now()}`,
    productId,
    productCode: draft.productCode,
    productName: draft.productName,
    description: draft.description,
    shortDescription: draft.shortDescription,
    categoryId: draft.categoryId,
    groupId: draft.groupId,
    majorVersion: major,
    minorVersion: minor,
    lifecycleStatus: "draft",
    operationalStatus: draft.operationalStatus,
    tags: draft.tags ?? [],
    features: draft.features ?? [],
    benefits: draft.benefits ?? [],
    eligibilityMetadata: draft.eligibilityMetadata ?? { customerCategoryRefs: [], geographyRefs: [] },
    dependencies: draft.dependencies ?? [],
    documentationRefs: draft.documentationRefs ?? [],
    policyIds: draft.policyIds ?? [],
    workflowIds: draft.workflowIds ?? [],
    ruleIds: draft.ruleIds ?? [],
    decisionMatrixIds: draft.decisionMatrixIds ?? [],
    documentIds: draft.documentIds ?? [],
    compositionAssets: draft.compositionAssets ?? [],
    productOwner: draft.productOwner,
    createdBy: draft.createdBy,
    lastModified: now,
  };

  definitionsOverride = [...all, record];

  appendProductAuditEntry({
    productId,
    productName: record.productName,
    versionLabel: formatProductVersion(major, minor),
    actor: draft.createdBy,
    action: "Created product definition",
    field: "lifecycleStatus",
    oldValue: "",
    newValue: "draft",
  });

  void import("@/lib/enterprise-decision-ledger")
    .then((edl) =>
      edl.recordEnterpriseDecision({
        requestedBy: draft.createdBy,
        approvedBy: draft.createdBy,
        previousValue: null,
        newValue: {
          productCode: record.productCode,
          productName: record.productName,
          version: formatProductVersion(major, minor),
          lifecycleStatus: record.lifecycleStatus,
        },
        businessJustification: `Product definition draft created for ${record.productName} (${formatProductVersion(major, minor)}).`,
        effectiveFrom: now,
        versionNumber: formatProductVersion(major, minor),
        impactScope: "product",
        changeType: "created",
        changeCategory: "product_rules",
        relatedEngine: "Product Library",
        relatedEntityType: "product",
        relatedEntityId: productId,
        relatedEntityLabel: record.productName,
        notImpactedNote: "Future product publishes affect future transactions only unless an explicit migration is executed.",
      }),
    )
    .catch(() => undefined);

  notifyAtlasProductRegistration(record);
  return record;
}

function notifyAtlasProductRegistration(def: ProductDefinition): void {
  void import("@/lib/atlas/auto-registration")
    .then((m) => m.registerAtlasFromProduct?.(def))
    .catch(() => undefined);
}
