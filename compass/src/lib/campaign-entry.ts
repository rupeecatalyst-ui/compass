/**
 * Product campaign links open the existing Let's begin screen.
 * Organic product pages keep their landing routes.
 */

import { readProductCodeFromPathname } from "@/config/compass-lending-products";

export function campaignTokenStorageKey(productCode: string): string {
  return `compass.campaign.v1.${productCode}`;
}

export function rememberCampaignToken(
  storage: { setItem(key: string, value: string): void },
  productCode: string,
  token: string,
): void {
  const value = token.trim();
  if (!productCode.trim() || !value) return;
  storage.setItem(campaignTokenStorageKey(productCode), value);
}

export function recallCampaignToken(
  storage: { getItem(key: string): string | null },
  productCode: string,
): string | null {
  if (!productCode.trim()) return null;
  const value = storage.getItem(campaignTokenStorageKey(productCode))?.trim();
  return value || null;
}

/**
 * A campaign token on a product landing page belongs on the apply entry.
 * Pages without a token, and the apply route itself, stay where they are.
 */
export function campaignLandingRedirect(pathname: string, search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const token = params.get("campaign")?.trim();
  if (!token) return null;
  const path = pathname.replace(/\/$/, "") || "/";
  if (path.startsWith("/apply/")) return null;
  const product = readProductCodeFromPathname(pathname, search);
  if (!product) return null;
  return `/apply/${encodeURIComponent(product)}?campaign=${encodeURIComponent(token)}`;
}
