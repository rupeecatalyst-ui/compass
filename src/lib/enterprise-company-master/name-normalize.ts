/**
 * Company name normalization for uniqueness validation (CO-SPRINT-117).
 * Display names preserve user casing; keys are trim + collapsed whitespace + lowercase.
 */

/** Trim and collapse internal whitespace for persistence display. */
export function formatCompanyDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Normalized key for duplicate detection — matches DB lower(company_name) index. */
export function normalizeCompanyNameKey(raw: string): string {
  return formatCompanyDisplayName(raw).toLowerCase();
}
