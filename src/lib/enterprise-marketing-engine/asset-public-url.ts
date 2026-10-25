/**
 * CO-MARKETING-REDESIGN-011 — Public HTTPS URL for Marketing image bytes.
 * Email clients cannot load data: URLs or authenticated admin APIs.
 * Bytes remain in fixture/durable preview storage — this is a serve path, not a CDN put.
 */

import { MARKETING_ASSET_PUBLIC_PATH_PREFIX } from "@/constants/enterprise-marketing-engine/assets";

const LOCAL_DEV_ORIGIN = "http://localhost:3000";

export function resolveMarketingPublicOrigin(): string {
  const configured = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (configured) {
    try {
      const origin = new URL(configured).origin;
      if (origin && !/^https?:\/\/(0\.0\.0\.0|\[::\])(?::|$)/i.test(origin)) {
        return origin.replace(/\/$/, "");
      }
    } catch {
      /* fall through */
    }
  }
  return LOCAL_DEV_ORIGIN;
}

export function isMarketingAssetDataUrl(url: string): boolean {
  return url.trim().toLowerCase().startsWith("data:");
}

export function isMarketingAssetPublicPath(url: string): boolean {
  try {
    const parsed = new URL(url, resolveMarketingPublicOrigin());
    return parsed.pathname.startsWith(`${MARKETING_ASSET_PUBLIC_PATH_PREFIX}/`);
  } catch {
    return url.includes(MARKETING_ASSET_PUBLIC_PATH_PREFIX);
  }
}

export function buildMarketingAssetPublicUrl(assetId: string, checksum: string): string {
  const origin = resolveMarketingPublicOrigin();
  const path = `${MARKETING_ASSET_PUBLIC_PATH_PREFIX}/${encodeURIComponent(assetId)}`;
  const query = checksum ? `?c=${encodeURIComponent(checksum)}` : "";
  return `${origin}${path}${query}`;
}

export function decodeMarketingAssetDataUrl(url: string): { mimeType: string; bytes: Buffer } | null {
  const trimmed = url.trim();
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(trimmed);
  if (!match) return null;
  const mimeType = match[1].trim().toLowerCase();
  try {
    const bytes = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
    if (!bytes.length) return null;
    return { mimeType, bytes };
  } catch {
    return null;
  }
}
