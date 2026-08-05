/**
 * CO-LR-008 — Gap-fill Enterprise Lender Master (additive only).
 * Completes Product Owner catalogue gaps vs CO-LR-006 / baseline.
 * Idempotent via seedKey + normalised name/alias match — never remints IDs.
 */
import type {
  LenderInstitutionCategory,
  LenderMasterClassification,
  LenderRegistryProductCode,
} from "@/types/enterprise-lender-registry";
import type { LenderMasterSeedEntry } from "./master-seed-catalog";
import { LR006_PRESETS, type Lr006Preset } from "./master-seed-catalog-co-lr-006";

export const CO_LR_008_MASTER_SEED_VERSION = 1;
export const CO_LR_008_CATALOG_VERSION = 1;

type CompactLender = {
  k: string;
  n: string;
  d?: string;
  s: string;
  a?: string[];
  c: LenderMasterClassification;
  i: LenderInstitutionCategory;
  cat?: string;
  hq?: string;
  w?: string;
  p: Lr006Preset;
};

function expand(row: CompactLender): LenderMasterSeedEntry {
  return {
    seedKey: row.k,
    legalName: row.n,
    displayName: row.d ?? row.n,
    shortName: row.s,
    aliases: row.a ?? [row.s],
    classification: row.c,
    institutionCategory: row.i,
    categoryCode: row.cat,
    website: row.w,
    headquartersLabel: row.hq,
    rbiRegulated: true,
    panIndia: true,
    productsSupported: [...LR006_PRESETS[row.p]] as LenderRegistryProductCode[],
  };
}

/**
 * Lenders named in CO-LR-008 that were missing (or under-aliased) after CO-LR-006.
 * Operating-status verified as commonly active in Indian lending markets (2026).
 * Do not invent RBI/CIN/GSTIN — leave for admin enrichment.
 */
const COMPACT: CompactLender[] = [
  // —— Foreign / Multinational (gap-fill) ——
  {
    k: "jp_morgan",
    n: "JPMorgan Chase Bank, N.A.",
    d: "J.P. Morgan Chase Bank",
    s: "J.P. Morgan",
    a: ["JP Morgan", "JPMorgan", "JPM", "Chase Bank India", "J.P. Morgan Chase"],
    c: "foreign_bank",
    i: "bank",
    cat: "foreign_bank",
    hq: "Mumbai",
    w: "https://www.jpmorgan.com/IN/en/about-us",
    p: "FOREIGN",
  },
  {
    k: "societe_generale",
    n: "Société Générale",
    d: "Société Générale",
    s: "SocGen",
    a: ["Societe Generale", "SG", "Société Générale India"],
    c: "foreign_bank",
    i: "bank",
    cat: "foreign_bank",
    hq: "Mumbai",
    w: "https://www.societegenerale.com",
    p: "FOREIGN",
  },
  {
    k: "icbc",
    n: "Industrial and Commercial Bank of China Limited",
    d: "Industrial & Commercial Bank of China (ICBC)",
    s: "ICBC",
    a: ["ICBC India", "Industrial & Commercial Bank of China", "ICBC Bank"],
    c: "foreign_bank",
    i: "bank",
    cat: "foreign_bank",
    hq: "Mumbai",
    w: "https://www.icbc.com.cn",
    p: "FOREIGN",
  },
  {
    k: "mashreq_bank",
    n: "Mashreq Bank PSC",
    d: "Mashreq Bank",
    s: "Mashreq",
    a: ["Mashreq Bank India", "Mashreq"],
    c: "foreign_bank",
    i: "bank",
    cat: "foreign_bank",
    hq: "Mumbai",
    w: "https://www.mashreq.com",
    p: "FOREIGN",
  },

  // —— NBFC MSME / Business (gap-fill) ——
  {
    k: "clix_capital",
    n: "Clix Capital Services Private Limited",
    d: "Clix Capital",
    s: "Clix Capital",
    // Avoid bare "Clix" / "Clix Finance" — collide with Clix Housing (alias "Clix").
    a: ["Clix Capital Services", "Clix Capital Services Private Limited"],
    c: "nbfc",
    i: "nbfc",
    hq: "Gurugram",
    w: "https://www.clix.capital",
    p: "NBFC_MSME",
  },
  {
    k: "credit_saison",
    n: "Credit Saison India",
    d: "Credit Saison India",
    s: "Credit Saison",
    a: ["Kisetsu Saison Finance", "Saison Credit", "Credit Saison"],
    c: "nbfc",
    i: "nbfc",
    hq: "Bengaluru",
    w: "https://www.creditsaison.in",
    p: "NBFC_MSME",
  },
  {
    k: "ziploan",
    n: "ZipLoan Technologies Private Limited",
    d: "ZipLoan",
    s: "ZipLoan",
    a: ["Zip Loan", "ZipLoan Finance"],
    c: "nbfc",
    i: "fintech",
    hq: "New Delhi",
    w: "https://www.ziploan.in",
    p: "FINTECH",
  },
  {
    k: "namdev_finvest",
    n: "Namdev Finvest Private Limited",
    d: "Namdev Finvest",
    s: "Namdev",
    a: ["Namdev Finance", "Namdev Finvest"],
    c: "nbfc",
    i: "nbfc",
    hq: "Jaipur",
    w: "https://www.namdevfinvest.com",
    p: "NBFC_MSME",
  },
];

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(
      /\b(limited|ltd|bank|finance|financial|housing|co-operative|cooperative|the|n\.?a\.?|psc|pjsc|ag)\b/g,
      "",
    )
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/**
 * Filter out compact rows that collide with existing catalogue seedKeys or names.
 */
export function buildCoLr008LenderMasterEntries(
  existing: readonly LenderMasterSeedEntry[],
): LenderMasterSeedEntry[] {
  const seenKeys = new Set(existing.map((l) => l.seedKey.trim().toLowerCase()));
  const seenNames = new Set<string>();

  for (const row of existing) {
    for (const name of [row.legalName, row.displayName, row.shortName, ...row.aliases]) {
      const key = norm(name);
      if (key) seenNames.add(key);
    }
  }

  const out: LenderMasterSeedEntry[] = [];
  for (const row of COMPACT) {
    const key = row.k.trim().toLowerCase();
    if (!key || seenKeys.has(key)) continue;
    const nameKeys = [row.n, row.d ?? row.n, row.s, ...(row.a ?? [])]
      .map(norm)
      .filter(Boolean);
    if (nameKeys.some((n) => seenNames.has(n))) continue;
    seenKeys.add(key);
    for (const n of nameKeys) seenNames.add(n);
    out.push(expand(row));
  }
  return out;
}

export function countCoLr008CompactRows(): number {
  return COMPACT.length;
}

export function listCoLr008RequiredGapLabels(): string[] {
  return COMPACT.map((r) => r.d ?? r.n);
}
