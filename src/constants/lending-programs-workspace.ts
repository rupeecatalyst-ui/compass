/**
 * CO-LW-001 — Lending Programs Workspace constants.
 * CO-LW-004 — Product Family presentation (UI only — does not alter Product Registry).
 */

import type { BusinessFitKey } from "@/types/lending-programs-workspace";

export const LENDING_PROGRAMS_WORKSPACE_TITLE = "Lending Programs";
export const LENDING_PROGRAMS_WORKSPACE_SUBTITLE =
  "Lender · Product · Published programmes · Live pipeline";

export const LENDING_PROGRAMS_ACTIVE_DAYS = 180;

export const LENDING_PROGRAMS_SNAPSHOT_STORAGE_KEY =
  "catalyst.lending-programs.snapshot.v1";

export const LENDING_PROGRAMS_BUSINESS_FIT_LABELS: Record<BusinessFitKey, string> = {
  salaried: "Salaried",
  self_employed: "Self Employed",
  balance_transfer: "Balance Transfer",
  top_up: "Top-Up",
  ready_property: "Ready Property",
  under_construction: "Under Construction",
  msme: "MSME",
  working_capital: "Working Capital",
};

export const LENDING_PROGRAMS_BUSINESS_FIT_KEYS = Object.keys(
  LENDING_PROGRAMS_BUSINESS_FIT_LABELS,
) as BusinessFitKey[];

/** CHANAKYA Insights drawer pin preference (client only). */
export const LENDING_PROGRAMS_CHANAKYA_PIN_KEY =
  "catalyst.lending-programs.chanakya-drawer-pinned.v1";

/**
 * Presentation families for Product View navigation.
 * Maps onto Product Master groupCode / canonical codes — never invents registry rows.
 */
export type LpProductFamilyDefinition = {
  id: string;
  label: string;
  sortOrder: number;
  /** Product Master groupCode matches */
  groupCodes: string[];
  /** Optional explicit canonical product codes (narrower than group) */
  canonicalCodes?: string[];
};

export const LP_PRODUCT_FAMILY_DEFINITIONS: LpProductFamilyDefinition[] = [
  {
    id: "home_loan",
    label: "Home Loan",
    sortOrder: 1,
    groupCodes: ["HOUSING_LOANS"],
    canonicalCodes: ["HOME_LOAN", "HOME_LOAN_BT"],
  },
  {
    id: "lap",
    label: "Loan Against Property",
    sortOrder: 2,
    groupCodes: ["SECURED_LOANS"],
    canonicalCodes: ["LAP", "COMMERCIAL_MORTGAGE", "COMM_PURCHASE"],
  },
  {
    id: "working_capital",
    label: "Working Capital",
    sortOrder: 3,
    groupCodes: ["MSME_LOANS"],
    canonicalCodes: ["WORKING_CAPITAL_SECURED", "WORKING_CAPITAL_UNSECURED"],
  },
  {
    id: "business_finance",
    label: "Business Finance",
    sortOrder: 4,
    groupCodes: ["UNSECURED_LOANS", "MSME_LOANS"],
    canonicalCodes: ["BUSINESS_LOAN_UNSECURED"],
  },
  {
    id: "construction_finance",
    label: "Construction Finance",
    sortOrder: 5,
    groupCodes: ["CORPORATE_LOANS"],
    canonicalCodes: ["CONSTRUCTION_FINANCE"],
  },
  {
    id: "professional",
    label: "Professional Loans",
    sortOrder: 6,
    groupCodes: ["PROFESSIONAL_LOANS"],
  },
  {
    id: "corporate",
    label: "Corporate Loans",
    sortOrder: 7,
    groupCodes: ["CORPORATE_LOANS"],
  },
  {
    id: "other",
    label: "Other Products",
    sortOrder: 99,
    groupCodes: [],
  },
];

export const LP_CHART_COLORS = [
  "#0f766e",
  "#0284c7",
  "#c4a35a",
  "#7c3aed",
  "#ea580c",
  "#059669",
  "#e11d48",
  "#64748b",
] as const;