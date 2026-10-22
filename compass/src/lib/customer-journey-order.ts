/**
 * Public COMPASS presentation order for Home Loan.
 * Published stage ids stay owned by Catalyst One. This only arranges
 * the stages the published journey already returned.
 */

const HOME_LOAN_PRODUCTS = new Set(["home-loan", "home-loan-balance-transfer"]);

/**
 * After the published assessment and identity stages: Advantage, then lender matches.
 * Email and application stay where the published journey placed them among those stages.
 * A vacant application stage is skipped by navigation. The scripted analysing stage
 * is not shown; Best Lender Match runs the live request.
 */
const RESULT_ORDER = [
  "advantage",
  "lenders",
  "documents",
  "review",
  "confirmation",
] as const;

const HELD_FOR_RESULT_PATH = new Set<string>(["analysing", ...RESULT_ORDER]);

export const COMMERCIAL_UNAVAILABLE = "Not available";

export function presentCustomerJourneyStages(productCode: string, stages: readonly string[]): string[] {
  if (!HOME_LOAN_PRODUCTS.has(productCode)) return [...stages];
  const present = new Set(stages);
  const prefix = stages.filter((stage) => !HELD_FOR_RESULT_PATH.has(stage));
  const tail = RESULT_ORDER.filter((stage) => present.has(stage));
  return [...prefix, ...tail];
}

/** Pass through an API label. Absent source data stays unavailable. */
export function publishedCommercialLabel(value: string | null | undefined): string {
  const text = value?.trim();
  if (!text) return COMMERCIAL_UNAVAILABLE;
  return text;
}
