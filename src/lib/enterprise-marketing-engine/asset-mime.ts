/**
 * CO-MARKETING-REDESIGN-011 — Safe MIME / extension validation for Marketing assets.
 * Rejects executables, HTML, scripts, SVG, and generic octet-stream.
 */

import {
  MARKETING_ASSET_ALLOWED_MIME_TYPES,
  MARKETING_ASSET_DANGEROUS_EXTENSIONS,
  MARKETING_ASSET_DANGEROUS_MIME_TYPES,
  MARKETING_ASSET_TYPES,
  type MarketingAssetType,
} from "@/constants/enterprise-marketing-engine/assets";
import { MARKETING_ASSET_CATEGORIES, type MarketingAssetCategory } from "@/constants/enterprise-marketing-engine/content";

export function normalizeMarketingMimeType(mimeType: string | undefined | null): string {
  return (mimeType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isDangerousMarketingAssetMime(mimeType: string): boolean {
  const mime = normalizeMarketingMimeType(mimeType);
  return (MARKETING_ASSET_DANGEROUS_MIME_TYPES as readonly string[]).includes(mime);
}

export function isAllowedMarketingAssetMime(mimeType: string): boolean {
  const mime = normalizeMarketingMimeType(mimeType);
  if (!mime || isDangerousMarketingAssetMime(mime)) return false;
  return (MARKETING_ASSET_ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export function filenameLooksDangerous(filename?: string | null): boolean {
  const name = (filename ?? "").trim().toLowerCase();
  if (!name) return false;
  return MARKETING_ASSET_DANGEROUS_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function assertSafeMarketingAssetUpload(input: {
  mimeType: string;
  filename?: string | null;
}): string {
  const mime = normalizeMarketingMimeType(input.mimeType);
  if (filenameLooksDangerous(input.filename)) {
    throw Object.assign(new Error("Unsupported or dangerous file type"), {
      statusCode: 400,
      code: "ASSET_DANGEROUS_TYPE",
    });
  }
  if (!isAllowedMarketingAssetMime(mime)) {
    throw Object.assign(
      new Error(`Unsupported Marketing asset MIME type: ${mime || "unknown"}`),
      { statusCode: 400, code: "ASSET_UNSUPPORTED_MIME" },
    );
  }
  return mime;
}

export function isMarketingVisualImageMime(mimeType: string): boolean {
  const mime = normalizeMarketingMimeType(mimeType);
  return mime.startsWith("image/") && isAllowedMarketingAssetMime(mime);
}

export function inferMarketingAssetType(input: {
  assetType?: string | null;
  category?: string | null;
  mimeType: string;
}): MarketingAssetType {
  const requested = (input.assetType ?? "").trim();
  if ((MARKETING_ASSET_TYPES as readonly string[]).includes(requested)) {
    return requested as MarketingAssetType;
  }
  const mime = normalizeMarketingMimeType(input.mimeType);
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  const category = (input.category ?? "").trim();
  if (category === "logo") return "logo";
  if (category === "banner") return "campaign_banner";
  if (category === "hero") return "email_header";
  if (category === "product" || category === "offer") return "social_creative";
  if (category === "icon") return "image";
  return mime.startsWith("image/") ? "image" : "collateral";
}

export function inferMarketingAssetCategory(
  assetType: MarketingAssetType,
  fallback?: string | null,
): MarketingAssetCategory {
  const requested = (fallback ?? "").trim();
  if ((MARKETING_ASSET_CATEGORIES as readonly string[]).includes(requested)) {
    return requested as MarketingAssetCategory;
  }
  if (assetType === "logo") return "logo";
  if (assetType === "campaign_banner") return "banner";
  if (assetType === "email_header") return "hero";
  if (assetType === "social_creative") return "product";
  if (assetType === "image") return "icon";
  return "other";
}
