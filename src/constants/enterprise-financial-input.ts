/**
 * CO-UX-015 — Enterprise Financial Input SSOT constants.
 * Absolute rupee storage unchanged; UI units are presentation only.
 */

export type EnterpriseFinancialUnit = "thousand" | "lakh" | "crore";

export const ENTERPRISE_FINANCIAL_UNIT_MULTIPLIERS: Record<
  EnterpriseFinancialUnit,
  number
> = {
  thousand: 1_000,
  lakh: 1_00_000,
  crore: 1_00_00_000,
};

export const ENTERPRISE_FINANCIAL_UNIT_OPTIONS: ReadonlyArray<{
  value: EnterpriseFinancialUnit;
  label: string;
}> = [
  { value: "thousand", label: "Thousand" },
  { value: "lakh", label: "Lakh" },
  { value: "crore", label: "Crore" },
];

/** Default unit for new empty amounts (typical Indian loan ticket). */
export const ENTERPRISE_FINANCIAL_DEFAULT_UNIT: EnterpriseFinancialUnit = "lakh";
