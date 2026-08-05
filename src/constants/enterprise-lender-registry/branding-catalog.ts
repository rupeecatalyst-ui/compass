/**
 * CO-LW-005 — Enterprise Lender Branding (Master Data).
 *
 * Official Brand Name · Website · Logo / Brand Asset for the Lender Registry.
 * Logos are included ONLY when sourced from a verifiable official brand asset
 * (Wikimedia Commons / Wikipedia files that cite the lender’s official website).
 *
 * Unverified lenders keep logoUrl unset — UI retains initials placeholder.
 * Do NOT hardcode logos in React components; resolve via this catalog + registry.
 */

export const CO_LW_005_LENDER_BRANDING_VERSION = 1;

export type LenderBrandAssetSource =
  | "wikimedia_commons"
  | "wikipedia"
  | "official_website";

export type LenderBrandVerificationStatus = "verified" | "unverified";

export interface LenderBrandingEntry {
  seedKey: string;
  /** Marketing / consumer brand name (may match displayName). */
  brandName: string;
  /** Official corporate website. */
  website: string;
  /**
   * Official logo / brand asset URL.
   * Null when not verified — consumers must use placeholder.
   */
  logoUrl: string | null;
  brandAssetSource?: LenderBrandAssetSource;
  /** Commons / Wikipedia file title used for audit. */
  brandAssetFile?: string;
  verificationStatus: LenderBrandVerificationStatus;
  /** Why logo was withheld when unverified. */
  missingLogoReason?: string;
}

/** Stable Commons redirect — resolves to the current file revision. */
function commonsFile(fileName: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
}

