import { DEFAULT_ENTERPRISE_ASSET_AUDIT_TRAIL } from "@/data/catalyst-one/enterprise-assets/enterprise-asset-audit-seed";
import { DEFAULT_ENTERPRISE_ASSET_CATEGORIES } from "@/data/catalyst-one/enterprise-assets/asset-categories-seed";
import { DEFAULT_ENTERPRISE_ASSETS } from "@/data/catalyst-one/enterprise-assets/enterprise-assets-seed";
import {
  canTransitionEnterpriseAssetLifecycle,
  formatEnterpriseAssetVersion,
  isEnterpriseAssetPublished,
} from "@/constants/enterprise-asset-lifecycle";
import type {
  EnterpriseAsset,
  EnterpriseAssetAuditEntry,
  EnterpriseAssetCategory,
  EnterpriseAssetLibraryDashboardMetrics,
  EnterpriseAssetLifecycleStatus,
  EnterpriseAssetRegistryEntry,
  EnterpriseAssetRegistryFilters,
  EnterpriseAssetRegistrySortField,
} from "@/types/enterprise-asset-library";

let assetsOverride: EnterpriseAsset[] | null = null;
let categoriesOverride: EnterpriseAssetCategory[] | null = null;
let auditOverride: EnterpriseAssetAuditEntry[] | null = null;

export function resetEnterpriseAssetLibraryStore(): void {
  assetsOverride = null;
  categoriesOverride = null;
  auditOverride = null;
}

export function getAllEnterpriseAssets(): EnterpriseAsset[] {
  return assetsOverride ?? DEFAULT_ENTERPRISE_ASSETS;
}

