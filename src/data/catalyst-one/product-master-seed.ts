import type { LendingType } from "@/types/catalyst-one";

/**
 * CRC-10.3 — Product Master seed (Admin Console will manage overrides at runtime).
 */
export interface ProductMasterEntry {
  id: string;
  name: string;
  isSecured: boolean;
  enabled: boolean;
  lendingType: LendingType;
  sortOrder: number;
}

export const DEFAULT_PRODUCT_MASTER: ProductMasterEntry[] = [
  { id: "home_loan", name: "Home Loan", isSecured: true, enabled: true, lendingType: "secured", sortOrder: 1 },
  { id: "home_loan_bt", name: "Home Loan Balance Transfer", isSecured: true, enabled: true, lendingType: "secured", sortOrder: 2 },
  { id: "lap", name: "Loan Against Property", isSecured: true, enabled: true, lendingType: "secured", sortOrder: 3 },
  { id: "working_capital", name: "Working Capital", isSecured: true, enabled: true, lendingType: "secured", sortOrder: 4 },
  { id: "construction_finance", name: "Construction Finance", isSecured: true, enabled: true, lendingType: "secured", sortOrder: 5 },
  { id: "commercial_property", name: "Commercial Property Loan", isSecured: true, enabled: true, lendingType: "secured", sortOrder: 6 },
  { id: "lrd", name: "Lease Rental Discounting", isSecured: true, enabled: true, lendingType: "secured", sortOrder: 7 },
  { id: "machinery_loan", name: "Machinery Loan", isSecured: true, enabled: true, lendingType: "secured", sortOrder: 8 },
  { id: "plot_loan", name: "Plot Loan", isSecured: true, enabled: true, lendingType: "secured", sortOrder: 9 },
  { id: "personal_loan", name: "Personal Loan", isSecured: false, enabled: true, lendingType: "unsecured", sortOrder: 10 },
  { id: "business_loan_unsecured", name: "Business Loan (Unsecured)", isSecured: false, enabled: true, lendingType: "unsecured", sortOrder: 11 },
  { id: "credit_card", name: "Credit Card", isSecured: false, enabled: true, lendingType: "unsecured", sortOrder: 12 },
];
