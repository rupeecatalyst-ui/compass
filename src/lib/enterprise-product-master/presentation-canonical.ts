/**
 * CO-PR-005 — Presentation-layer Product Registry canonicalisation.
 *
 * Historical duplicate rows remain in the database for backward compatibility.
 * This module never deletes, disables, renames IDs, or rewrites Deal/Opportunity FKs.
 *
 * Canonical = one survivor per selection family (same rules as CO-PR-004).
 * Legacy / Historical = other family members — hidden from admin, selectors, matrix.
 */

import {
  CANONICAL_PRODUCT_MASTER_SEED,
  getCanonicalProductByCode,
  normalizeProductCodeKey,
  normalizeProductLabelKey,
  resolveProductSelectionFamilyKey,
} from "@/constants/enterprise-product-master";

export type ProductPresentationRole = "canonical" | "legacy";

export type ProductPresentationAnnotation = {
  presentationRole: ProductPresentationRole;
  /** User-facing badge for admin / reports. */
  presentationBadge: "Canonical" | "Legacy / Historical";
  presentationFamilyKey: string;
  /** Survivor Registry id when known. */
  canonicalSurvivorId?: string;
  /** Survivor Registry code when known. */
  canonicalSurvivorCode?: string;
};

export type ProductPresentationInput = {
  id?: string;
  code: string;
  label: string;
  sortOrder?: number | null;
  enabled?: boolean | null;
};

const CANONICAL_CODES = new Set(
  CANONICAL_PRODUCT_MASTER_SEED.map((p) => normalizeProductCodeKey(p.code)),
);

function isLibraryStyleCode(code: string): boolean {
  return /_STD$/i.test(code.trim());
}

function rankOption(option: ProductPresentationInput): number {
  const key = normalizeProductCodeKey(option.code);
  if (CANONICAL_CODES.has(key)) return 0;
  if (!isLibraryStyleCode(option.code)) return 1;
  return 2;
}

export function preferCanonicalSurvivor<T extends ProductPresentationInput>(
  existing: T,
  next: T,
): T {
  const existingRank = rankOption(existing);
  const nextRank = rankOption(next);
  if (nextRank < existingRank) return next;
  if (existingRank < nextRank) return existing;
  const existingSort = existing.sortOrder ?? 9999;
  const nextSort = next.sortOrder ?? 9999;
  if (nextSort < existingSort) return next;
  return existing;
}

export function withCanonicalDisplayFields<T extends ProductPresentationInput>(option: T): T {
  const canonical = getCanonicalProductByCode(option.code);
  if (!canonical) return option;
  return {
    ...option,
    label: canonical.label,
    sortOrder: option.sortOrder ?? canonical.sortOrder,
  };
}

function sameProductIdentity(a: ProductPresentationInput, b: ProductPresentationInput): boolean {
  if (a.id && b.id) return a.id === b.id;
  return normalizeProductCodeKey(a.code) === normalizeProductCodeKey(b.code);
}

/**
 * Annotate every product as Canonical or Legacy / Historical within its family.
 * Does not mutate database rows.
 */
export function classifyProductsForPresentation<T extends ProductPresentationInput>(
  products: T[],
): Array<T & ProductPresentationAnnotation> {
  const byFamily = new Map<string, T[]>();

  for (const product of products) {
    const family = resolveProductSelectionFamilyKey({
      code: product.code,
      label: product.label,
    });
    const bag = byFamily.get(family) ?? [];
    bag.push(product);
    byFamily.set(family, bag);
  }

  const survivorByFamily = new Map<string, T>();
  for (const [family, members] of byFamily) {
    const enabledMembers = members.filter((m) => m.enabled !== false);
    const pool = enabledMembers.length > 0 ? enabledMembers : members;
    let survivor = pool[0]!;
    for (let i = 1; i < pool.length; i++) {
      survivor = preferCanonicalSurvivor(survivor, pool[i]!);
    }
    survivorByFamily.set(family, survivor);
  }

  const annotated: Array<T & ProductPresentationAnnotation> = [];
  for (const product of products) {
    const family = resolveProductSelectionFamilyKey({
      code: product.code,
      label: product.label,
    });
    const survivor = survivorByFamily.get(family)!;
    const isCanonical =
      product.enabled !== false && sameProductIdentity(product, survivor);

    if (isCanonical) {
      annotated.push({
        ...withCanonicalDisplayFields(product),
        presentationRole: "canonical",
        presentationBadge: "Canonical",
        presentationFamilyKey: family,
        canonicalSurvivorId: survivor.id,
        canonicalSurvivorCode: survivor.code,
      });
    } else {
      annotated.push({
        ...product,
        presentationRole: "legacy",
        presentationBadge: "Legacy / Historical",
        presentationFamilyKey: family,
        canonicalSurvivorId: survivor.id,
        canonicalSurvivorCode: survivor.code,
      });
    }
  }

  return annotated.sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      normalizeProductLabelKey(a.label).localeCompare(normalizeProductLabelKey(b.label)) ||
      a.code.localeCompare(b.code),
  );
}

/** Admin / selector / matrix — only canonical survivors. */
export function filterCanonicalProductsForPresentation<T extends ProductPresentationInput>(
  products: T[],
): Array<T & ProductPresentationAnnotation> {
  return classifyProductsForPresentation(products).filter(
    (p) => p.presentationRole === "canonical",
  );
}
