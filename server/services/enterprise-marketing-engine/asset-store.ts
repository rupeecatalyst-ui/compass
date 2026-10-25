/**
 * CO-MARKETING-REDESIGN-011 — Marketing Asset Library store.
 * Organisation-scoped campaign collateral. Not Document Registry.
 * Fixture storage only — never Hostinger or an external provider put.
 * Prisma persists metadata + payload preview when ENTERPRISE_PERSISTENCE_MODE=prisma.
 */

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
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
  getMarketingAssetFixturePreview,
  putMarketingAssetFixture,
  resetMarketingAssetFixtureStorage,
} from "@/lib/enterprise-marketing-engine/asset-fixture-storage";
import {
  buildMarketingAssetPublicUrl,
  decodeMarketingAssetDataUrl,
  isMarketingAssetDataUrl,
} from "@/lib/enterprise-marketing-engine/asset-public-url";
import { marketingAssetRequiresAltText } from "@/lib/enterprise-marketing-engine/asset-alt-text";
import { collectMarketingAssetUsage } from "@/lib/enterprise-marketing-engine/asset-usage";
import { createMarketingScopedId } from "@/lib/enterprise-marketing-engine/scoped-id";
import type { MarketingAsset } from "@/types/enterprise-marketing-campaign";
import type { MarketingAssetVersion } from "@/types/enterprise-marketing-assets";
import type { MarketingContentDocument } from "@/types/enterprise-marketing-campaign";

const assets = new Map<string, MarketingAsset>();
const loadedOrgs = new Set<string>();

type AssetRow = {
  id: string;
  organizationId: string;
  name: string;
  title: string;
  assetType: string;
  category: string;
  mimeType: string;
  storageProvider: string;
  storageRef: string;
  previewUrl: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  uploadedByUserId: string | null;
  uploadedAt: Date;
  tagsJson: Prisma.JsonValue;
  productCategory: string;
  approvalStatus: string;
  altText: string;
  archived: boolean;
  currentVersionNumber: number;
  checksum: string;
  createdAt: Date;
  updatedAt: Date;
  versions?: VersionRow[];
};

type VersionRow = {
  id: string;
  organizationId: string;
  assetId: string;
  versionNumber: number;
  storageRef: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  altText: string;
  uploadedByUserId: string | null;
  uploadedAt: Date;
  checksum: string;
  createdAt: Date;
};

export type MarketingAssetPrismaDelegate = {
  findMany(args: {
    where: { organizationId: string };
    include?: { versions: true };
    orderBy?: { updatedAt: "desc" };
  }): Promise<AssetRow[]>;
  findFirst(args: {
    where: { id: string; organizationId?: string };
    include?: { versions: true };
  }): Promise<AssetRow | null>;
  findUnique(args: { where: { id: string }; include?: { versions: true } }): Promise<AssetRow | null>;
  upsert(args: { where: { id: string }; create: Omit<AssetRow, "versions">; update: Omit<AssetRow, "id" | "versions"> }): Promise<AssetRow>;
};

export type MarketingAssetVersionPrismaDelegate = {
  upsert(args: {
    where: { assetId_versionNumber: { assetId: string; versionNumber: number } };
    create: VersionRow;
    update: Omit<VersionRow, "id" | "assetId" | "versionNumber">;
  }): Promise<VersionRow>;
};

let testAssetDelegate: MarketingAssetPrismaDelegate | null = null;
let testVersionDelegate: MarketingAssetVersionPrismaDelegate | null = null;
let testForcePrisma = false;
let testPinnedMemory = false;

export function configureMarketingAssetStoreForTests(options: {
  prismaDelegate?: MarketingAssetPrismaDelegate | null;
  versionDelegate?: MarketingAssetVersionPrismaDelegate | null;
  forcePrisma?: boolean;
  pinMemory?: boolean;
}): void {
  testAssetDelegate = options.prismaDelegate ?? null;
  testVersionDelegate = options.versionDelegate ?? null;
  testForcePrisma = options.forcePrisma === true;
  testPinnedMemory = options.pinMemory === true;
}

function nowIso() {
  return new Date().toISOString();
}

