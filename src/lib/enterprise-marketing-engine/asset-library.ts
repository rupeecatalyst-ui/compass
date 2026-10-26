/**
 * CO-MARKETING-REDESIGN-011 — Search and filters for the Marketing Asset Library.
 */

import type {
  MarketingAssetApprovalStatus,
  MarketingAssetProductCategory,
  MarketingAssetType,
} from "@/constants/enterprise-marketing-engine/assets";
import type { MarketingAssetRecord } from "@/types/enterprise-marketing-assets";

export type MarketingAssetLibraryQuery = {
  search?: string | null;
  assetType?: MarketingAssetType | "all" | null;
  productCategory?: MarketingAssetProductCategory | "all" | null;
  approvalStatus?: MarketingAssetApprovalStatus | "all" | null;
  includeArchived?: boolean;
};

export function filterMarketingAssetLibrary(
  assets: MarketingAssetRecord[],
  query: MarketingAssetLibraryQuery = {},
): MarketingAssetRecord[] {
  const search = (query.search ?? "").trim().toLowerCase();
  const type = query.assetType && query.assetType !== "all" ? query.assetType : null;
  const product =
    query.productCategory && query.productCategory !== "all" ? query.productCategory : null;
  const approval =
    query.approvalStatus && query.approvalStatus !== "all" ? query.approvalStatus : null;
  const includeArchived = query.includeArchived === true;

  return assets.filter((asset) => {
    if (!includeArchived && (asset.archived || !asset.active)) return false;
    if (type && asset.assetType !== type) return false;
    if (product && asset.productCategory !== product) return false;
    if (approval && asset.approvalStatus !== approval) return false;
    if (!search) return true;
    const haystack = [
      asset.name,
      asset.title,
      asset.assetType,
      asset.category,
      asset.productCategory,
      asset.altText,
      asset.mimeType,
      asset.rights?.sourceUrl,
      asset.rights?.license,
      asset.rights?.commercialEmail,
      asset.rights?.attribution,
      asset.rights?.restrictions,
      asset.rights?.evidenceReference,
      ...asset.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });
}

export function marketingAssetCollectionLabel(tags: readonly string[] | undefined): string {
  const found = (tags ?? []).find((tag) => tag.toLowerCase().startsWith("collection:"));
  if (!found) return "";
  const label = found.slice(found.indexOf(":") + 1).trim();
  return label;
}

export function filterApprovedMarketingPickerImages<
  T extends {
    name: string;
    title?: string;
    altText: string;
    productCategory: string;
    tags: string[];
    approvalStatus: string;
    archived: boolean;
    mimeType: string;
  },
>(
  assets: readonly T[],
  query: { search?: string; productCategory?: string | null; collection?: string | null } = {},
): T[] {
  const search = (query.search ?? "").trim().toLowerCase();
  const product =
    query.productCategory && query.productCategory !== "all" ? query.productCategory : "";
  const collection = query.collection && query.collection !== "all" ? query.collection : "";
  return assets.filter((asset) => {
    if (asset.approvalStatus !== "APPROVED" || asset.archived) return false;
    if (!asset.mimeType.startsWith("image/")) return false;
    if (product && asset.productCategory !== product) return false;
    if (collection && marketingAssetCollectionLabel(asset.tags) !== collection) return false;
    if (!search) return true;
    const haystack = [
      asset.name,
      asset.title,
      asset.altText,
      asset.productCategory,
      marketingAssetCollectionLabel(asset.tags),
      ...asset.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });
}
