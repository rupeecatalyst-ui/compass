/**
 * CO-PROG-004 — Baseline Commercial Program seed catalog (one-time, create-missing only).
 * Derived from public retail / MSME product families already declared on the Lender Master catalog.
 * Commercial numeric values are intentionally left unset for administrator configuration.
 * No website auto-sync.
 */
import {
  getCanonicalProductByCode,
  resolveCanonicalProductCode,
} from "@/constants/enterprise-product-master";
import { LENDER_MASTER_SEED_CATALOG } from "@/constants/enterprise-lender-registry/master-seed-catalog";

export const CO_PROG_004_SEED_TAG = "seed:co-prog-004";
export const CO_PROG_004_SEED_VERSION = 1;

export interface BaselineCommercialProgramSeed {
  /** Stable unique program code within organization. */
  code: string;
  label: string;
  lenderCode: string;
  productCode: string;
  sortOrder: number;
  description: string;
  notes: string;
}

function normalizeProgramCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_-]/g, "");
}

/** Normalize capability codes to Product Master SSOT (HOME_LOAN, …). Drops unknown products. */
export function normalizeSupportedProductCodes(
  codes: readonly string[] | null | undefined,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of codes ?? []) {
    const resolved = resolveCanonicalProductCode(raw);
    if (!resolved) continue;
    const product = getCanonicalProductByCode(resolved);
    if (!product) continue;
    if (seen.has(product.code)) continue;
    seen.add(product.code);
    out.push(product.code);
  }
  return out;
}

export function getBaselineSupportedProductsForLenderSeedKey(
  seedKey: string,
): string[] {
  const entry = LENDER_MASTER_SEED_CATALOG.find((l) => l.seedKey === seedKey);
  if (!entry) return [];
  return normalizeSupportedProductCodes(entry.productsSupported);
}

/**
 * One default Active commercial program stub per (lender × supported product).
 * Labels use Product Master names; commercials remain blank for admins.
 */
export function getBaselineCommercialProgramSeeds(): BaselineCommercialProgramSeed[] {
  const seeds: BaselineCommercialProgramSeed[] = [];
  let sort = 0;
  for (const lender of LENDER_MASTER_SEED_CATALOG) {
    const lenderCode = normalizeProgramCode(lender.seedKey);
    const products = normalizeSupportedProductCodes(lender.productsSupported);
    for (const productCode of products) {
      const product = getCanonicalProductByCode(productCode);
      if (!product) continue;
      sort += 1;
      const code = normalizeProgramCode(`BASE_${lender.seedKey}_${productCode}`);
      seeds.push({
        code,
        label: `${lender.shortName || lender.displayName} — ${product.label}`,
        lenderCode,
        productCode: product.code,
        sortOrder: sort,
        description: `Baseline ${product.label} program for ${lender.displayName}. Commercial terms are configurable by administrators.`,
        notes: `${CO_PROG_004_SEED_TAG};v${CO_PROG_004_SEED_VERSION};source=lender-master`,
      });
    }
  }
  return seeds;
}

export function countExpectedBaselineCommercialPrograms(): number {
  return getBaselineCommercialProgramSeeds().length;
}
