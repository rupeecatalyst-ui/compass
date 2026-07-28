import type { ProductCategory } from "@/types/product-library";

/**
 * CO-ADMIN-006 — Enterprise Product Category Master seed.
 * Business-facing taxonomy (labels shown in admin UI).
 */
export const DEFAULT_PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: "cat_loan_products",
    categoryCode: "LOAN_PRODUCTS",
    categoryName: "Loan Products",
    description: "Credit and loan products offered by the organization.",
    sortOrder: 1,
    enabled: true,
  },
  {
    id: "cat_investment_products",
    categoryCode: "INVESTMENT_PRODUCTS",
    categoryName: "Investment Products",
    description: "Wealth and investment products.",
    sortOrder: 2,
    enabled: true,
  },
  {
    id: "cat_insurance_products",
    categoryCode: "INSURANCE_PRODUCTS",
    categoryName: "Insurance Products",
    description: "Risk protection and insurance offerings.",
    sortOrder: 3,
    enabled: true,
  },
  {
    id: "cat_deposits",
    categoryCode: "DEPOSITS",
    categoryName: "Deposits",
    description: "Deposit and liability products.",
    sortOrder: 4,
    enabled: true,
  },
  {
    id: "cat_others",
    categoryCode: "OTHERS",
    categoryName: "Others",
    description: "Other enterprise product lines.",
    sortOrder: 5,
    enabled: true,
  },
];
