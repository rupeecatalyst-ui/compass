/**
 * Context-Aware Data Collection — visibility + sanitization.
 */

import {
  CONTEXT_SALARIED_FIELDS,
  CONTEXT_SALARIED_FORBIDDEN,
  CONTEXT_SALARIED_VALUE_KEYS,
  CONTEXT_SELF_EMPLOYED_FIELDS,
  CONTEXT_SELF_EMPLOYED_FORBIDDEN,
  CONTEXT_SELF_EMPLOYED_VALUE_KEYS,
  LOAN_INITIATION_ALL_FINANCIAL_VALUE_KEYS,
  LOAN_INITIATION_FINANCIAL_FIELDS,
  LOAN_INITIATION_FINANCIAL_PROFILE_LABELS,
} from "@/constants/context-aware-data-collection";
import { normalizeEcmEmploymentTypeId } from "@/constants/enterprise-contact-master";
import type {
  ContextAwareFieldKey,
  ContextAwareVisibility,
  ContextCustomerCategory,
  ContextCustomerFamily,
  LoanInitiationFinancialFieldKey,
  LoanInitiationFinancialFormValueKey,
  LoanInitiationFinancialProfile,
  LoanInitiationFinancialVisibility,
} from "@/types/context-aware-data-collection";

/** Normalize free-form category / employment labels into a canonical category. */
export function resolveContextCustomerCategory(
  raw?: string | null,
): ContextCustomerCategory {
  if (!raw) return "";

  const ecm = normalizeEcmEmploymentTypeId(raw);
  if (ecm === "salaried") return "salaried";
  if (ecm === "self-employed-professional") return "self_employed_professional";
  if (ecm === "self-employed-business") return "self_employed_business";

  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "salaried" || s.startsWith("salaried")) return "salaried";
  if (s === "nri" || s.includes("nri")) return "nri";
  if (s === "self_employed_professional" || s.includes("professional")) {
    return "self_employed_professional";
  }
  if (
    s === "self_employed_business" ||
    s === "self_employed" ||
    s.includes("self_employed") ||
    s.includes("business")
  ) {
    return "self_employed_business";
  }
  if (ecm === "other" || s === "other") return "other";
  return "other";
}

export function resolveContextCustomerFamily(
  categoryOrEmployment?: string | null,
): ContextCustomerFamily {
  const category = resolveContextCustomerCategory(categoryOrEmployment);
  if (category === "salaried" || category === "nri") return "salaried";
  if (
    category === "self_employed_professional" ||
    category === "self_employed_business"
  ) {
    return "self_employed";
  }
  return "unknown";
}

export function getContextAwareVisibility(
  categoryOrEmployment?: string | null,
): ContextAwareVisibility {
  const category = resolveContextCustomerCategory(categoryOrEmployment);
  const family = resolveContextCustomerFamily(category);

  let keys: readonly ContextAwareFieldKey[] = [];
  if (family === "salaried") keys = CONTEXT_SALARIED_FIELDS;
  if (family === "self_employed") keys = CONTEXT_SELF_EMPLOYED_FIELDS;

  const visible = new Set<ContextAwareFieldKey>(keys);

  return {
    family,
    category,
    visible,
    isVisible: (key) => visible.has(key),
    isSalariedFamily: family === "salaried",
    isSelfEmployedFamily: family === "self_employed",
  };
}

export function isContextFieldVisible(
  categoryOrEmployment: string | null | undefined,
  key: ContextAwareFieldKey,
): boolean {
  return getContextAwareVisibility(categoryOrEmployment).isVisible(key);
}

/**
 * Strip values that belong to the opposite family so they cannot affect calculations.
 */
export function sanitizeValuesForCustomerCategory<T extends Record<string, unknown>>(
  values: T,
  categoryOrEmployment?: string | null,
): T {
  const family = resolveContextCustomerFamily(categoryOrEmployment);
  if (family === "unknown") return values;

  const next = { ...values };
  const clearKeys =
    family === "salaried"
      ? CONTEXT_SELF_EMPLOYED_VALUE_KEYS
      : CONTEXT_SALARIED_VALUE_KEYS;

  for (const key of clearKeys) {
    if (key in next) {
      (next as Record<string, unknown>)[key] = typeof next[key] === "number" ? 0 : "";
    }
  }
  return next;
}

