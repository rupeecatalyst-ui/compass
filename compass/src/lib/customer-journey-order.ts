/**
 * Public COMPASS presentation order for Home Loan.
 * Published stage ids stay owned by Catalyst One. This only arranges
 * the stages the published journey already returned.
 */

const HOME_LOAN_PRODUCTS = new Set(["home-loan", "home-loan-balance-transfer"]);

/** After assessment: Advantage, lender match, documents, then review. */
const RESULT_ORDER = [
  "analysing",
  "advantage",
  "lenders",
  "documents",
  "review",
  "confirmation",
] as const;

export const COMMERCIAL_UNAVAILABLE = "Not available";

export function presentCustomerJourneyStages(productCode: string, stages: readonly string[]): string[] {
  if (!HOME_LOAN_PRODUCTS.has(productCode)) return [...stages];
  const result = new Set<string>(RESULT_ORDER);
  const prefix = stages.filter((stage) => !result.has(stage));
  const tail = RESULT_ORDER.filter((stage) => stages.includes(stage));
  return [...prefix, ...tail];
}

/** Pass through an API label. Absent source data stays unavailable. */
export function publishedCommercialLabel(value: string | null | undefined): string {
  const text = value?.trim();
  if (!text) return COMMERCIAL_UNAVAILABLE;
  return text;
}