function toIso(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

function usePrismaPersistence(): boolean {
  if (testPinnedMemory) return false;
  if (testAssetDelegate) return true;
  return testForcePrisma || isEnterprisePersistencePrisma();
}

function persistenceFailed(err: unknown): never {
  const message = err instanceof Error ? err.message : "Marketing asset persistence failed";
  throw Object.assign(new Error(message), {
    statusCode: 503,
    code: "ASSET_PERSISTENCE_FAILED",
    cause: err,
  });
}

function isBusinessError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  const status = (err as { statusCode?: number } | null)?.statusCode;
  return status === 400 || status === 403 || status === 404 || Boolean(code && code.startsWith("ASSET_"));
}

function assetTable(): MarketingAssetPrismaDelegate {
  if (testAssetDelegate) return testAssetDelegate;
  if (isEnterprisePersistencePrisma()) {
    return prisma.enterpriseMarketingAsset as unknown as MarketingAssetPrismaDelegate;
  }
  persistenceFailed(new Error("Marketing asset Prisma delegate is unavailable"));
}

function versionTable(): MarketingAssetVersionPrismaDelegate {
  if (testVersionDelegate) return testVersionDelegate;
  if (isEnterprisePersistencePrisma()) {
    return prisma.enterpriseMarketingAssetVersion as unknown as MarketingAssetVersionPrismaDelegate;
  }
  persistenceFailed(new Error("Marketing asset version Prisma delegate is unavailable"));
}

function withComputed(asset: MarketingAsset): MarketingAsset {
  const usageReferences = collectMarketingAssetUsage(asset);
  const url = emailSafeAssetUrl(asset);
  return {
    ...asset,
    url,
    name: asset.name || asset.title,
    title: asset.title || asset.name,
    fileSize: asset.byteSize,
    active: !asset.archived,
    usageReferences,
  };
}

function checksumOf(url: string): string {
  const decoded = decodeMarketingAssetDataUrl(url);
  const payload = decoded?.bytes ?? Buffer.from(url);
  return createHash("sha256").update(payload).digest("hex");
}

function payloadOf(asset: MarketingAsset): string {
  return getMarketingAssetFixturePreview(asset.storageRef) ?? asset.url;
}

