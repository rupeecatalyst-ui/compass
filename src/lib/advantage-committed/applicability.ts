import {
  ADVANTAGE_COMMITTED_APPLICABLE_PRODUCT_CODES,
  ADVANTAGE_COMMITTED_PRODUCT_ALIASES,
  type AdvantageCommittedApplicableProductCode,
} from "@/constants/advantage-committed";

function normalizeProductToken(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[—–]/g, "-")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/-/g, " ")
    .trim();
}

export function resolveAdvantageCommittedProductCode(
  productCode?: string | null,
  productLabel?: string | null,
): AdvantageCommittedApplicableProductCode | null {
  const candidates = [productCode, productLabel];
  for (const candidate of candidates) {
    const compact = (candidate ?? "").trim().toUpperCase().replace(/[\s_-]+/g, "");
    if (compact === "HOMELOAN" || compact === "HL") return "HOME_LOAN";
    if (
      compact === "HOMELOANBT" ||
      compact === "HLBT" ||
      compact === "HOMELOANBALANCETRANSFER"
    ) {
      return "HOME_LOAN_BT";
    }
    const spaced = normalizeProductToken(candidate);
    const alias = ADVANTAGE_COMMITTED_PRODUCT_ALIASES[spaced];
    if (alias) return alias;
    const underscored = (candidate ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (
      (ADVANTAGE_COMMITTED_APPLICABLE_PRODUCT_CODES as readonly string[]).includes(underscored)
    ) {
      return underscored as AdvantageCommittedApplicableProductCode;
    }
  }
  return null;
}

export function isAdvantageCommittedApplicableProduct(
  productCode?: string | null,
  productLabel?: string | null,
): boolean {
  return resolveAdvantageCommittedProductCode(productCode, productLabel) != null;
}
