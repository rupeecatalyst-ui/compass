/**
 * CO-ARCH-003 Phase 2B / CO-ADMIN-005 — Product ↔ Lender eligibility helpers.
 *
 * Used for advisory / display contexts only.
 * CO-ARCH-007 — Manual Identify Additional Lender / EnterpriseLenderSearch
 * must NOT call these filters (registry browser only).
 */
import {
  getCanonicalProductByCode,
  resolveCanonicalProductCode,
} from "@/constants/enterprise-product-master";
import { LENDER_REGISTRY_PRODUCT_OPTIONS } from "@/types/enterprise-lender-registry";

/** Map Loan Workspace product labels → Product Master / Lender Registry codes. */
export function resolveProductLibraryCode(input?: {
  productCode?: string | null;
  productLabel?: string | null;
  loanProduct?: string | null;
}): string | null {
  const fromCode = resolveCanonicalProductCode(input?.productCode);
  if (fromCode && getCanonicalProductByCode(fromCode)) return fromCode;
  if (fromCode) return fromCode;

  const label = (input?.productLabel || input?.loanProduct || "").trim().toLowerCase();
  if (!label) return null;
  const byLabel = LENDER_REGISTRY_PRODUCT_OPTIONS.find(
    (p) => p.label.toLowerCase() === label,
  );
  if (byLabel) return resolveCanonicalProductCode(byLabel.code);
  const fuzzy = LENDER_REGISTRY_PRODUCT_OPTIONS.find(
    (p) =>
      label.includes(p.label.toLowerCase()) ||
      p.label.toLowerCase().includes(label),
  );
  return fuzzy ? resolveCanonicalProductCode(fuzzy.code) : null;
}

/**
 * Returns true when the lender may be offered for the product.
 * - No product context → allow all active lenders.
 * - Empty/null productsSupported → allow (incomplete master; programs refine later).
 * - Populated productsSupported → require code match (canonical + alias aware).
 */
export function lenderSupportsProduct(
  productsSupported: string[] | null | undefined,
  productCode: string | null,
): boolean {
  const needed = resolveCanonicalProductCode(productCode);
  if (!needed) return true;
  if (!productsSupported || productsSupported.length === 0) return true;
  const normalized = new Set(
    productsSupported
      .map((p) => resolveCanonicalProductCode(String(p)))
      .filter(Boolean) as string[],
  );
  return normalized.has(needed);
}

/**
 * Program is compatible with product when:
 * - program has no productCode (regional / general program), or
 * - productCode matches the resolved Product Master code.
 */
export function programSupportsProduct(
  program: { productCode?: string | null; productId?: string | null },
  productCode: string | null,
): boolean {
  const needed = resolveCanonicalProductCode(productCode);
  if (!needed) return true;
  const code = resolveCanonicalProductCode(program.productCode);
  if (!code) return true;
  return code === needed;
}
