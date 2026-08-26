/**
 * CO-MARKETING-MKT-04 / MKT-08 — Content block & personalization constants.
 */

export const MARKETING_CONTENT_BLOCK_TYPES = [
  "header",
  "logo",
  "hero_image",
  "text",
  "image",
  "image_text",
  "product_card",
  "offer_card",
  "cta",
  "divider",
  "spacer",
  "highlight",
  "contact",
  "footer",
  "disclaimer",
] as const;

export type MarketingContentBlockType = (typeof MARKETING_CONTENT_BLOCK_TYPES)[number];

/** Human labels for builder palette (Heading ≈ header, Paragraph ≈ text, Button ≈ cta). */
export const MARKETING_CONTENT_BLOCK_LABELS: Record<MarketingContentBlockType, string> = {
  header: "Heading",
  logo: "Logo",
  hero_image: "Hero image",
  text: "Paragraph",
  image: "Image",
  image_text: "Image + text",
  product_card: "Product",
  offer_card: "Offer",
  cta: "Button",
  divider: "Divider",
  spacer: "Spacer",
  highlight: "Highlight",
  contact: "Contact information",
  footer: "Footer",
  disclaimer: "Disclaimer",
};

/** Allowlisted personalization tokens — never arbitrary code. */
export const MARKETING_PERSONALIZATION_TOKENS = [
  "firstName",
  "lastName",
  "fullName",
  "city",
  "state",
  "profession",
  "company",
  "companyName",
  "product",
  "senderName",
] as const;

export type MarketingPersonalizationToken =
  (typeof MARKETING_PERSONALIZATION_TOKENS)[number];

/**
 * Approved snake_case aliases → canonical camelCase tokens.
 * Does not expand the allowlist — maps known user-facing variants only.
 */
export const MARKETING_PERSONALIZATION_TOKEN_ALIASES: Partial<
  Record<string, MarketingPersonalizationToken>
> = {
  first_name: "firstName",
};

/** Safe fallback when a personalization value is missing (never executes code). */
export const MARKETING_PERSONALIZATION_FALLBACKS: Record<
  MarketingPersonalizationToken,
  string
> = {
  firstName: "there",
  lastName: "",
  fullName: "Valued Customer",
  city: "",
  state: "",
  profession: "Professional",
  company: "your organization",
  companyName: "your organization",
  product: "our products",
  senderName: "Rupee Catalyst",
};

export const MARKETING_ASSET_CATEGORIES = [
  "logo",
  "banner",
  "hero",
  "product",
  "offer",
  "icon",
  "other",
] as const;

export type MarketingAssetCategory = (typeof MARKETING_ASSET_CATEGORIES)[number];

/** Max in-memory asset payload for foundation upload (bytes). */
export const MARKETING_ASSET_MAX_BYTES = 1_500_000 as const;

/** Image MIME types accepted for marketing assets. */
export const MARKETING_ASSET_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
