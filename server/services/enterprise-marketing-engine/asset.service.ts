/**
 * CO-MARKETING-MKT-04 — Marketing Asset Library service.
 * Separate from operational Document Registry.
 */

import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "@/constants/enterprise-marketing-engine";
import {
  MARKETING_ASSET_MAX_BYTES,
  type MarketingAssetCategory,
} from "@/constants/enterprise-marketing-engine/content";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import { recordMarketingAuditEvent } from "./audit";
import { marketingAssetStore } from "./asset-store";

function orgId(actorOrg?: string | null) {
  return (actorOrg ?? "").trim() || "default";
}

export const marketingAssetService = {
  list(actor: { userId?: string; organizationId?: string | null }, includeArchived = false) {
    if (ENTERPRISE_MARKETING_EXECUTION_ENABLED) {
      throw new EnterpriseMarketingSafetyError("asset.unexpected_execution");
    }
    return marketingAssetStore.list(orgId(actor.organizationId), { includeArchived });
  },

  upload(
    actor: { userId?: string; organizationId?: string | null },
    input: {
      title: string;
      mimeType: string;
      category: MarketingAssetCategory;
      tags?: string[];
      /** data URL or https URL */
      url: string;
      byteSize?: number;
    },
  ) {
    const organizationId = orgId(actor.organizationId);
    const byteSize = input.byteSize ?? Buffer.byteLength(input.url, "utf8");
    if (byteSize > MARKETING_ASSET_MAX_BYTES) {
      throw Object.assign(
        new Error(`Asset exceeds max size of ${MARKETING_ASSET_MAX_BYTES} bytes`),
        { statusCode: 400, code: "ASSET_TOO_LARGE" },
      );
    }
    if (!input.url.startsWith("data:") && !input.url.startsWith("https://")) {
      throw Object.assign(new Error("Asset url must be https:// or data: URL"), {
        statusCode: 400,
        code: "INVALID_ASSET_URL",
      });
    }
    const asset = marketingAssetStore.upsert({
      organizationId,
      title: input.title,
      mimeType: input.mimeType,
      category: input.category,
      tags: input.tags,
      url: input.url,
      byteSize,
    });
    recordMarketingAuditEvent({
      kind: "asset.upload",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { assetId: asset.id },
    });
    return asset;
  },

  archive(actor: { userId?: string; organizationId?: string | null }, assetId: string) {
    const organizationId = orgId(actor.organizationId);
    const asset = marketingAssetStore.archive(assetId, organizationId);
    recordMarketingAuditEvent({
      kind: "asset.archive",
      actorUserId: actor.userId ?? null,
      organizationId,
      detail: { assetId },
    });
    return asset;
  },

  setActive(
    actor: { userId?: string; organizationId?: string | null },
    assetId: string,
    active: boolean,
  ) {
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
};
