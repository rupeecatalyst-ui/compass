/**
 * CO-MARKETING-REDESIGN-011 — Marketing Asset Library service.
 * Organisation-scoped campaign collateral. Separate from operational Document Registry.
 * Fixture storage only. No Hostinger / external provider upload. No live send.
 */

import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_ASSET_MAX_BYTES,
  type MarketingAssetCategory,
} from "@/constants/enterprise-marketing-engine/content";
import type {
  MarketingAssetApprovalStatus,
  MarketingAssetProductCategory,
  MarketingAssetType,
} from "@/constants/enterprise-marketing-engine/assets";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { assertMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import { filterMarketingAssetLibrary } from "@/lib/enterprise-marketing-engine/asset-library";
import { forbidDestructiveMarketingAssetDelete } from "@/lib/enterprise-marketing-engine/asset-usage";
import { recordMarketingAuditEvent } from "./audit";
import { marketingAssetStore } from "./asset-store";
import type { MarketingAssetSelectPayload } from "@/types/enterprise-marketing-assets";

type Actor = {
  userId?: string;
  role?: string;
  organizationId?: string | null;
  marketingPermissions?: string[];
};

function orgId(actorOrg?: string | null) {
  const trimmed = (actorOrg ?? "").trim();
  if (!trimmed || trimmed === "default") {
    throw Object.assign(new Error("Marketing requires an authenticated organization"), {
      statusCode: 400,
      code: "ORGANIZATION_REQUIRED",
    });
  }
  return trimmed;
}

function assertNoSend() {
  void ENTERPRISE_MARKETING_EXECUTION_ENABLED;
}

export const marketingAssetService = {
  list(
    actor: Actor,
    opts?:
      | boolean
      | {
          includeArchived?: boolean;
          search?: string | null;
          assetType?: MarketingAssetType | "all" | null;
          productCategory?: MarketingAssetProductCategory | "all" | null;
          approvalStatus?: MarketingAssetApprovalStatus | "all" | null;
        },
  ) {
    assertNoSend();
    const organizationId = orgId(actor.organizationId);
    const includeArchived = typeof opts === "boolean" ? opts : opts?.includeArchived === true;
    const query = typeof opts === "boolean" || !opts ? {} : opts;
    const assets = marketingAssetStore.list(organizationId, { includeArchived });
    return filterMarketingAssetLibrary(assets, {
      includeArchived,
      search: query.search,
      assetType: query.assetType,
      productCategory: query.productCategory,
      approvalStatus: query.approvalStatus,
    });
  },

  get(actor: Actor, assetId: string) {
    assertNoSend();
    const organizationId = orgId(actor.organizationId);
    const asset = marketingAssetStore.getForOrg(assetId, organizationId);
    if (!asset) {
      throw Object.assign(new Error("Asset not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    return asset;
  },

  upload(
    actor: Actor,
    input: {
      title: string;
      mimeType: string;
      category: MarketingAssetCategory;
      tags?: string[];
      /** data URL, https reference, or fixture preview — never a Hostinger put. */
      url: string;
      byteSize?: number;
      assetType?: MarketingAssetType | string | null;
      name?: string;
      altText?: string | null;
      productCategory?: MarketingAssetProductCategory | string | null;
      width?: number | null;
      height?: number | null;
      filename?: string | null;
    },
  ) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ASSET_MANAGE);
    const organizationId = orgId(actor.organizationId);
    const byteSize = input.byteSize ?? Buffer.byteLength(input.url, "utf8");
    if (byteSize > MARKETING_ASSET_MAX_BYTES) {
      throw Object.assign(
        new Error(`Asset exceeds max size of ${MARKETING_ASSET_MAX_BYTES} bytes`),
        { statusCode: 400, code: "ASSET_TOO_LARGE" },
      );
    }
    const asset = marketingAssetStore.upsert({
      organizationId,
      title: input.title,
      name: input.name ?? input.title,
      mimeType: input.mimeType,
      category: input.category,
      assetType: input.assetType,
      tags: input.tags,
      url: input.url,
      byteSize,
      altText: input.altText,
      productCategory: input.productCategory,
      width: input.width,
      height: input.height,
      uploadedByUserId: actor.userId ?? null,
      filename: input.filename,
    });
    recordMarketingAuditEvent({
      kind: "asset.upload",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { assetId: asset.id, storageRef: asset.storageRef, storageProvider: asset.storageProvider },
    });
    return asset;
  },

  replace(
    actor: Actor,
    assetId: string,
    input: {
      url: string;
      mimeType: string;
      byteSize?: number;
      altText?: string | null;
      width?: number | null;
      height?: number | null;
      filename?: string | null;
    },
  ) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ASSET_MANAGE);
    const organizationId = orgId(actor.organizationId);
    const byteSize = input.byteSize ?? Buffer.byteLength(input.url, "utf8");
    const asset = marketingAssetStore.replace(assetId, organizationId, {
      url: input.url,
      mimeType: input.mimeType,
      byteSize,
      altText: input.altText,
      width: input.width,
      height: input.height,
      uploadedByUserId: actor.userId ?? null,
      filename: input.filename,
    });
    recordMarketingAuditEvent({
      kind: "asset.replace",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { assetId, versionNumber: asset.currentVersionNumber },
    });
    recordMarketingAuditEvent({
      kind: "asset.version",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { assetId, versionNumber: asset.currentVersionNumber },
    });
    return asset;
  },

  archive(actor: Actor, assetId: string) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ASSET_MANAGE);
    const organizationId = orgId(actor.organizationId);
    const asset = marketingAssetStore.archive(assetId, organizationId);
    recordMarketingAuditEvent({
      kind: "asset.archive",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { assetId, referenced: asset.usageReferences.length > 0 },
    });
    return asset;
  },

  setActive(actor: Actor, assetId: string, active: boolean) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ASSET_MANAGE);
    const organizationId = orgId(actor.organizationId);
    const asset = marketingAssetStore.setActive(assetId, organizationId, active);
    recordMarketingAuditEvent({
      kind: "asset.archive",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { assetId, active },
    });
    return asset;
  },

  setApproval(actor: Actor, assetId: string, approvalStatus: MarketingAssetApprovalStatus) {
    assertNoSend();
    assertMarketingPermission(actor, MARKETING_PERMISSIONS.ASSET_MANAGE);
    const organizationId = orgId(actor.organizationId);
    return marketingAssetStore.setApproval(assetId, organizationId, approvalStatus);
  },

  selectForCampaign(actor: Actor, assetId: string): MarketingAssetSelectPayload {
    assertNoSend();
    const asset = this.get(actor, assetId);
    const payload: MarketingAssetSelectPayload = {
      assetId: asset.id,
      organizationId: asset.organizationId,
      url: asset.url,
      alt: asset.altText,
      assetType: asset.assetType,
      name: asset.name,
    };
    recordMarketingAuditEvent({
      kind: "asset.select_for_campaign",
      actorUserId: actor.userId ?? null,
      organizationId: asset.organizationId,
      detail: { assetId: asset.id },
    });
    return payload;
  },

  delete(actor: Actor, assetId: string): never {
    recordMarketingAuditEvent({
      kind: "asset.delete_blocked",
      actorUserId: actor.userId ?? null,
      organizationId: actor.organizationId ?? "unknown",
      detail: { assetId },
    });
    return forbidDestructiveMarketingAssetDelete();
  },
};
