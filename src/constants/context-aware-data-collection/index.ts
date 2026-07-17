import type {
  ContextAwareFieldKey,
  ContextCustomerCategory,
  ContextCustomerFamily,
} from "@/types/context-aware-data-collection";

export const CONTEXT_AWARE_PRINCIPLE_VERSION = "1.0";

export const CONTEXT_CUSTOMER_CATEGORY_OPTIONS: ReadonlyArray<{
  value: Exclude<ContextCustomerCategory, "">;
  label: string;
  family: ContextCustomerFamily;
}> = [
  { value: "salaried", label: "Salaried", family: "salaried" },
  {
    value: "self_employed_professional",
    label: "Self-Employed Professional",
    family: "self_employed",
  },
  {
    value: "self_employed_business",
    label: "Self-Employed Business",
    family: "self_employed",
  },
  { value: "nri", label: "NRI", family: "salaried" },
  { value: "other", label: "Other", family: "unknown" },
];

/** Fields always relevant once a category is known (plus product gates elsewhere). */
export const CONTEXT_SHARED_FIELDS: readonly ContextAwareFieldKey[] = [
  "existing_emi",
  "cibil",
];

export const CONTEXT_SALARIED_FIELDS: readonly ContextAwareFieldKey[] = [
  "salary",
  "employer",
  "employment_type",
  "salary_credits",
  ...CONTEXT_SHARED_FIELDS,
];

export const CONTEXT_SELF_EMPLOYED_FIELDS: readonly ContextAwareFieldKey[] = [
  "business_turnover",
  "business_vintage",
  "gst",
  "itr",
  "banking",
  "profit",
  "balance_sheet",
  "rental_income",
  ...CONTEXT_SHARED_FIELDS,
];

/** Never show for salaried family. */
export const CONTEXT_SALARIED_FORBIDDEN: readonly ContextAwareFieldKey[] = [
  "business_turnover",
  "business_vintage",
  "gst",
  "itr",
  "banking",
  "profit",
  "balance_sheet",
  "rental_income",
  "gross_margin",
  "banking_surrogate",
  "profit_and_loss",
  "cma",
  "business_banking",
];

/** Never show for self-employed family. */
export const CONTEXT_SELF_EMPLOYED_FORBIDDEN: readonly ContextAwareFieldKey[] = [
  "salary",
  "employer",
  "salary_credits",
];

export const CONTEXT_FIELD_LABELS: Record<ContextAwareFieldKey, string> = {
  existing_emi: "Existing EMI",
  cibil: "CIBIL",
  property_details: "Property Details",
  salary: "Salary / Monthly Income",
  employer: "Employer",
  employment_type: "Employment Type",
  salary_credits: "Salary Credits",
  business_turnover: "Business Turnover",
  business_vintage: "Business Vintage",
  gst: "GST",
  itr: "ITR",
  banking: "Banking",
  profit: "Profit",
  balance_sheet: "Balance Sheet",
  rental_income: "Rental Income",
  gross_margin: "Gross Margin",
  banking_surrogate: "Banking Surrogate",
  profit_and_loss: "Profit & Loss",
  cma: "CMA",
  business_banking: "Business Banking",
};

/** Value keys that must be cleared when leaving a family (calculation hygiene). */
export const CONTEXT_SALARIED_VALUE_KEYS = [
  "monthlyIncome",
  "salary",
  "employer",
  "employerName",
  "employmentTypeDetail",
  "salaryCredits",
  "statedIncomeMonthly",
] as const;

export const CONTEXT_SELF_EMPLOYED_VALUE_KEYS = [
  "businessTurnover",
  "businessVintage",
  "gst",
  "itr",
  "banking",
  "profit",
  "balanceSheet",
  "rentalIncome",
  "grossMargin",
  "statedTurnover",
  "statedBusinessVintage",
  "statedNatureOfBusiness",
  "annualTurnover",
  "annualProfit",
  "annualGrossReceipts",
  "annualProfessionalIncome",
] as const;
