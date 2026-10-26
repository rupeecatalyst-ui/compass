/**
 * Rights live in the existing tagsJson column.
 * A string array remains valid. Older { tags, rights.source } objects still read.
 */

export type MarketingAssetRights = {
  sourceUrl: string;
  license: string;
  commercialEmail: string;
  attribution: string;
  restrictions: string;
  evidenceReference: string;
};

export const EMPTY_MARKETING_ASSET_RIGHTS: MarketingAssetRights = {
  sourceUrl: "",
  license: "",
  commercialEmail: "",
  attribution: "",
  restrictions: "",
  evidenceReference: "",
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function tagsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(text).filter(Boolean);
}

export function marketingAssetRightsAreEmpty(rights: MarketingAssetRights | null | undefined): boolean {
  if (!rights) return true;
  return (
    !rights.sourceUrl &&
    !rights.license &&
    !rights.commercialEmail &&
    !rights.attribution &&
    !rights.restrictions &&
    !rights.evidenceReference
  );
}

export function normalizeMarketingAssetRights(value: unknown): MarketingAssetRights {
  if (!value || typeof value !== "object") return { ...EMPTY_MARKETING_ASSET_RIGHTS };
  const record = value as Record<string, unknown>;
  return {
    sourceUrl: text(record.sourceUrl) || text(record.source),
    license: text(record.license),
    commercialEmail: text(record.commercialEmail) || text(record.commercialEmailPermitted),
    attribution: text(record.attribution),
    restrictions: text(record.restrictions),
    evidenceReference: text(record.evidenceReference) || text(record.evidence),
  };
}

export function parseMarketingAssetTagsJson(value: unknown): {
  tags: string[];
  rights: MarketingAssetRights;
} {
  if (Array.isArray(value)) {
    return { tags: tagsOf(value), rights: { ...EMPTY_MARKETING_ASSET_RIGHTS } };
  }
  if (value && typeof value === "object") {
    const record = value as { tags?: unknown; rights?: unknown };
    return {
      tags: tagsOf(record.tags),
      rights: normalizeMarketingAssetRights(record.rights),
    };
  }
  return { tags: [], rights: { ...EMPTY_MARKETING_ASSET_RIGHTS } };
}

export function serializeMarketingAssetTagsJson(
  tags: string[] | null | undefined,
  rights: MarketingAssetRights | null | undefined,
): string[] | { tags: string[]; rights: MarketingAssetRights } {
  const cleanTags = tagsOf(tags);
  const cleanRights = normalizeMarketingAssetRights(rights);
  if (marketingAssetRightsAreEmpty(cleanRights)) return cleanTags;
  return { tags: cleanTags, rights: cleanRights };
}
