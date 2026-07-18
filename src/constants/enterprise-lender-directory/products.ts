/** CO-SPRINT-093 — Product Selection Bar (navigation, not filter chips). */

export interface ElwDirectoryProduct {
  id: string;
  label: string;
  /** Key into marketing LENDERS_BY_PRODUCT when available */
  offerSlug?: string;
}

export const ELW_DIRECTORY_PRODUCTS: readonly ElwDirectoryProduct[] = [
  { id: "home-loan", label: "Home Loan", offerSlug: "home-loan" },
  {
    id: "home-loan-balance-transfer",
    label: "Home Loan Balance Transfer",
    offerSlug: "home-loan-balance-transfer",
  },
  {
    id: "loan-against-property",
    label: "Loan Against Property",
    offerSlug: "loan-against-property",
  },
  {
    id: "business-loan",
    label: "Business Loan",
    offerSlug: "unsecured-business-loan",
  },
  { id: "personal-loan", label: "Personal Loan", offerSlug: "personal-loan" },
  { id: "construction-funding", label: "Construction Funding" },
  { id: "working-capital", label: "Working Capital" },
  { id: "gold-loan", label: "Gold Loan" },
  { id: "loan-against-securities", label: "Loan Against Securities" },
] as const;

export const ELW_DIRECTORY_DEFAULT_PRODUCT_ID = ELW_DIRECTORY_PRODUCTS[0]!.id;

export const ELW_DIRECTORY_PAGE_SIZES = [20, 50, 100] as const;
