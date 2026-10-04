/**
 * CO-MARKETING-REDESIGN-011 — Marketing Asset Library store.
 * Organisation-scoped campaign collateral. Not Document Registry.
 * Fixture storage only — never Hostinger or an external provider put.
 */

import { createHash } from "node:crypto";
import {
  MARKETING_ASSET_MAX_BYTES,
  type MarketingAssetCategory,
} from "@/constants/enterprise-marketing-engine/content";
import type {
  MarketingAssetApprovalStatus,
  MarketingAssetProductCategory,
  MarketingAssetType,
} from "@/constants/enterprise-marketing-engine/assets";
import { MARKETING_ASSET_STORAGE_PROVIDER } from "@/constants/enterprise-marketing-engine/assets";
import { assessMarketingImageAsset } from "@/lib/enterprise-marketing-engine/asset-optimize";
import {
  assertSafeMarketingAssetUpload,
  inferMarketingAssetCategory,
  inferMarketingAssetType,
  isMarketingVisualImageMime,
} from "@/lib/enterprise-marketing-engine/asset-mime";
import {
  assertMarketingAssetStaysOnFixture,
  buildMarketingAssetFixtureRef,
  putMarketingAssetFixture,
  resetMarketingAssetFixtureStorage,
} from "@/lib/enterprise-marketing-engine/asset-fixture-storage";
import { marketingAssetRequiresAltText } from "@/lib/enterprise-marketing-engine/asset-alt-text";
import { collectMarketingAssetUsage } from "@/lib/enterprise-marketing-engine/asset-usage";
import { createMarketingScopedId } from "@/lib/enterprise-marketing-engine/scoped-id";
import type { MarketingAsset } from "@/types/enterprise-marketing-campaign";
import type { MarketingAssetVersion } from "@/types/enterprise-marketing-assets";

const assets = new Map<string, MarketingAsset>();

function nowIso() {
  return new Date().toISOString();
}

function withComputed(asset: MarketingAsset): MarketingAsset {
  const usageReferences = collectMarketingAssetUsage(asset);
  return {
    ...asset,
    name: asset.name || asset.title,
    title: asset.title || asset.name,
    fileSize: asset.byteSize,
    active: !asset.archived,
    usageReferences,
  };
}

