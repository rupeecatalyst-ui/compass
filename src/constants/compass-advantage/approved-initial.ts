/**
 * Product Owner-approved initial COMPASS Advantage configuration.
 * Seeded independently for HOME_LOAN and HOME_LOAN_BT. Not a COMPASS formula.
 */

import type { CompassAdvantageScheduleInput } from "@/types/compass-advantage-commercial";

export const COMPASS_ADVANTAGE_INITIAL_PRODUCTS = ["HOME_LOAN", "HOME_LOAN_BT"] as const;

export type CompassAdvantageInitialProductCode =
  (typeof COMPASS_ADVANTAGE_INITIAL_PRODUCTS)[number];

export const COMPASS_ADVANTAGE_PRODUCT_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "HOME_LOAN", label: "Home Loan" },
  { code: "HOME_LOAN_BT", label: "Home Loan Balance Transfer" },
  { code: "PERSONAL_LOAN", label: "Personal Loan" },
  { code: "BUSINESS_LOAN", label: "Business Loan" },
  { code: "LOAN_AGAINST_PROPERTY", label: "Loan Against Property" },
  { code: "WORKING_CAPITAL", label: "Working Capital" },
  { code: "CONSTRUCTION_FINANCE", label: "Construction Finance" },
  { code: "PROJECT_FINANCE", label: "Project Finance" },
];

export function isInitialAdvantageProduct(productCode: string): boolean {
  return (COMPASS_ADVANTAGE_INITIAL_PRODUCTS as readonly string[]).includes(productCode);
}

export function unavailableStatusWithoutSchedule(
  productCode: string,
): "not_available" | "product_not_applicable" {
  return isInitialAdvantageProduct(productCode) ? "not_available" : "product_not_applicable";
}

export function buildApprovedInitialSchedule(productCode: CompassAdvantageInitialProductCode): Omit<
  CompassAdvantageScheduleInput,
  "id" | "effectiveFrom"
> {
  return {
    productCode,
    versionNumber: 1,
    status: "published",
    advantageActive: true,
    changeReason: "Product Owner approved initial COMPASS Advantage commercial schedule.",
    ranges: [
      {
        rangeFromRupees: "0",
        rangeToRupees: "20000000",
        noUpperLimit: false,
        percentageRate: "0.003",
        customerDescription: "Percentage Advantage on requested loan amount.",
        internalNote: "Range 1 — below ₹2 crore. Percentage only.",
        active: true,
        displayOrder: 1,
        fixedBenefits: [],
      },
      {
        rangeFromRupees: "20000000",
        rangeToRupees: null,
        noUpperLimit: true,
        percentageRate: "0.003",
        customerDescription: "Percentage Advantage plus fixed benefits from ₹2 crore.",
        internalNote: "Range 2 — ₹2 crore and above.",
        active: true,
        displayOrder: 2,
        fixedBenefits: [
          {
            name: "NOI charges benefit",
            amountRupees: "15000",
            active: true,
            displayOrder: 1,
            customerDescription: "NOI charges benefit included in COMPASS Advantage.",
          },
          {
            name: "Additional benefit",
            amountRupees: "10000",
            active: true,
            displayOrder: 2,
            customerDescription: "Additional COMPASS Advantage benefit.",
          },
        ],
      },
    ],
  };
}
