/**
 * CO-MARKETING-REDESIGN-011 — Images require alt text before campaign approval.
 */

import { MARKETING_ASSET_IMAGE_BLOCK_TYPES } from "@/constants/enterprise-marketing-engine/assets";
import type { MarketingContentDocument } from "@/types/enterprise-marketing-campaign";
import { isMarketingVisualImageMime } from "@/lib/enterprise-marketing-engine/asset-mime";

export function marketingImageBlockNeedsAlt(block: {
  type: string;
  props: Record<string, unknown>;
}): boolean {
  if (!(MARKETING_ASSET_IMAGE_BLOCK_TYPES as readonly string[]).includes(block.type)) {
    return false;
  }
  return !String(block.props.alt ?? "").trim();
}

export function collectMarketingImageBlocksMissingAlt(
  content: MarketingContentDocument,
): string[] {
  return content.blocks.filter(marketingImageBlockNeedsAlt).map((block) => block.id);
}

export function assertMarketingImageAltTextForApproval(content: MarketingContentDocument): void {
  const missing = collectMarketingImageBlocksMissingAlt(content);
  if (!missing.length) return;
  throw Object.assign(
    new Error("Images require accessibility alt text before campaign approval"),
    { statusCode: 400, code: "ASSET_ALT_TEXT_REQUIRED", detail: { blockIds: missing } },
  );
}

export function marketingAssetRequiresAltText(mimeType: string): boolean {
  return isMarketingVisualImageMime(mimeType);
}
