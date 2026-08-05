/**
 * CO-LR-008 — Presentation-layer Lender Registry canonicalisation.
 *
 * Historical duplicate rows remain in the database for Deal/Opportunity FK continuity.
 * This module never deletes, disables, renames IDs, or rewrites relationships.
 *
 * Canonical = one survivor per identity family (normalised name / alias / code).
 * Legacy / Historical = other family members — hidden from selectors & matrix.
 */

import { normalizeLenderDuplicateKey, normalizeLenderNameKey } from "@/lib/enterprise-lender-registry/normalize";

export type LenderPresentationRole = "canonical" | "legacy";

export type LenderPresentationAnnotation = {
  presentationRole: LenderPresentationRole;
  presentationBadge: "Canonical" | "Legacy / Historical";
  presentationFamilyKey: string;
  canonicalSurvivorId?: string;
  canonicalSurvivorCode?: string;
};

export type LenderPresentationInput = {
  id?: string;
  code?: string | null;
  label: string;
  displayName?: string | null;
  legalName?: string | null;
  shortName?: string | null;
  aliases?: string[] | null;
  enabled?: boolean | null;
  sortOrder?: number | null;
  /** Prefer default / master seed rows when ranking survivors. */
  defaultRecord?: boolean | null;
};

export function resolveLenderSelectionFamilyKey(input: LenderPresentationInput): string {
  const candidates = [
    input.displayName,
    input.legalName,
    input.label,
    input.shortName,
    input.code,
    ...(Array.isArray(input.aliases) ? input.aliases : []),
  ]
    .map((v) => (typeof v === "string" ? normalizeLenderDuplicateKey(v) : ""))
    .filter((v) => v.length >= 2);

  if (candidates.length === 0) {
    const fallback = normalizeLenderNameKey(input.label || input.code || input.id || "unknown");
    return `lender:${fallback || "unknown"}`;
  }

  // Stable family key = shortest aggressive key (tends to strip legal suffixes consistently)
  candidates.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return `lender:${candidates[0]}`;
}

function rankOption(option: LenderPresentationInput): number {
  if (option.defaultRecord) return 0;
  if (option.enabled === false) return 3;
  const code = (option.code || "").trim().toUpperCase();
  if (code && !code.includes("_EXT") && !code.includes("LEGACY")) return 1;
  if (/legacy|ext$/i.test(code)) return 2;
  return 1;
}

export function preferCanonicalLenderSurvivor<T extends LenderPresentationInput>(
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
  if (existingSort < nextSort) return existing;
  // Prefer shorter display name (cleaner shortName) then stable id
  const existingLabel = (existing.displayName || existing.label || "").length;
  const nextLabel = (next.displayName || next.label || "").length;
  if (nextLabel > 0 && nextLabel < existingLabel) return next;
  return existing;
}

export function annotateLenderPresentation<T extends LenderPresentationInput>(
  option: T,
  survivor: T,
  familyKey: string,
): T & LenderPresentationAnnotation {
  const isSurvivor =
    (option.id && survivor.id && option.id === survivor.id) ||
    (option.code && survivor.code && option.code === survivor.code) ||
    (!option.id &&
      !survivor.id &&
      normalizeLenderNameKey(option.label) === normalizeLenderNameKey(survivor.label));

  return {
    ...option,
    presentationRole: isSurvivor ? "canonical" : "legacy",
    presentationBadge: isSurvivor ? "Canonical" : "Legacy / Historical",
    presentationFamilyKey: familyKey,
    canonicalSurvivorId: survivor.id,
    canonicalSurvivorCode: survivor.code ?? undefined,
  };
}

/**
 * Presentation-only: one lender per identity family for user-facing surfaces.
 * Preserves survivor Registry `id` / `code` — never remaps FKs.
 */
export function filterCanonicalLendersForPresentation<T extends LenderPresentationInput>(
  options: T[],
): Array<T & LenderPresentationAnnotation> {
  const enabled = options.filter((o) => o.enabled !== false);
  const families = new Map<string, T[]>();

  for (const option of enabled) {
    const family = resolveLenderSelectionFamilyKey(option);
    const bucket = families.get(family) ?? [];
    bucket.push(option);
    families.set(family, bucket);
  }

  const out: Array<T & LenderPresentationAnnotation> = [];
  for (const [familyKey, members] of families) {
    const survivor = members.reduce((best, row) => preferCanonicalLenderSurvivor(best, row));
    out.push(annotateLenderPresentation(survivor, survivor, familyKey));
  }

  return out.sort(
    (a, b) =>
      (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) ||
      (a.displayName || a.label).localeCompare(b.displayName || b.label, "en", {
        sensitivity: "base",
      }),
  );
}

/** Strip presentation annotations for callers that only need the survivor row. */
export function dedupeLendersForSelection<T extends LenderPresentationInput>(options: T[]): T[] {
  return filterCanonicalLendersForPresentation(options).map((row) => {
    const {
      presentationRole: _r,
      presentationBadge: _b,
      presentationFamilyKey: _f,
      canonicalSurvivorId: _i,
      canonicalSurvivorCode: _c,
      ...rest
    } = row;
    void _r;
    void _b;
    void _f;
    void _i;
    void _c;
    return rest as unknown as T;
  });
}