export function getEnterpriseAssetCategories(): EnterpriseAssetCategory[] {
  return (categoriesOverride ?? DEFAULT_ENTERPRISE_ASSET_CATEGORIES)
    .filter((c) => c.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getAllEnterpriseAssetCategories(): EnterpriseAssetCategory[] {
  return (categoriesOverride ?? DEFAULT_ENTERPRISE_ASSET_CATEGORIES).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEnterpriseAssetCategoryById(id: string): EnterpriseAssetCategory | undefined {
  return getAllEnterpriseAssetCategories().find((c) => c.id === id);
}

export function getLatestEnterpriseAssets(): EnterpriseAsset[] {
  const byAsset = new Map<string, EnterpriseAsset>();
  for (const asset of getAllEnterpriseAssets()) {
    const existing = byAsset.get(asset.assetId);
    if (
      !existing ||
      asset.majorVersion > existing.majorVersion ||
      (asset.majorVersion === existing.majorVersion && asset.minorVersion > existing.minorVersion)
    ) {
      byAsset.set(asset.assetId, asset);
    }
  }
  return Array.from(byAsset.values()).sort((a, b) => a.assetName.localeCompare(b.assetName));
}

export function getEnterpriseAssetVersions(assetId: string): EnterpriseAsset[] {
  return getAllEnterpriseAssets()
    .filter((a) => a.assetId === assetId)
    .sort((a, b) => {
      if (b.majorVersion !== a.majorVersion) return b.majorVersion - a.majorVersion;
      return b.minorVersion - a.minorVersion;
    });
}

export function getEnterpriseAssetById(assetId: string): EnterpriseAsset | undefined {
  return getLatestEnterpriseAssets().find((a) => a.assetId === assetId);
}

export function getEnterpriseAssetVersionById(versionId: string): EnterpriseAsset | undefined {
  return getAllEnterpriseAssets().find((a) => a.id === versionId);
}

export function getEnterpriseAssetAuditTrail(): EnterpriseAssetAuditEntry[] {
  return auditOverride ?? DEFAULT_ENTERPRISE_ASSET_AUDIT_TRAIL;
}

export function appendEnterpriseAssetAuditEntry(
  entry: Omit<EnterpriseAssetAuditEntry, "id" | "timestamp"> & { timestamp?: string },
): EnterpriseAssetAuditEntry {
  const record: EnterpriseAssetAuditEntry = {
    ...entry,
    id: `eal_a_${Date.now()}`,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
  auditOverride = [record, ...getEnterpriseAssetAuditTrail()];
  return record;
}

export function getAuditTrailForEnterpriseAsset(assetId: string): EnterpriseAssetAuditEntry[] {
  return getEnterpriseAssetAuditTrail().filter((e) => e.assetId === assetId);
}

export function getEnterpriseAssetRegistry(): EnterpriseAssetRegistryEntry[] {
  return getLatestEnterpriseAssets().map((asset) => {
    const category = getEnterpriseAssetCategoryById(asset.categoryId);
    return {
      assetId: asset.assetId,
      assetCode: asset.assetCode,
      assetName: asset.assetName,
      assetType: asset.assetType,
      categoryName: category?.categoryName ?? asset.categoryId,
      versionLabel: formatEnterpriseAssetVersion(asset.majorVersion, asset.minorVersion),
      lifecycle: asset.lifecycle,
      status: asset.status,
      owner: asset.owner,
      tagCount: asset.tags.length,
      updatedDate: asset.updatedDate,
    };
  });
}

export function searchEnterpriseAssetRegistry(
  query: string,
  filters: EnterpriseAssetRegistryFilters = {},
  sortField: EnterpriseAssetRegistrySortField = "assetName",
  sortAsc = true,
): EnterpriseAssetRegistryEntry[] {
  const q = query.trim().toLowerCase();
  let results = getEnterpriseAssetRegistry();

  if (filters.assetType && filters.assetType !== "all") {
    results = results.filter((r) => r.assetType === filters.assetType);
  }
  if (filters.lifecycle && filters.lifecycle !== "all") {
    results = results.filter((r) => r.lifecycle === filters.lifecycle);
  }
  if (filters.categoryId && filters.categoryId !== "all") {
    const latest = getLatestEnterpriseAssets();
    const ids = new Set(
      latest.filter((a) => a.categoryId === filters.categoryId).map((a) => a.assetId),
    );
    results = results.filter((r) => ids.has(r.assetId));
  }

  if (q) {
    const latest = getLatestEnterpriseAssets();
    const matchingIds = new Set(
      latest
        .filter(
          (a) =>
            a.assetId.toLowerCase().includes(q) ||
            a.assetCode.toLowerCase().includes(q) ||
            a.assetName.toLowerCase().includes(q) ||
            a.assetType.toLowerCase().includes(q) ||
            a.tags.some((t) => t.toLowerCase().includes(q)) ||
            a.lifecycle.toLowerCase().includes(q) ||
            formatEnterpriseAssetVersion(a.majorVersion, a.minorVersion).toLowerCase().includes(q),
        )
        .map((a) => a.assetId),
    );
    results = results.filter(
      (r) =>
        matchingIds.has(r.assetId) ||
        r.categoryName.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q),
    );
  }

  results.sort((a, b) => {
    const av = a[sortField] ?? "";
    const bv = b[sortField] ?? "";
    const cmp = String(av).localeCompare(String(bv));
    return sortAsc ? cmp : -cmp;
  });

  return results;
}

export function getEnterpriseAssetLibraryDashboardMetrics(): EnterpriseAssetLibraryDashboardMetrics {
  const latest = getLatestEnterpriseAssets();
  const types = new Set(latest.map((a) => a.assetType));
  return {
    totalAssets: latest.length,
    publishedAssets: latest.filter((a) => isEnterpriseAssetPublished(a.lifecycle)).length,
    draftAssets: latest.filter((a) => a.lifecycle === "draft").length,
    categoryCount: getEnterpriseAssetCategories().length,
    assetTypeCount: types.size,
    deprecatedAssets: latest.filter((a) => a.lifecycle === "deprecated").length,
    pilotAssets: latest.filter((a) => a.status === "pilot").length,
    customTypeAssets: latest.filter((a) => a.assetType === "CUSTOM").length,
  };
}

export function getEnterpriseAssetsByLifecycle(lifecycle: EnterpriseAssetLifecycleStatus): EnterpriseAsset[] {
  return getLatestEnterpriseAssets().filter((a) => a.lifecycle === lifecycle);
}

export function transitionEnterpriseAssetLifecycle(
  assetId: string,
  to: EnterpriseAssetLifecycleStatus,
  actor: string,
): EnterpriseAsset | undefined {
  const all = [...getAllEnterpriseAssets()];
  const idx = all.findIndex((a) => a.assetId === assetId && a.lifecycle !== "archived");
  if (idx === -1) return undefined;

  const current = all[idx];
  if (!canTransitionEnterpriseAssetLifecycle(current.lifecycle, to)) return undefined;

  const now = new Date().toISOString();
  const updated: EnterpriseAsset = {
    ...current,
    lifecycle: to,
    updatedDate: now,
    ...(to === "approved" ? { approvedBy: actor } : {}),
    ...(to === "published" ? { publishedBy: actor, publishedDate: now, status: "active" as const } : {}),
  };
  all[idx] = updated;
  assetsOverride = all;

  const actionLabel =
    to === "published" ? "Published" : to === "archived" ? "Archived" : "Updated";

  appendEnterpriseAssetAuditEntry({
    assetId: current.assetId,
    assetName: current.assetName,
    versionLabel: formatEnterpriseAssetVersion(current.majorVersion, current.minorVersion),
    actor,
    action: actionLabel,
    field: "lifecycle",
    oldValue: current.lifecycle,
    newValue: to,
  });

  if (to === "published") {
    appendEnterpriseAssetAuditEntry({
      assetId: current.assetId,
      assetName: current.assetName,
      versionLabel: formatEnterpriseAssetVersion(updated.majorVersion, updated.minorVersion),
      actor,
      action: "Published",
      field: "version",
      oldValue: "",
      newValue: "snapshot",
    });
  }

  notifyAtlasEnterpriseAssetRegistration(updated);
  return updated;
}

function notifyAtlasEnterpriseAssetRegistration(asset: EnterpriseAsset): void {
  void import("@/lib/atlas/auto-registration")
    .then((m) => m.registerAtlasFromEnterpriseAsset?.(asset))
    .catch(() => undefined);
}
