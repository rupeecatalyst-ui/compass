/**
 * Context-Aware Data Collection — platform contracts.
 * Forms adapt by Customer Category / Employment Type family,
 * and (for Loan Initiation) by Product + Customer Type.
 */

/** Canonical category keys used across Catalyst One surfaces. */
export type ContextCustomerCategory =
  | "salaried"
  | "self_employed_professional"
  | "self_employed_business"
  | "nri"
  | "other"
  | "";

/** Coarse families that drive field visibility. */
export type ContextCustomerFamily = "salaried" | "self_employed" | "unknown";

/**
 * Field keys controlled by category context.
 * Extend carefully — keep labels in constants.
 */
export type ContextAwareFieldKey =
  // Shared
  | "existing_emi"
  | "cibil"
  | "property_details"
  // Salaried family
  | "salary"
  | "employer"
  | "employment_type"
  | "salary_credits"
  // Self-employed family
  | "business_turnover"
  | "business_vintage"
  | "gst"
  | "itr"
  | "banking"
  | "profit"
  | "balance_sheet"
  | "rental_income"
  | "gross_margin"
  | "banking_surrogate"
  | "profit_and_loss"
  | "cma"
  | "business_banking";

export interface ContextAwareVisibility {
  family: ContextCustomerFamily;
  category: ContextCustomerCategory;
  visible: ReadonlySet<ContextAwareFieldKey>;
  isVisible: (key: ContextAwareFieldKey) => boolean;
  isSalariedFamily: boolean;
  isSelfEmployedFamily: boolean;
}

/** Loan Initiation — Product + Customer Type financial profiles. */
export type LoanInitiationFinancialProfile =
  | "salaried_individual"
  | "self_employed_individual"
  | "corporate"
  | "msme_working_capital";

export type LoanInitiationFinancialFieldKey =
  | "monthly_gross_salary"
  | "net_salary"
  | "existing_emi"
  | "annual_business_income"
  | "itr_income"
  | "gst_turnover"
  | "annual_turnover"
  | "annual_net_profit"
  | "ebitda"
  | "existing_wc_limits"
  | "existing_cc_od_limit"
  | "existing_bank";

export interface LoanInitiationFinancialFieldDef {
  key: LoanInitiationFinancialFieldKey;
  label: string;
  required: boolean;
  input: "currency" | "text";
  formValueKey: LoanInitiationFinancialFormValueKey;
}

/** Form value keys owned by the Loan Initiation financial section. */
export type LoanInitiationFinancialFormValueKey =
  | "monthlyGrossSalary"
  | "netSalary"
  | "existingEmi"
  | "annualBusinessIncome"
  | "itrIncome"
  | "gstTurnover"
  | "annualTurnover"
  | "annualNetProfit"
  | "ebitda"
  | "existingWcLimits"
  | "existingCcOdLimit"
  | "existingBank";

export interface LoanInitiationFinancialVisibility {
  profile: LoanInitiationFinancialProfile;
  profileLabel: string;
  fields: readonly LoanInitiationFinancialFieldDef[];
  isVisible: (key: LoanInitiationFinancialFieldKey) => boolean;
  requiredKeys: readonly LoanInitiationFinancialFormValueKey[];
}
