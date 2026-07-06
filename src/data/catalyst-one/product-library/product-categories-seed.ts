import type { ProductCategory } from "@/types/product-library";

export const DEFAULT_PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: "cat_lending",
    categoryCode: "LENDING",
    categoryName: "Lending",
    description: "Credit and loan products offered by the organization.",
    sortOrder: 1,
    enabled: true,
  },
  {
    id: "cat_investment",
    categoryCode: "INVESTMENT",
    categoryName: "Investment",
    description: "Wealth and investment products.",
    sortOrder: 2,
    enabled: true,
  },
  {
    id: "cat_insurance",
    categoryCode: "INSURANCE",
    categoryName: "Insurance",
    description: "Risk protection and insurance offerings.",
    sortOrder: 3,
    enabled: true,
  },
  {
    id: "cat_future",
    categoryCode: "FUTURE",
    categoryName: "Future Products",
    description: "Reserved category for upcoming product lines.",
    sortOrder: 4,
    enabled: true,
  },
];
