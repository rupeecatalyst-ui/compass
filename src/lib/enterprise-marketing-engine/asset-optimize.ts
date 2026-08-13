/**
 * CO-MARKETING-MKT-08 — Lightweight marketing image asset optimization helpers.
 * Does not replace Document Registry. Operates on metadata + data-URL size hints.
 */

import {
  MARKETING_ASSET_IMAGE_MIME_TYPES,
  MARKETING_ASSET_MAX_BYTES,
} from "@/constants/enterprise-marketing-engine/content";

export function isMarketingImageMimeType(mimeType: string): boolean {
  return (MARKETING_ASSET_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
}

export type MarketingAssetOptimizationResult = {
  ok: boolean;
  optimized: boolean;
  mimeType: string;
  byteSize: number;
  /** Suggested max display width for email clients. */
  suggestedMaxWidth: number;
  warnings: string[];
};

/**
 * Validate and annotate image assets for email reuse.
 * Does not rewrite binary pixels in MKT-08 — records optimization guidance.
 */
export function assessMarketingImageAsset(input: {
  mimeType: string;
  byteSize: number;
  url: string;
}): MarketingAssetOptimizationResult {
  const warnings: string[] = [];
  if (!isMarketingImageMimeType(input.mimeType)) {
    return {
      ok: false,
      optimized: false,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      suggestedMaxWidth: 600,
      warnings: ["Unsupported image mime type for marketing email assets"],
    };
  }
  if (input.byteSize > MARKETING_ASSET_MAX_BYTES) {
    warnings.push(`Exceeds max upload size (${MARKETING_ASSET_MAX_BYTES} bytes)`);
  }
  if (input.byteSize > 400_000) {
    warnings.push("Large image — prefer compressed WebP/JPEG under 400KB for email");
  }
  if (input.url.startsWith("data:") && input.byteSize > 200_000) {
    warnings.push("Inline data URL is large — prefer hosted https:// CDN URL for send");
  }
  return {
    ok: input.byteSize <= MARKETING_ASSET_MAX_BYTES,
    optimized: true,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    suggestedMaxWidth: 600,
    warnings,
  };
}
