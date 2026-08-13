/**
 * CO-MARKETING-MKT-04 / MKT-08 — Marketing Asset Library store (not Document Registry).
 */

import { createHash } from "node:crypto";
import {
  MARKETING_ASSET_MAX_BYTES,
  type MarketingAssetCategory,
} from "@/constants/enterprise-marketing-engine/content";
import { assessMarketingImageAsset } from "@/lib/enterprise-marketing-engine/asset-optimize";
import type { MarketingAsset } from "@/types/enterprise-marketing-campaign";

const assets = new Map<string, MarketingAsset>();

function nowIso() {
  return new Date().toISOString();
}

function withActive(asset: Omit<MarketingAsset, "active"> & { active?: boolean }): MarketingAsset {
  return {
    ...asset,
    active: !asset.archived,
  };
}

export const marketingAssetStore = {
  list(organizationId: string, opts?: { includeArchived?: boolean }): MarketingAsset[] {
    return [...assets.values()]
      .filter((a) => a.organizationId === organizationId)
      .filter((a) => (opts?.includeArchived ? true : a.active))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  getForOrg(id: string, organizationId: string): MarketingAsset | null {
    const a = assets.get(id);
    if (!a || a.organizationId !== organizationId) return null;
    return a;
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
  }): MarketingAsset {
    if (input.byteSize > MARKETING_ASSET_MAX_BYTES) {
      throw Object.assign(
        new Error(`Asset exceeds max size of ${MARKETING_ASSET_MAX_BYTES} bytes`),
        { statusCode: 400, code: "ASSET_TOO_LARGE" },
      );
    }
    const ts = nowIso();
    const id = input.id?.trim() || `mkt-asset-${input.organizationId}-${Date.now()}`;
    const prev = assets.get(id);
    if (prev && prev.organizationId !== input.organizationId) {
      throw Object.assign(new Error("Asset belongs to another organization"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    const checksum =
      input.checksum ?? createHash("sha256").update(input.url).digest("hex").slice(0, 16);
    const assessment = assessMarketingImageAsset({
      mimeType: input.mimeType || "application/octet-stream",
      byteSize: input.byteSize,
      url: input.url,
    });
    const archived =
      input.active === false ? true : input.active === true ? false : (prev?.archived ?? false);
    const next = withActive({
      id,
      organizationId: input.organizationId,
      title: input.title.trim() || "Untitled asset",
      mimeType: input.mimeType || "application/octet-stream",
      category: input.category,
      tags: input.tags ?? [],
      url: input.url,
      byteSize: input.byteSize,
      checksum,
      archived,
      permissionScope: "ORG_MARKETING",
      suggestedMaxWidth: assessment.suggestedMaxWidth,
      optimizationWarnings: assessment.warnings,
      createdAt: prev?.createdAt ?? ts,
      updatedAt: ts,
    });
    assets.set(id, next);
    return next;
  },

  archive(id: string, organizationId: string): MarketingAsset {
    const a = this.getForOrg(id, organizationId);
    if (!a) {
      throw Object.assign(new Error("Asset not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const next = withActive({ ...a, archived: true, updatedAt: nowIso() });
    assets.set(id, next);
    return next;
  },

  setActive(id: string, organizationId: string, active: boolean): MarketingAsset {
    const a = this.getForOrg(id, organizationId);
    if (!a) {
      throw Object.assign(new Error("Asset not found"), { statusCode: 404, code: "NOT_FOUND" });
    }
    const next = withActive({ ...a, archived: !active, updatedAt: nowIso() });
    assets.set(id, next);
    return next;
  },
};