function emailSafeAssetUrl(asset: Pick<MarketingAsset, "id" | "mimeType" | "url" | "checksum" | "storageRef">): string {
  const payload = getMarketingAssetFixturePreview(asset.storageRef) ?? asset.url;
  if (isMarketingVisualImageMime(asset.mimeType) && (isMarketingAssetDataUrl(payload) || payload.startsWith("fixture://"))) {
    return buildMarketingAssetPublicUrl(asset.id, asset.checksum);
  }
  if (isMarketingAssetDataUrl(asset.url)) {
    return isMarketingVisualImageMime(asset.mimeType)
      ? buildMarketingAssetPublicUrl(asset.id, asset.checksum)
      : "";
  }
  return asset.url;
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

function mapVersionRow(row: VersionRow): MarketingAssetVersion {
  return {
    versionNumber: row.versionNumber,
    storageRef: row.storageRef,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    altText: row.altText,
    uploadedByUserId: row.uploadedByUserId,
    uploadedAt: toIso(row.uploadedAt),
    checksum: row.checksum,
  };
}

function mapRow(row: AssetRow): MarketingAsset {
  const tags = Array.isArray(row.tagsJson) ? (row.tagsJson as string[]) : [];
  const versions = (row.versions ?? []).map(mapVersionRow).sort((a, b) => a.versionNumber - b.versionNumber);
  putMarketingAssetFixture(row.storageRef, row.previewUrl);
  const base: MarketingAsset = {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    title: row.title,
    assetType: row.assetType as MarketingAssetType,
    category: row.category as MarketingAssetCategory,
    mimeType: row.mimeType,
    storageProvider: MARKETING_ASSET_STORAGE_PROVIDER,
    storageRef: row.storageRef,
    url: row.previewUrl,
    byteSize: row.byteSize,
    fileSize: row.byteSize,
    width: row.width,
    height: row.height,
    uploadedByUserId: row.uploadedByUserId,
    uploadedAt: toIso(row.uploadedAt),
    tags,
    productCategory: row.productCategory as MarketingAssetProductCategory,
    approvalStatus: row.approvalStatus as MarketingAssetApprovalStatus,
    altText: row.altText,
    usageReferences: [],
    archived: row.archived,
    active: !row.archived,
    permissionScope: "ORG_MARKETING",
    currentVersionNumber: row.currentVersionNumber,
    versions,
    checksum: row.checksum,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
  base.url = emailSafeAssetUrl(base);
  return base;
}

function toRow(asset: MarketingAsset): Omit<AssetRow, "versions"> {
  return {
    id: asset.id,
    organizationId: asset.organizationId,
    name: asset.name,
    title: asset.title,
    assetType: asset.assetType,
    category: asset.category,
    mimeType: asset.mimeType,
    storageProvider: asset.storageProvider,
    storageRef: asset.storageRef,
    previewUrl: payloadOf(asset),
    byteSize: asset.byteSize,
    width: asset.width,
    height: asset.height,
    uploadedByUserId: asset.uploadedByUserId,
    uploadedAt: new Date(asset.uploadedAt),
    tagsJson: asset.tags as unknown as Prisma.JsonValue,
    productCategory: asset.productCategory,
    approvalStatus: asset.approvalStatus,
    altText: asset.altText,
    archived: asset.archived,
    currentVersionNumber: asset.currentVersionNumber,
    checksum: asset.checksum,
    createdAt: new Date(asset.createdAt),
    updatedAt: new Date(asset.updatedAt),
  };
}

function versionRow(asset: MarketingAsset, version: MarketingAssetVersion): VersionRow {
  return {
    id: `${asset.id}-v${version.versionNumber}`,
    organizationId: asset.organizationId,
    assetId: asset.id,
    versionNumber: version.versionNumber,
    storageRef: version.storageRef,
    mimeType: version.mimeType,
    byteSize: version.byteSize,
    width: version.width,
    height: version.height,
    altText: version.altText,
    uploadedByUserId: version.uploadedByUserId,
    uploadedAt: new Date(version.uploadedAt),
    checksum: version.checksum,
    createdAt: new Date(version.uploadedAt),
  };
}

async function ensureOrgLoaded(organizationId: string): Promise<void> {
  if (!usePrismaPersistence()) return;
  if (loadedOrgs.has(organizationId)) return;
  try {
    const rows = await assetTable().findMany({
      where: { organizationId },
      include: { versions: true },
      orderBy: { updatedAt: "desc" },
    });
    for (const row of rows) {
      assets.set(row.id, mapRow(row));
    }
    loadedOrgs.add(organizationId);
  } catch (err) {
    if (isBusinessError(err)) throw err;
    persistenceFailed(err);
  }
}

async function persistAsset(asset: MarketingAsset): Promise<void> {
  if (!usePrismaPersistence()) return;
  try {
    const row = toRow(asset);
    const { id: assetRowId, ...update } = row;
    await assetTable().upsert({
      where: { id: assetRowId },
      create: row,
      update,
    });
    const table = versionTable();
    for (const version of asset.versions) {
      const next = versionRow(asset, version);
      await table.upsert({
        where: { assetId_versionNumber: { assetId: asset.id, versionNumber: version.versionNumber } },
        create: next,
        update: {
          organizationId: next.organizationId,
          storageRef: next.storageRef,
          mimeType: next.mimeType,
          byteSize: next.byteSize,
          width: next.width,
          height: next.height,
          altText: next.altText,
          uploadedByUserId: next.uploadedByUserId,
          uploadedAt: next.uploadedAt,
          checksum: next.checksum,
          createdAt: next.createdAt,
        },
      });
    }
  } catch (err) {
    if (isBusinessError(err)) throw err;
    persistenceFailed(err);
  }
}

function remember(asset: MarketingAsset): MarketingAsset {
  assets.set(asset.id, asset);
  return withComputed(asset);
}

export const marketingAssetStore = {
  async list(
    organizationId: string,
    opts?: { includeArchived?: boolean },
  ): Promise<MarketingAsset[]> {
    const org = requireOrg(organizationId);
    await ensureOrgLoaded(org);
    return [...assets.values()]
      .filter((a) => a.organizationId === org)
      .filter((a) => (opts?.includeArchived ? true : a.active))
      .map(withComputed)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async getForOrg(id: string, organizationId: string): Promise<MarketingAsset | null> {
    const org = requireOrg(organizationId);
    await ensureOrgLoaded(org);
    const a = assets.get(id);
    if (!a || a.organizationId !== org) return null;
    return withComputed(a);
  },

  async hydrateContentUrls(
    doc: MarketingContentDocument,
    organizationId: string,
  ): Promise<MarketingContentDocument> {
    const org = requireOrg(organizationId);
    await ensureOrgLoaded(org);
    return {
      version: 1,
      blocks: doc.blocks.map((block) => {
        const props = { ...block.props };
        const assetId = typeof props.assetId === "string" ? props.assetId.trim() : "";
        const url = typeof props.url === "string" ? props.url.trim() : "";
        if (!assetId) return { ...block, props };
        const needsHydrate =
          !url || isMarketingAssetDataUrl(url) || url.startsWith("fixture://");
        if (!needsHydrate) return { ...block, props };
        const asset = assets.get(assetId);
        if (!asset || asset.organizationId !== org) return { ...block, props };
        const safe = emailSafeAssetUrl(asset);
        if (!safe || isMarketingAssetDataUrl(safe)) return { ...block, props };
        return { ...block, props: { ...props, url: safe } };
      }),
    };
  },

  async getPublicImage(
    assetId: string,
    checksum: string | null,
  ): Promise<{ mimeType: string; bytes: Buffer } | null> {
    const id = assetId.trim();
    const expected = (checksum ?? "").trim();
    if (!id || !expected) return null;
    let asset = assets.get(id) ?? null;
    if (!asset && usePrismaPersistence()) {
      try {
        const row = await assetTable().findUnique({ where: { id }, include: { versions: true } });
        if (row) {
          asset = mapRow(row);
          assets.set(asset.id, asset);
        }
      } catch (err) {
        if (isBusinessError(err)) throw err;
        persistenceFailed(err);
      }
    }
    if (!asset) return null;
    if (asset.approvalStatus !== "APPROVED") return null;
    if (asset.archived || asset.active === false) return null;
    if (asset.checksum !== expected) return null;
    if (!isMarketingVisualImageMime(asset.mimeType)) return null;
    const payload = payloadOf(asset);
    if (isMarketingAssetDataUrl(payload)) {
      const decoded = decodeMarketingAssetDataUrl(payload);
      if (!decoded) return null;
      if (!isMarketingVisualImageMime(decoded.mimeType) && decoded.mimeType !== asset.mimeType) {
        return null;
      }
      return { mimeType: asset.mimeType, bytes: decoded.bytes };
    }
    return null;
  },

  async upsert(input: {
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
  }): Promise<MarketingAsset> {
    const organizationId = requireOrg(input.organizationId);
    await ensureOrgLoaded(organizationId);
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
    const prevPayload = prev ? payloadOf(prev) : "";
    const versionNumber = prev ? prev.currentVersionNumber + (prevPayload !== input.url ? 1 : 0) : 1;
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
      uploadedAt: prev && prevPayload === input.url ? prev.uploadedAt : ts,
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
    if (!prev || prevPayload !== input.url) {
      nextBase.versions = [...(prev?.versions ?? []), versionFromAsset(nextBase)];
    } else {
      nextBase.versions = prev.versions;
      nextBase.currentVersionNumber = prev.currentVersionNumber;
      nextBase.storageRef = prev.storageRef;
    }
    nextBase.url = emailSafeAssetUrl(nextBase);
    const remembered = remember(nextBase);
    await persistAsset(nextBase);
    return remembered;
  },

  async replace(
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
  ): Promise<MarketingAsset> {
    const prev = await this.getForOrg(id, organizationId);
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

  async setApproval(
    id: string,
    organizationId: string,
    approvalStatus: MarketingAssetApprovalStatus,
  ): Promise<MarketingAsset> {
    const a = await this.getForOrg(id, organizationId);
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
    const remembered = remember(next);
    await persistAsset(next);
    return remembered;
  },

  async setAltText(id: string, organizationId: string, altText: string): Promise<MarketingAsset> {
    const a = await this.getForOrg(id, organizationId);
    if (!a) {
      throw Object.assign(new Error("Asset not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const next = { ...a, altText: altText.trim(), updatedAt: nowIso() };
    const remembered = remember(next);
    await persistAsset(next);
    return remembered;
  },

  async archive(id: string, organizationId: string): Promise<MarketingAsset> {
    const a = await this.getForOrg(id, organizationId);
    if (!a) {
      throw Object.assign(new Error("Asset not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const next = { ...a, archived: true, active: false, updatedAt: nowIso() };
    const remembered = remember(next);
    await persistAsset(next);
    return remembered;
  },

  async setActive(id: string, organizationId: string, active: boolean): Promise<MarketingAsset> {
    const a = await this.getForOrg(id, organizationId);
    if (!a) {
      throw Object.assign(new Error("Asset not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const next = { ...a, archived: !active, active, updatedAt: nowIso() };
    const remembered = remember(next);
    await persistAsset(next);
    return remembered;
  },

  reset(): void {
    assets.clear();
    loadedOrgs.clear();
    resetMarketingAssetFixtureStorage();
  },
};