function wikipediaFile(fileName: string): string {
  return `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
}

function verified(
  partial: Omit<LenderBrandingEntry, "logoUrl" | "verificationStatus"> & {
    brandAssetFile: string;
    brandAssetSource?: LenderBrandAssetSource;
  },
): LenderBrandingEntry {
  const source = partial.brandAssetSource ?? "wikimedia_commons";
  const logoUrl =
    source === "wikipedia"
      ? wikipediaFile(partial.brandAssetFile)
      : commonsFile(partial.brandAssetFile);
  return {
    ...partial,
    brandAssetSource: source,
    logoUrl,
    verificationStatus: "verified",
  };
}

function websiteOnly(
  seedKey: string,
  brandName: string,
  website: string,
  missingLogoReason: string,
): LenderBrandingEntry {
  return {
    seedKey,
    brandName,
    website,
    logoUrl: null,
    verificationStatus: "unverified",
    missingLogoReason,
  };
}

/**
 * Verified official logos (Commons/Wikipedia citing official websites).
 * Intentionally curated — never invent or use third-party icon packs.
 */
const VERIFIED_LOGOS: readonly LenderBrandingEntry[] = [
  verified({
    seedKey: "sbi",
    brandName: "State Bank of India",
    website: "https://www.sbi.co.in",
    brandAssetFile: "State Bank of India.svg",
  }),
  verified({
    seedKey: "hdfc",
    brandName: "HDFC Bank",
    website: "https://www.hdfcbank.com",
    brandAssetFile: "HDFC Bank Logo.svg",
  }),
  verified({
    seedKey: "icici",
    brandName: "ICICI Bank",
    website: "https://www.icicibank.com",
    brandAssetFile: "ICICI Bank Logo.svg",
  }),
  verified({
    seedKey: "axis",
    brandName: "Axis Bank",
    website: "https://www.axisbank.com",
    brandAssetFile: "Axis Bank logo.svg",
  }),
  verified({
    seedKey: "kotak",
    brandName: "Kotak Mahindra Bank",
    website: "https://www.kotak.com",
    brandAssetFile: "Kotak Mahindra Group logo.svg",
    brandAssetSource: "wikipedia",
  }),
  verified({
    seedKey: "pnb",
    brandName: "Punjab National Bank",
    website: "https://www.pnbindia.in",
    brandAssetFile: "Punjab National Bank.svg",
  }),
  verified({
    seedKey: "canara",
    brandName: "Canara Bank",
    website: "https://www.canarabank.com",
    brandAssetFile: "Canara Bank Logo.svg",
  }),
  verified({
    seedKey: "union",
    brandName: "Union Bank of India",
    website: "https://www.unionbankofindia.co.in",
    brandAssetFile: "Union Bank of India Logo.svg",
  }),
  verified({
    seedKey: "bom",
    brandName: "Bank of Maharashtra",
    website: "https://www.bankofmaharashtra.in",
    brandAssetFile: "Bank of Maharashtra logo.svg",
  }),
  verified({
    seedKey: "iob",
    brandName: "Indian Overseas Bank",
    website: "https://www.iob.in",
    brandAssetFile: "Indian Overseas Bank Logo.svg",
  }),
  verified({
    seedKey: "psb",
    brandName: "Punjab & Sind Bank",
    website: "https://punjabandsindbank.co.in",
    brandAssetFile: "Punjab & Sind Bank.svg",
  }),
  verified({
    seedKey: "indusind",
    brandName: "IndusInd Bank",
    website: "https://www.indusind.com",
    brandAssetFile: "IndusInd Bank SVG Logo.svg",
  }),
  verified({
    seedKey: "federal",
    brandName: "Federal Bank",
    website: "https://www.federalbank.co.in",
    brandAssetFile: "Federal-Bank-Logo SVG.svg",
  }),
  verified({
    seedKey: "yes",
    brandName: "Yes Bank",
    website: "https://www.yesbank.in",
    brandAssetFile: "Yes Bank SVG Logo.svg",
  }),
  verified({
    seedKey: "rbl",
    brandName: "RBL Bank",
    website: "https://www.rblbank.com",
    brandAssetFile: "RBL Bank SVG Logo.svg",
  }),
  verified({
    seedKey: "karnataka",
    brandName: "Karnataka Bank",
    website: "https://karnatakabank.com",
    brandAssetFile: "Karnataka Bank svg Logo.svg",
  }),
  verified({
    seedKey: "kvb",
    brandName: "Karur Vysya Bank",
    website: "https://www.kvb.co.in",
    brandAssetFile: "Karur Vysya Bank.svg",
  }),
  verified({
    seedKey: "dcb",
    brandName: "DCB Bank",
    website: "https://www.dcbbank.com",
    brandAssetFile: "Development Credit Bank.svg",
  }),
  verified({
    seedKey: "tmb",
    brandName: "Tamilnad Mercantile Bank",
    website: "https://www.tmb.in",
    brandAssetFile: "TMB SVG Logo.svg",
  }),
  verified({
    seedKey: "csb",
    brandName: "CSB Bank",
    website: "https://www.csb.co.in",
    brandAssetFile: "CSB Bank New Logo-02.svg",
  }),
  verified({
    seedKey: "bandhan",
    brandName: "Bandhan Bank",
    website: "https://bandhanbank.com",
    brandAssetFile: "Bandhan Bank Svg Logo.svg",
  }),
  verified({
    seedKey: "bajaj_finance",
    brandName: "Bajaj Finance",
    website: "https://www.bajajfinserv.in",
    brandAssetFile: "Bajaj Finance Logo.svg",
  }),
];

/**
 * Explicit skips — official website known, but no verified current logo asset.
 * (Prevents guessing / outdated rebrands e.g. IDFC → IDFC First.)
 */
const EXPLICIT_UNVERIFIED: readonly LenderBrandingEntry[] = [
  websiteOnly(
    "idfc_first",
    "IDFC FIRST Bank",
    "https://www.idfcfirstbank.com",
    "Commons hosts legacy IDFC Bank mark only — IDFC FIRST rebrand not verified",
  ),
  websiteOnly(
    "bob",
    "Bank of Baroda",
    "https://www.bankofbaroda.in",
    "No verified SVG brand asset located on Wikimedia Commons",
  ),
  websiteOnly(
    "lic_hfl",
    "LIC Housing Finance",
    "https://www.lichousing.com",
    "No verified official SVG brand asset located",
  ),
  websiteOnly(
    "pnb_housing",
    "PNB Housing Finance",
    "https://www.pnbhousing.com",
    "No verified official SVG brand asset located",
  ),
  websiteOnly(
    "tata_capital",
    "Tata Capital",
    "https://www.tatacapital.com",
    "No verified official SVG brand asset located",
  ),
  websiteOnly(
    "hsbc",
    "HSBC",
    "https://www.hsbc.co.in",
    "No India-specific verified brand asset pinned — retain placeholder",
  ),
  websiteOnly(
    "standard_chartered",
    "Standard Chartered",
    "https://www.sc.com/in",
    "No India-specific verified brand asset pinned — retain placeholder",
  ),
];

const BY_SEED = new Map<string, LenderBrandingEntry>();
for (const row of [...VERIFIED_LOGOS, ...EXPLICIT_UNVERIFIED]) {
  BY_SEED.set(row.seedKey, row);
}

/** All curated branding rows (verified + explicit unverified). */
export const LENDER_BRANDING_CATALOG: readonly LenderBrandingEntry[] = Array.from(
  BY_SEED.values(),
);

export function getLenderBrandingBySeedKey(
  seedKey: string | null | undefined,
): LenderBrandingEntry | undefined {
  if (!seedKey?.trim()) return undefined;
  return BY_SEED.get(seedKey.trim().toLowerCase());
}

export function listVerifiedLenderBrandLogos(): LenderBrandingEntry[] {
  return LENDER_BRANDING_CATALOG.filter(
    (r) => r.verificationStatus === "verified" && Boolean(r.logoUrl),
  );
}

export function countVerifiedLenderBrandLogos(): number {
  return listVerifiedLenderBrandLogos().length;
}
