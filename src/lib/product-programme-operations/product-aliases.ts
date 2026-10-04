import { CANONICAL_PRODUCT_MASTER_SEED } from "@/constants/enterprise-product-master/canonical-catalog";

const ALIAS_TO_CANONICAL = new Map<string, string>();

for (const product of CANONICAL_PRODUCT_MASTER_SEED) {
  ALIAS_TO_CANONICAL.set(product.code.toUpperCase(), product.code);
  for (const alias of product.aliases ?? []) {
    ALIAS_TO_CANONICAL.set(alias.trim().toUpperCase().replace(/[\s-]+/g, "_"), product.code);
    ALIAS_TO_CANONICAL.set(alias.trim().toUpperCase(), product.code);
  }
}

export function canonicalizeProductCode(code: string | null | undefined): string | null {
  const raw = (code ?? "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const underscored = upper.replace(/[\s-]+/g, "_");
  return ALIAS_TO_CANONICAL.get(upper) ?? ALIAS_TO_CANONICAL.get(underscored) ?? upper;
}

export function productCodesEquivalent(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = canonicalizeProductCode(left);
  const b = canonicalizeProductCode(right);
  return Boolean(a && b && a === b);
}

export function programmeIdentityKey(input: {
  lenderId: string;
  productCode?: string | null;
  lineageId?: string | null;
  id: string;
}): string {
  if (input.lineageId) return `${input.lenderId}:${input.lineageId}`;
  return `${input.lenderId}:${canonicalizeProductCode(input.productCode) ?? input.id}`;
}
