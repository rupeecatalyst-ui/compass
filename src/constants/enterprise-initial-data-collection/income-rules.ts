/**
 * Monthly income ceilings and requiredness — Catalyst One SSOT.
 * COMPASS and Partner Gateway must project these; they must not invent a second rule.
 */

export const MONTHLY_INCOME_FIELD_KEY = "monthlyIncomeLabel";
export const EMPLOYMENT_TYPE_FIELD_KEY = "employmentTypeCode";
export const ANNUAL_TURNOVER_FIELD_KEY = "annualTurnoverLabel";

/** Preserved COMPASS discovery minimum unless a later C1 catalog override exists. */
export const MONTHLY_INCOME_MIN = 25_000;

/** Salaried monthly-income ceiling (Indian Rupees). */
export const SALARIED_MONTHLY_INCOME_MAX = 7_50_000;

/** Self-employed monthly-income ceiling wherever monthly income is applicable. */
export const SELF_EMPLOYED_MONTHLY_INCOME_MAX = 10_00_000;

export const SALARIED_EMPLOYMENT_TYPE_CODES = ["salaried"] as const;

export const SELF_EMPLOYED_EMPLOYMENT_TYPE_CODES = [
  "self-employed-professional",
  "self-employed-business",
  "professional",
  "business",
] as const;

/** Authoritative financial-capacity keys that replace monthly income when supplied. */
export const TURNOVER_CAPACITY_FIELD_KEYS = [
  ANNUAL_TURNOVER_FIELD_KEY,
  "annualTurnover",
  "monthlyTurnoverLabel",
] as const;

export function isSalariedEmploymentType(code?: string | null): boolean {
  const n = (code || "").trim().toLowerCase();
  return (SALARIED_EMPLOYMENT_TYPE_CODES as readonly string[]).includes(n);
}

export function isSelfEmployedEmploymentType(code?: string | null): boolean {
  const n = (code || "").trim().toLowerCase();
  return (SELF_EMPLOYED_EMPLOYMENT_TYPE_CODES as readonly string[]).includes(n);
}

export function resolveMonthlyIncomeMax(employmentType?: string | null): number {
  if (isSalariedEmploymentType(employmentType)) return SALARIED_MONTHLY_INCOME_MAX;
  if (isSelfEmployedEmploymentType(employmentType)) return SELF_EMPLOYED_MONTHLY_INCOME_MAX;
  return SELF_EMPLOYED_MONTHLY_INCOME_MAX;
}

export function formatInrCeilingLabel(amount: number): string {
  if (amount >= 1_00_000 && amount % 1_00_000 === 0) {
    const lakh = amount / 1_00_000;
    return `₹${lakh.toLocaleString("en-IN")} Lakh`;
  }
  if (amount >= 1_00_000) {
    const lakh = amount / 1_00_000;
    const text = Number.isInteger(lakh) ? String(lakh) : lakh.toFixed(1).replace(/\.0$/, "");
    return `₹${text} Lakh`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function hasTurnoverCapacityValue(values: Record<string, string | number | null | undefined>): boolean {
  return TURNOVER_CAPACITY_FIELD_KEYS.some((key) => {
    const raw = values[key];
    if (raw == null) return false;
    if (typeof raw === "number") return Number.isFinite(raw) && raw > 0;
    const digits = String(raw).replace(/[^0-9.]/g, "");
    const n = Number(digits);
    return Boolean(String(raw).trim()) && Number.isFinite(n) && n > 0;
  });
}

/**
 * Monthly income requiredness.
 * Hidden / non-applicable fields are never required.
 * Salaried → required.
 * Self-employed with applicable turnover supplied → not required.
 * Self-employed without an applicable turnover field → required.
 */
export function isMonthlyIncomeRequired(input: {
  fieldVisible: boolean;
  employmentType?: string | null;
  turnoverFieldApplicable: boolean;
  values: Record<string, string | number | null | undefined>;
}): boolean {
  if (!input.fieldVisible) return false;
  if (isSalariedEmploymentType(input.employmentType)) return true;
  if (isSelfEmployedEmploymentType(input.employmentType)) {
    if (input.turnoverFieldApplicable && hasTurnoverCapacityValue(input.values)) {
      return false;
    }
    return true;
  }
  return Boolean(input.employmentType);
}
