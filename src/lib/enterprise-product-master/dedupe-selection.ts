/**
 * CO-PR-004 / CO-PR-005 / CO-BUG-002 — Presentation-only Product uniqueness.
 * Does not delete, disable, or rewrite Product Master records.
 *
 * Keeps the surviving row's real Registry `id` / `code`.
 * Only the visible label is normalized to the canonical Product Master label.
 */

import { normalizeProductLabelKey } from "@/constants/enterprise-product-master";
import {
  filterCanonicalProductsForPresentation,
  withCanonicalDisplayFields,
} from "@/lib/enterprise-product-master/presentation-canonical";

export type ProductSelectionOption = {
  code: string;
  label: string;
  isSecured?: boolean | null;
  sortOrder?: number;
  enabled?: boolean;
  id?: string;
};

/**
 * Enterprise Product Registry may contain historical duplicate codes
 * (HOME-LOAN + HL_STD, BUSINESS-LOAN + BL_STD, …).
 * Selection / matrix surfaces must show each business product exactly once.
 */
export function dedupeProductOptionsForSelection<T extends ProductSelectionOption>(
  options: T[],
): T[] {
  const canonical = filterCanonicalProductsForPresentation(
    options.filter((o) => o.enabled !== false),
  );
  return canonical
    .map((option) => {
      const { presentationRole: _r, presentationBadge: _b, presentationFamilyKey: _f, canonicalSurvivorId: _i, canonicalSurvivorCode: _c, ...rest } = option;
      void _r;
      void _b;
      void _f;
      void _i;
      void _c;
      return withCanonicalDisplayFields(rest as unknown as T);
    })
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        normalizeProductLabelKey(a.label).localeCompare(normalizeProductLabelKey(b.label)),
    );
}
