/**
 * Context-Aware Data Collection — platform contracts.
 * Forms adapt by Customer Category / Employment Type family.
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
