/**
 * Authorised individual housing-loan LTV ceiling structure.
 * This is a regulatory calculation library default — not lender policy.
 * An Active master version may override these slabs without a code change.
 *
 * Slab is applied to the resulting loan amount, not as a naive % of property value.
 */
export type RegulatoryLtvSlab = {
  /** Inclusive upper bound of the loan-amount slab. Null = no upper bound. */
  maxLoanAmountRupeesInclusive: number | null;
  maxLtvPercent: number;
};

export const AUTHORISED_INDIVIDUAL_HOUSING_LTV_SLABS: readonly RegulatoryLtvSlab[] = [
  { maxLoanAmountRupeesInclusive: 30_00_000, maxLtvPercent: 90 },
  { maxLoanAmountRupeesInclusive: 75_00_000, maxLtvPercent: 80 },
  { maxLoanAmountRupeesInclusive: null, maxLtvPercent: 75 },
];

export const AUTHORISED_INDIVIDUAL_HOUSING_LTV_SOURCE = {
  sourceLabel: "RBI individual housing-loan LTV ceilings (administrator-configured master)",
  sourceVersion: "authorised-library-default-v1",
  applicability: "individual_housing_loan",
  chargesIncludedInPropertyCost: false,
} as const;