export function isFieldForbiddenForFamily(
  family: ContextCustomerFamily,
  key: ContextAwareFieldKey,
): boolean {
  if (family === "salaried") return CONTEXT_SALARIED_FORBIDDEN.includes(key);
  if (family === "self_employed") return CONTEXT_SELF_EMPLOYED_FORBIDDEN.includes(key);
  return false;
}

/** Map Analyze Deal / UI category to ECM employment type id. */
export function contextCategoryToEcmEmploymentId(
  category: ContextCustomerCategory,
): string {
  switch (category) {
    case "salaried":
    case "nri":
      return "salaried";
    case "self_employed_professional":
      return "self-employed-professional";
    case "self_employed_business":
      return "self-employed-business";
    default:
      return "other";
  }
}

export function isWorkingCapitalProduct(product?: string | null): boolean {
  if (!product) return false;
  const p = product.trim().toLowerCase();
  return p.includes("working capital") || p.includes("working-capital") || p === "wc";
}

/**
 * Resolve Loan Initiation financial profile from Customer Type + Product (+ employment).
 * Customer Type / Product win over employment for Corporate and MSME WC.
 */
export function resolveLoanInitiationFinancialProfile(input: {
  customerType?: string | null;
  loanProduct?: string | null;
  employmentType?: string | null;
}): LoanInitiationFinancialProfile {
  const customerType = (input.customerType ?? "").trim().toLowerCase();
  const product = input.loanProduct ?? "";
  const employmentFamily = resolveContextCustomerFamily(input.employmentType);

  if (customerType === "corporate") return "corporate";

  if (customerType === "msme" && isWorkingCapitalProduct(product)) {
    return "msme_working_capital";
  }

  if (customerType === "professional") return "self_employed_individual";

  if (customerType === "msme") return "self_employed_individual";

  // Individual (default) — employment decides salaried vs self-employed
  if (employmentFamily === "self_employed") return "self_employed_individual";
  return "salaried_individual";
}

export function getLoanInitiationFinancialVisibility(input: {
  customerType?: string | null;
  loanProduct?: string | null;
  employmentType?: string | null;
}): LoanInitiationFinancialVisibility {
  const profile = resolveLoanInitiationFinancialProfile(input);
  const fields = LOAN_INITIATION_FINANCIAL_FIELDS[profile];
  const visibleKeys = new Set(fields.map((f) => f.key));
  const requiredKeys = fields.filter((f) => f.required).map((f) => f.formValueKey);

  return {
    profile,
    profileLabel: LOAN_INITIATION_FINANCIAL_PROFILE_LABELS[profile],
    fields,
    isVisible: (key: LoanInitiationFinancialFieldKey) => visibleKeys.has(key),
    requiredKeys,
  };
}

/**
 * Clear financial values that are not part of the active Loan Initiation profile.
 * Irrelevant values must not influence assessment.
 */
export function sanitizeLoanInitiationFinancialValues<T extends Record<string, unknown>>(
  values: T,
  input: {
    customerType?: string | null;
    loanProduct?: string | null;
    employmentType?: string | null;
  },
): T {
  const visibility = getLoanInitiationFinancialVisibility(input);
  const keep = new Set(visibility.fields.map((f) => f.formValueKey));
  const next = { ...values };

  for (const key of LOAN_INITIATION_ALL_FINANCIAL_VALUE_KEYS) {
    if (keep.has(key)) continue;
    if (!(key in next)) continue;
    (next as Record<string, unknown>)[key] = key === "existingBank" ? "" : undefined;
  }

  if ("monthlyIncome" in next) {
    const primary = primaryAssessmentAmountFromFinancialValues(next, visibility.profile);
    (next as Record<string, unknown>).monthlyIncome = primary ?? undefined;
  }

  return next;
}

/** Primary assessment amount used by downstream loan scoring / notes. */
export function primaryAssessmentAmountFromFinancialValues(
  values: Record<string, unknown>,
  profile: LoanInitiationFinancialProfile,
): number | undefined {
  const num = (key: LoanInitiationFinancialFormValueKey) => {
    const v = values[key];
    return typeof v === "number" && v > 0 ? v : undefined;
  };

  switch (profile) {
    case "salaried_individual":
      return num("monthlyGrossSalary") ?? num("netSalary");
    case "self_employed_individual":
      return num("annualBusinessIncome") ?? num("itrIncome");
    case "corporate":
    case "msme_working_capital":
      return num("annualTurnover") ?? num("gstTurnover");
    default:
      return undefined;
  }
}
