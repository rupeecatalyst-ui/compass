/**
 * ATLAS Store — design-time enterprise asset catalog.
 * Lazy-loaded by admin UI only. Never imported on business transaction paths.
 */

import {
  DEFAULT_ATLAS_ASSETS,
  DEFAULT_ATLAS_TIMELINE,
} from "@/data/catalyst-one/atlas/atlas-seed";
import { evaluateArtifactCompliance } from "@/lib/enterprise-architecture/compliance-engine";
import { generateEnterpriseId } from "@/lib/enterprise-architecture/id-generator";
import {
  ASSET_TYPE_PREFIX_MAP,
  deriveComplianceStatus,
} from "@/constants/atlas";
import type {
  ArchitectureMetrics,
  ArchitectureTimelineEntry,
  AtlasAssetSearchFilters,
  AtlasAssetSearchResult,
  AtlasRegistrationInput,
  EnterpriseAsset,
  EnterpriseAssetType,
} from "@/types/atlas";
import type { EnterpriseArchitectureMetadata } from "@/types/enterprise-architecture";

let assetsOverride: EnterpriseAsset[] | null = null;
let timelineOverride: ArchitectureTimelineEntry[] | null = null;

const DEFAULT_ARCHITECTURE_METADATA: EnterpriseArchitectureMetadata = {
  metadataDriven: true,
  versionControlled: true,
  auditEnabled: false,
  permissionModelDefined: false,
  apiRegistered: false,
  eventsRegistered: false,
  configurationDriven: true,
  reusable: true,
  performanceBudgetDefined: false,
  noHardcodedBusinessLogic: true,
};

export function setAtlasAssets(assets: EnterpriseAsset[]): void {
  assetsOverride = assets;
}

export function setAtlasTimeline(entries: ArchitectureTimelineEntry[]): void {
  timelineOverride = entries;
}

export function resetAtlasStore(): void {
  assetsOverride = null;
  timelineOverride = null;
}

export function getAtlasAssets(): EnterpriseAsset[] {
  return assetsOverride ?? DEFAULT_ATLAS_ASSETS;
}

export function getAtlasAssetById(enterpriseId: string): EnterpriseAsset | undefined {
  return getAtlasAssets().find((a) => a.enterpriseId === enterpriseId);
}

export function getAtlasAssetByPlatformRef(
  module: string,
  refId: string,
): EnterpriseAsset | undefined {
  return getAtlasAssets().find(
    (a) => a.platformRef?.module === module && a.platformRef?.refId === refId,
  );
}

