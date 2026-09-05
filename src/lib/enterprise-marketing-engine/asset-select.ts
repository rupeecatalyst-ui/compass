/**
 * CO-MARKETING-REDESIGN-011 — Select-for-campaign helpers (session handoff).
 * Client-only. Never uploads files.
 */

import { MARKETING_SELECTED_ASSET_STORAGE_KEY } from "@/constants/enterprise-marketing-engine/assets";
import type { MarketingAssetSelectPayload } from "@/types/enterprise-marketing-assets";

export function applyMarketingAssetToImageBlock(
  props: Record<string, unknown>,
  payload: MarketingAssetSelectPayload,
): Record<string, unknown> {
  return {
    ...props,
    assetId: payload.assetId,
    url: payload.url,
    alt: payload.alt || (typeof props.alt === "string" ? props.alt : ""),
    storageRef: undefined,
  };
}

export function rememberMarketingSelectedAsset(payload: MarketingAssetSelectPayload): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(MARKETING_SELECTED_ASSET_STORAGE_KEY, JSON.stringify(payload));
}

export function consumeMarketingSelectedAsset(): MarketingAssetSelectPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(MARKETING_SELECTED_ASSET_STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(MARKETING_SELECTED_ASSET_STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as MarketingAssetSelectPayload;
    if (!parsed?.assetId || !parsed.url) return null;
    return parsed;
  } catch {
    return null;
  }
}
