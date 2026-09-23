/**
 * Governed property-category values. Employment classifications are never valid here.
 */

export const GOVERNED_PROPERTY_CATEGORIES = ["residential", "commercial", "plot"] as const;
export type GovernedPropertyCategory = (typeof GOVERNED_PROPERTY_CATEGORIES)[number];

const EMPLOYMENT_OR_CUSTOMER_CLASSIFICATIONS = new Set([
  "salaried",
  "self_employed",
  "self-employed",
  "self-employed-professional",
  "self-employed-business",
  "self_employed_professional",
  "self_employed_business",
  "professional",
  "business",
  "nri",
  "company",
  "msme",
  "individual",
]);

export function normalizePropertyCategoryToken(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isGovernedPropertyCategory(raw: string | null | undefined): raw is GovernedPropertyCategory {
  const token = normalizePropertyCategoryToken(raw);
  return (GOVERNED_PROPERTY_CATEGORIES as readonly string[]).includes(token);
}

export function isEmploymentClassificationAsPropertyCategory(raw: string | null | undefined): boolean {
  return EMPLOYMENT_OR_CUSTOMER_CLASSIFICATIONS.has(normalizePropertyCategoryToken(raw));
}

export function rejectEmploymentAsPropertyCategory(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (isEmploymentClassificationAsPropertyCategory(value)) return null;
  if (!isGovernedPropertyCategory(value)) return null;
  return normalizePropertyCategoryToken(value);
}
