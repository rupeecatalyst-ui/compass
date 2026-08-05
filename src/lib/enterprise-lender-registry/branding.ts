/**
 * CO-LW-005 — Resolve lender branding from Enterprise Lender Registry / branding catalog.
 * Single consumer path for logos · brand name · website across all modules.
 */
import {
  getLenderBrandingBySeedKey,
  type LenderBrandingEntry,
} from "@/constants/enterprise-lender-registry/branding-catalog";
import { LENDER_MASTER_SEED_CATALOG } from "@/constants/enterprise-lender-registry/master-seed-catalog";

export interface LenderBrandingResolveInput {
  seedKey?: string | null;
  lenderCode?: string | null;
  displayName?: string | null;
  legalName?: string | null;
  shortName?: string | null;
  aliases?: string[] | null;
  website?: string | null;
  /** Persisted registry logo — preferred when set. */
  logoUrl?: string | null;
  brandName?: string | null;
}

export interface ResolvedLenderBranding {
  brandName: string;
  website: string | null;
  logoUrl: string | null;
  seedKey: string | null;
  verificationStatus: "verified" | "unverified" | "registry";
  missingLogoReason?: string;
}

function normalize(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function seedKeyFromIdentity(input: LenderBrandingResolveInput): string | null {
  if (input.seedKey?.trim()) return input.seedKey.trim().toLowerCase();

  const candidates = [
    input.shortName,
    input.lenderCode,
    input.displayName,
    input.legalName,
    ...(input.aliases ?? []),
  ]
    .map(normalize)
    .filter(Boolean);

  for (const seed of LENDER_MASTER_SEED_CATALOG) {
    const keys = [
      seed.seedKey,
      seed.shortName,
      seed.displayName,
      seed.legalName,
      ...seed.aliases,
    ].map(normalize);
    if (keys.some((k) => candidates.includes(k))) return seed.seedKey;
  }
  return null;
}

/**
 * Resolve Official Brand Name · Website · Logo from registry fields + master branding catalog.
 * Never invents logo URLs — unverified → logoUrl null (placeholder UI).
 */
export function resolveLenderBranding(
  input: LenderBrandingResolveInput,
): ResolvedLenderBranding {
  const seedKey = seedKeyFromIdentity(input);
  const catalog: LenderBrandingEntry | undefined = getLenderBrandingBySeedKey(seedKey);

  const brandName =
    (input.brandName ?? input.displayName ?? catalog?.brandName ?? input.legalName ?? input.shortName ?? "")
      .trim() || "Lender";

  const website = (input.website ?? catalog?.website ?? null)?.trim() || null;

  const registryLogo = input.logoUrl?.trim() || null;
  if (registryLogo) {
    return {
      brandName,
      website,
      logoUrl: registryLogo,
      seedKey,
      verificationStatus: "registry",
    };
  }

  if (catalog?.logoUrl) {
    return {
      brandName: catalog.brandName || brandName,
      website: website ?? catalog.website,
      logoUrl: catalog.logoUrl,
      seedKey,
      verificationStatus: "verified",
    };
  }

  return {
    brandName,
    website,
    logoUrl: null,
    seedKey,
    verificationStatus: "unverified",
    missingLogoReason:
      catalog?.missingLogoReason ??
      (seedKey
        ? "Official logo not verified — placeholder retained"
        : "Lender identity not matched to branding catalog"),
  };
}

/** Apply curated branding onto a seed row (logo only when verified). */
export function brandingFieldsForSeedKey(seedKey: string): {
  brandName?: string;
  website?: string;
  logoUrl?: string;
} {
  const row = getLenderBrandingBySeedKey(seedKey);
  if (!row) return {};
  return {
    brandName: row.brandName,
    website: row.website,
    ...(row.logoUrl ? { logoUrl: row.logoUrl } : {}),
  };
}
