/**
 * CO-ARCH-003 Phase 2B Sprint 2 / CO-BUG-008 — Product Library ↔ Lender eligibility.
 * Eligibility derives from Product Library product codes and Lender Registry
 * `productsSupported` / commercial programs — never hard-coded lender lists.
 *
 * CO-BUG-008: empty/null `productsSupported` means master data is incomplete,
 * NOT "ineligible". Hard-excluding those lenders emptied Identify Additional Lender.
 */
import { LENDER_REGISTRY_PRODUCT_OPTIONS } from "@/types/enterprise-lender-registry";

/** Map Loan Workspace product labels → Product Library / Lender Registry codes. */
export function resolveProductLibraryCode(input?: {
  productCode?: string | null;
  productLabel?: string | null;
  loanProduct?: string | null;
}): string | null {
  const code = input?.productCode?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (code && LENDER_REGISTRY_PRODUCT_OPTIONS.some((p) => p.code === code)) {
    return code;
  }
  const label = (input?.productLabel || input?.loanProduct || "").trim().toLowerCase();
  if (!label) return null;
  const byLabel = LENDER_REGISTRY_PRODUCT_OPTIONS.find(
    (p) => p.label.toLowerCase() === label,
  );
  if (byLabel) return byLabel.code;
  const fuzzy = LENDER_REGISTRY_PRODUCT_OPTIONS.find(
    (p) =>
      label.includes(p.label.toLowerCase()) ||
      p.label.toLowerCase().includes(label),
  );
  return fuzzy?.code ?? null;
}

/**
 * Returns true when the lender may be offered for the product.
 * - No product context → allow all active lenders.
 * - Empty/null productsSupported → allow (incomplete master; programs refine later).
 * - Populated productsSupported → require code match.
 */
export function lenderSupportsProduct(
  productsSupported: string[] | null | undefined,
  productCode: string | null,
): boolean {
  if (!productCode) return true;
  if (!productsSupported || productsSupported.length === 0) return true;
  const normalized = productsSupported.map((p) =>
    String(p).trim().toLowerCase().replace(/[\s-]+/g, "_"),
  );
  return normalized.includes(productCode.toLowerCase());
}

/**
 * Program is compatible with product when:
 * - program has no productCode (regional / general program), or
 * - productCode matches the resolved Product Library code.
 */
export function programSupportsProduct(
  program: { productCode?: string | null; productId?: string | null },
  productCode: string | null,
): boolean {
  if (!productCode) return true;
  const code = (program.productCode || "").trim().toLowerCase();
  if (!code) return true;
  return code === productCode.toLowerCase();
}
