/**
 * CO-CHANAKYA-025 — Avon-style Product/Lender matrix depth fixtures (OPP-2026-000060 patterns).
 * Project Finance: matrix relationship may exist but program parameter depth is insufficient.
 */

import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export const AVON_PROJECT_FINANCE_OPPORTUNITY = {
  id: "opp_avon_pf_060",
  opportunityNumber: "OPP-2026-000060",
  productCode: "PROJECT_FINANCE",
  productLabel: "Project Finance",
  requestedAmount: 250_000_000,
  employmentTypeCode: "self-employed-business",
  cityLabel: "Ahmedabad",
  stateLabel: "Gujarat",
};

export const AVON_PROJECT_FINANCE_PRODUCT_RECORD = {
  id: "prod_project_finance",
  organizationId: "org_avon",
  categoryId: "cat_loan",
  groupId: "grp_corp",
  code: "PROJECT_FINANCE",
  label: "Project Finance",
  lifecycleStatus: "active" as const,
  operationalStatus: "active" as const,
  majorVersion: 1,
  minorVersion: 0,
  sortOrder: 110,
  status: "active" as const,
  enabled: true,
  isSecured: true,
  versionNumber: 1,
  isDeleted: false,
  approvalStatus: "approved" as const,
  createdBy: "system",
  modifiedBy: "system",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/** Matrix lists project_finance but no program parameters persisted (Avon depth gap). */
export const AVON_PROJECT_FINANCE_MATRIX_LENDERS = [
  {
    lenderId: "lender_infra_a",
    lenderCode: "INFRA_BANK_A",
    lenderName: "Infra Bank A",
    institutionCategory: "bank",
    productsSupported: ["project_finance", "construction_finance"],
    enabled: true,
    status: "active",
  },
  {
    lenderId: "lender_infra_b",
    lenderCode: "NBFC_INFRA_B",
    lenderName: "NBFC Infra B",
    institutionCategory: "nbfc",
    productsSupported: ["project_finance"],
    enabled: true,
    status: "active",
  },
];

/** Program shell without ROI/LTV/FOIR/DBR/ticket/geography — insufficient depth. */
export const AVON_PROJECT_FINANCE_SHALLOW_PROGRAM: EnterpriseLenderProgramRecord = {
  id: "prog_pf_shell",
  organizationId: "org_avon",
  lenderId: "lender_infra_a",
  productCode: "PROJECT_FINANCE",
  code: "PF_SHELL",
  label: "Project Finance — parameters pending",
  lifecycleStatus: "active",
  status: "active",
  enabled: true,
  versionNumber: 1,
  isDeleted: false,
  approvalStatus: "approved",
  createdBy: "system",
  modifiedBy: "system",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/** Home Loan deep program for positive matrix depth regression. */
export const AVON_HOME_LOAN_DEEP_PROGRAM: EnterpriseLenderProgramRecord = {
  id: "prog_hl_deep",
  organizationId: "org_avon",
  lenderId: "lender_hl_1",
  productCode: "HOME_LOAN",
  code: "HL_STD",
  label: "Home Loan Standard",
  lifecycleStatus: "active",
  status: "active",
  enabled: true,
  versionNumber: 1,
  roiPercent: 8.75,
  maxLtvPercent: 80,
  maxFoirPercent: 55,
  maxDbrPercent: 50,
  maxTenureMonths: 240,
  minFundingAmount: 500_000,
  maxFundingAmount: 50_000_000,
  eligibleStates: ["GJ", "MH"],
  eligibleCities: ["Ahmedabad", "Mumbai"],
  isDeleted: false,
  approvalStatus: "approved",
  createdBy: "system",
  modifiedBy: "system",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
