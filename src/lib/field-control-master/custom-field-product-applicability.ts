/**
 * Product applicability for operational custom fields.
 * Undeclared applicability, and a declared list with no product codes, does not filter.
 * This is not Product Programme eligibility.
 */
export function productApplicabilityPermits(
  definition: { applicabilityDeclared?: boolean; productApplicabilityJson?: unknown } | undefined,
  domain: string,
  productCode: string | null,
): boolean {
  if (domain !== "opportunity" && domain !== "deal") return true;
  if (!definition || definition.applicabilityDeclared !== true) return true;
  const raw = definition.productApplicabilityJson;
  const codes = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  if (codes.length === 0) return true;
  if (!productCode) return false;
  return codes.includes(productCode);
}