export function getAssetTimeline(enterpriseId: string): ArchitectureTimelineEntry[] {
  return (timelineOverride ?? DEFAULT_ATLAS_TIMELINE)
    .filter((e) => e.enterpriseId === enterpriseId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function appendTimelineEntry(
  entry: Omit<ArchitectureTimelineEntry, "id">,
): ArchitectureTimelineEntry {
  const record: ArchitectureTimelineEntry = {
    ...entry,
    id: `atl_tl_${Date.now()}`,
  };
  const current = timelineOverride ?? [...DEFAULT_ATLAS_TIMELINE];
  timelineOverride = [record, ...current];
  return record;
}

/**
 * Automatic registration — invoked when platform artifacts are created/updated.
 * Design-time only. No runtime transaction impact.
 */
export function registerAtlasAsset(input: AtlasRegistrationInput): EnterpriseAsset {
  const now = new Date().toISOString();
  const existing = getAtlasAssetByPlatformRef(input.platformRef.module, input.platformRef.refId);

  const architectureMetadata: EnterpriseArchitectureMetadata = {
    ...DEFAULT_ARCHITECTURE_METADATA,
    ...input.architectureMetadata,
  };

  if (existing) {
    const compliance = evaluateArtifactCompliance({
      enterpriseId: existing.enterpriseId,
      name: input.name,
      type: input.assetType,
      parentId: input.parentAssetId ?? existing.parentAssetId,
      owner: input.owner,
      status: input.status,
      version: input.version,
      description: input.description,
      createdDate: existing.createdDate,
      modifiedDate: now,
      documentationStatus: input.documentationStatus ?? existing.documentationStatus,
      complianceScore: 0,
      performanceBudgetId: input.performanceBudgetRef?.id ?? existing.performanceBudgetRef?.id ?? null,
      architectureMetadata,
      atlasId: existing.enterpriseId,
      sageId: null,
      forgeId: null,
    });

    const updated: EnterpriseAsset = {
      ...existing,
      name: input.name,
      category: input.category,
      description: input.description,
      module: input.module,
      owner: input.owner,
      version: input.version,
      status: input.status,
      modifiedDate: now,
      documentationStatus: input.documentationStatus ?? existing.documentationStatus,
      complianceScore: compliance.overallScore,
      complianceStatus: deriveComplianceStatus(compliance.overallScore),
      performanceBudgetRef: input.performanceBudgetRef ?? existing.performanceBudgetRef,
      parentAssetId: input.parentAssetId ?? existing.parentAssetId,
      architectureMetadata,
      versionHistory: [
        { version: input.version, status: input.status, modifiedDate: now, actor: input.actor },
        ...existing.versionHistory.filter((v) => v.version !== input.version),
      ],
    };

    const all = getAtlasAssets().map((a) =>
      a.enterpriseId === existing.enterpriseId ? updated : a,
    );
    assetsOverride = all;

    appendTimelineEntry({
      enterpriseId: updated.enterpriseId,
      action: input.timelineAction ?? "updated",
      actor: input.actor ?? input.owner,
      timestamp: now,
      version: input.version,
    });

    return updated;
  }

  const prefix = ASSET_TYPE_PREFIX_MAP[input.assetType];
  const enterpriseId = input.enterpriseId ?? generateEnterpriseId(prefix);

  const compliance = evaluateArtifactCompliance({
    enterpriseId,
    name: input.name,
    type: input.assetType,
    parentId: input.parentAssetId ?? null,
    owner: input.owner,
    status: input.status,
    version: input.version,
    description: input.description,
    createdDate: now,
    modifiedDate: now,
    documentationStatus: input.documentationStatus ?? "no_documentation",
    complianceScore: 0,
    performanceBudgetId: input.performanceBudgetRef?.id ?? null,
    architectureMetadata,
    atlasId: enterpriseId,
    sageId: null,
    forgeId: null,
  });

  const asset: EnterpriseAsset = {
    enterpriseId,
    name: input.name,
    assetType: input.assetType,
    category: input.category,
    description: input.description,
    module: input.module,
    owner: input.owner,
    version: input.version,
    status: input.status,
    createdDate: now,
    modifiedDate: now,
    documentationStatus: input.documentationStatus ?? "no_documentation",
    complianceScore: input.complianceScore ?? compliance.overallScore,
    complianceStatus: deriveComplianceStatus(input.complianceScore ?? compliance.overallScore),
    performanceBudgetRef: input.performanceBudgetRef ?? null,
    parentAssetId: input.parentAssetId ?? null,
    architectureMetadata,
    platformRef: input.platformRef,
    versionHistory: [{ version: input.version, status: input.status, modifiedDate: now, actor: input.actor }],
  };

  assetsOverride = [...getAtlasAssets(), asset];

  appendTimelineEntry({
    enterpriseId,
    action: input.timelineAction ?? "created",
    actor: input.actor ?? input.owner,
    timestamp: now,
    version: input.version,
  });

  return asset;
}

export function getArchitectureMetrics(): ArchitectureMetrics {
  const assets = getAtlasAssets();
  const assetsByType: Partial<Record<EnterpriseAssetType, number>> = {};

  for (const asset of assets) {
    assetsByType[asset.assetType] = (assetsByType[asset.assetType] ?? 0) + 1;
  }

  const published = assets.filter((a) => a.documentationStatus === "published").length;
  const draft = assets.filter((a) =>
    a.status === "development" || a.status === "design" || a.status === "planned",
  ).length;
  const deprecated = assets.filter((a) => a.status === "deprecated" || a.status === "retired").length;
  const withDocs = assets.filter((a) => a.documentationStatus === "published" || a.documentationStatus === "review").length;
  const withBudget = assets.filter((a) => a.performanceBudgetRef !== null).length;
  const avgCompliance =
    assets.length > 0
      ? Math.round(assets.reduce((s, a) => s + a.complianceScore, 0) / assets.length)
      : 0;

  return {
    totalAssets: assets.length,
    assetsByType,
    publishedAssets: published,
    draftAssets: draft,
    deprecatedAssets: deprecated,
    averageComplianceScore: avgCompliance,
    documentationCoverage: assets.length > 0 ? Math.round((withDocs / assets.length) * 100) : 0,
    performanceBudgetCoverage: assets.length > 0 ? Math.round((withBudget / assets.length) * 100) : 0,
  };
}

export function searchAtlasAssets(
  filters: AtlasAssetSearchFilters,
  page = 1,
  pageSize = 12,
  sortBy: "name" | "modifiedDate" | "complianceScore" = "modifiedDate",
  sortDir: "asc" | "desc" = "desc",
): AtlasAssetSearchResult {
  let results = [...getAtlasAssets()];

  const q = filters.query?.trim().toLowerCase();
  if (q) {
    results = results.filter(
      (a) =>
        a.enterpriseId.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.owner.toLowerCase().includes(q) ||
        a.module.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }

  if (filters.assetType && filters.assetType !== "all") {
    results = results.filter((a) => a.assetType === filters.assetType);
  }
  if (filters.module && filters.module !== "all") {
    results = results.filter((a) => a.module === filters.module);
  }
  if (filters.owner && filters.owner !== "all") {
    results = results.filter((a) => a.owner === filters.owner);
  }
  if (filters.status && filters.status !== "all") {
    results = results.filter((a) => a.status === filters.status);
  }
  if (filters.category && filters.category !== "all") {
    results = results.filter((a) => a.category === filters.category);
  }
  if (filters.version?.trim()) {
    const v = filters.version.trim().toLowerCase();
    results = results.filter((a) => a.version.toLowerCase().includes(v));
  }

  results.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") cmp = a.name.localeCompare(b.name);
    else if (sortBy === "complianceScore") cmp = a.complianceScore - b.complianceScore;
    else cmp = a.modifiedDate.localeCompare(b.modifiedDate);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: results.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function getAtlasFilterOptions(): {
  modules: string[];
  owners: string[];
  categories: string[];
} {
  const assets = getAtlasAssets();
  return {
    modules: [...new Set(assets.map((a) => a.module))].sort(),
    owners: [...new Set(assets.map((a) => a.owner))].sort(),
    categories: [...new Set(assets.map((a) => a.category))].sort(),
  };
}