function checksumOf(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function requireOrg(organizationId: string): string {
  const trimmed = organizationId.trim();
  if (!trimmed || trimmed === "default") {
    throw Object.assign(new Error("Marketing requires an authenticated organization"), {
      statusCode: 400,
      code: "ORGANIZATION_REQUIRED",
    });
  }
  return trimmed;
}

function assertPreviewUrl(url: string): void {
  assertMarketingAssetStaysOnFixture(url);
  if (url.includes("hostinger")) {
    throw Object.assign(
      new Error("Marketing assets must use local fixture storage — Hostinger upload is forbidden"),
      { statusCode: 400, code: "ASSET_EXTERNAL_UPLOAD_FORBIDDEN" },
    );
  }
  if (!url.startsWith("data:") && !url.startsWith("https://") && !url.startsWith("fixture://")) {
    throw Object.assign(new Error("Asset url must be https://, data: URL, or fixture reference"), {
      statusCode: 400,
      code: "INVALID_ASSET_URL",
    });
  }
}

function versionFromAsset(asset: MarketingAsset): MarketingAssetVersion {
  return {
    versionNumber: asset.currentVersionNumber,
    storageRef: asset.storageRef,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    width: asset.width,
    height: asset.height,
    altText: asset.altText,
    uploadedByUserId: asset.uploadedByUserId,
    uploadedAt: asset.uploadedAt,
    checksum: asset.checksum,
  };
}

export const marketingAssetStore = {
  list(
    organizationId: string,
    opts?: { includeArchived?: boolean },
  ): MarketingAsset[] {
    const org = requireOrg(organizationId);
    return [...assets.values()]
      .filter((a) => a.organizationId === org)
      .filter((a) => (opts?.includeArchived ? true : a.active))
      .map(withComputed)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  getForOrg(id: string, organizationId: string): MarketingAsset | null {
    const org = requireOrg(organizationId);
    const a = assets.get(id);
    if (!a || a.organizationId !== org) return null;
    return withComputed(a);
  },

  upsert(input: {
    id?: string;
    organizationId: string;
    title: string;
    mimeType: string;
    category: MarketingAssetCategory;
    tags?: string[];
    url: string;
    byteSize: number;
    checksum?: string;
    active?: boolean;
    assetType?: MarketingAssetType | string | null;
    name?: string;
    altText?: string | null;
    productCategory?: MarketingAssetProductCategory | string | null;
    approvalStatus?: MarketingAssetApprovalStatus | null;
    width?: number | null;
    height?: number | null;
    uploadedByUserId?: string | null;
    filename?: string | null;
  }): MarketingAsset {
    const organizationId = requireOrg(input.organizationId);
    if (input.byteSize > MARKETING_ASSET_MAX_BYTES) {
      throw Object.assign(
        new Error(`Asset exceeds max size of ${MARKETING_ASSET_MAX_BYTES} bytes`),
        { statusCode: 400, code: "ASSET_TOO_LARGE" },
      );
    }
    const mimeType = assertSafeMarketingAssetUpload({
      mimeType: input.mimeType,
      filename: input.filename,
    });
    assertPreviewUrl(input.url);
    const ts = nowIso();
    const id = createMarketingScopedId("mkt-asset", organizationId, input.id);
    const prev = assets.get(id);
    if (prev && prev.organizationId !== organizationId) {
      throw Object.assign(new Error("Asset belongs to another organization"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    const checksum = input.checksum ?? checksumOf(input.url);
    const assessment = isMarketingVisualImageMime(mimeType)
      ? assessMarketingImageAsset({
          mimeType,
          byteSize: input.byteSize,
          url: input.url,
        })
      : {
          suggestedMaxWidth: null as number | null,
          warnings: [] as string[],
        };
    const archived =
      input.active === false ? true : input.active === true ? false : (prev?.archived ?? false);
    const assetType = inferMarketingAssetType({
      assetType: input.assetType,
      category: input.category,
      mimeType,
    });
    const category = inferMarketingAssetCategory(assetType, input.category);
    const name = (input.name ?? input.title).trim() || "Untitled asset";
    const altText = (input.altText ?? prev?.altText ?? "").trim();
    const productCategory = (input.productCategory?.trim() ||
      prev?.productCategory ||
      "Unspecified") as MarketingAssetProductCategory;
    const versionNumber = prev ? prev.currentVersionNumber + (prev.url !== input.url ? 1 : 0) : 1;
    const storageRef = buildMarketingAssetFixtureRef({
      organizationId,
      assetId: id,
      versionNumber,
    });
    putMarketingAssetFixture(storageRef, input.url);
    const nextBase: MarketingAsset = {
      id,
      organizationId,
      name,
      title: name,
      assetType,
      category,
      mimeType,
      storageProvider: MARKETING_ASSET_STORAGE_PROVIDER,
      storageRef,
      url: input.url,
      byteSize: input.byteSize,
      fileSize: input.byteSize,
      width: input.width ?? prev?.width ?? null,
      height: input.height ?? prev?.height ?? null,
      uploadedByUserId: input.uploadedByUserId ?? prev?.uploadedByUserId ?? null,
      uploadedAt: prev && prev.url === input.url ? prev.uploadedAt : ts,
      tags: input.tags ?? prev?.tags ?? [],
      productCategory,
      approvalStatus: input.approvalStatus ?? prev?.approvalStatus ?? "DRAFT",
      altText,
      usageReferences: [],
      archived,
      active: !archived,
      permissionScope: "ORG_MARKETING",
      currentVersionNumber: versionNumber,
      versions: prev?.versions ?? [],
      checksum,
      suggestedMaxWidth: assessment.suggestedMaxWidth,
      optimizationWarnings: assessment.warnings,
      createdAt: prev?.createdAt ?? ts,
      updatedAt: ts,
    };
    if (!prev || prev.url !== input.url) {
      nextBase.versions = [...(prev?.versions ?? []), versionFromAsset(nextBase)];
    } else {
      nextBase.versions = prev.versions;
      nextBase.currentVersionNumber = prev.currentVersionNumber;
      nextBase.storageRef = prev.storageRef;
    }
    assets.set(id, nextBase);
    return withComputed(nextBase);
  },

  replace(
    id: string,
    organizationId: string,
    input: {
      url: string;
      mimeType: string;
      byteSize: number;
      altText?: string | null;
      width?: number | null;
      height?: number | null;
      uploadedByUserId?: string | null;
      filename?: string | null;
    },
  ): MarketingAsset {
    const prev = this.getForOrg(id, organizationId);
    if (!prev) {
      throw Object.assign(new Error("Asset not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    return this.upsert({
      id,
      organizationId,
      title: prev.title,
      name: prev.name,
      mimeType: input.mimeType,
      category: prev.category,
      assetType: prev.assetType,
      tags: prev.tags,
      url: input.url,
      byteSize: input.byteSize,
      altText: input.altText ?? prev.altText,
      productCategory: prev.productCategory,
      approvalStatus: prev.approvalStatus,
      width: input.width ?? prev.width,
      height: input.height ?? prev.height,
      uploadedByUserId: input.uploadedByUserId ?? prev.uploadedByUserId,
      filename: input.filename,
      active: prev.active,
    });
  },

  setApproval(
    id: string,
    organizationId: string,
    approvalStatus: MarketingAssetApprovalStatus,
  ): MarketingAsset {
    const a = this.getForOrg(id, organizationId);
    if (!a) {
      throw Object.assign(new Error("Asset not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    if (
      approvalStatus === "APPROVED" &&
      marketingAssetRequiresAltText(a.mimeType) &&
      !a.altText.trim()
    ) {
      throw Object.assign(
        new Error("Images require accessibility alt text before campaign approval"),
        { statusCode: 400, code: "ASSET_ALT_TEXT_REQUIRED" },
      );
    }
    const next = { ...a, approvalStatus, updatedAt: nowIso() };
    assets.set(id, next);
    return withComputed(next);
  },

  setAltText(id: string, organizationId: string, altText: string): MarketingAsset {
    const a = this.getForOrg(id, organizationId);
    if (!a) {
      throw Object.assign(new Error("Asset not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const next = { ...a, altText: altText.trim(), updatedAt: nowIso() };
    assets.set(id, next);
    return withComputed(next);
  },

  archive(id: string, organizationId: string): MarketingAsset {
    const a = this.getForOrg(id, organizationId);
    if (!a) {
      throw Object.assign(new Error("Asset not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const next = { ...a, archived: true, active: false, updatedAt: nowIso() };
    assets.set(id, next);
    return withComputed(next);
  },

  setActive(id: string, organizationId: string, active: boolean): MarketingAsset {
    const a = this.getForOrg(id, organizationId);
    if (!a) {
      throw Object.assign(new Error("Asset not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const next = { ...a, archived: !active, active, updatedAt: nowIso() };
    assets.set(id, next);
    return withComputed(next);
  },

  reset(): void {
    assets.clear();
    resetMarketingAssetFixtureStorage();
  },
};
