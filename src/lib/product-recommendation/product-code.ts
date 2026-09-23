import {
  canonicalizeProductCode,
  productCodesEquivalent,
} from "@/lib/product-programme-operations/product-aliases";

/**
 * Stored weight-SSOT codes that predate Product Master aliases.
 * Do not duplicate Product Master. Map only known existing table values.
 */
const WEIGHT_SSOT_STORED_CODES: Record<string, string> = {
  "home-loan-balance-transfer": "HOME_LOAN_BT",
};

export function canonicalizeRecommendationProductCode(code: string | null | undefined): string | null {
  const raw = (code ?? "").trim();
  if (!raw) return null;
  const stored = WEIGHT_SSOT_STORED_CODES[raw.toLowerCase()];
  if (stored) return stored;
  return canonicalizeProductCode(raw);
}

export function recommendationProductCodesEquivalent(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = canonicalizeRecommendationProductCode(left);
  const b = canonicalizeRecommendationProductCode(right);
  if (a && b && a === b) return true;
  return productCodesEquivalent(left, right);
}
