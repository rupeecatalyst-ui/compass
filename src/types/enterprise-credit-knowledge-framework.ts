/**
 * Enterprise Credit Knowledge Framework (ECKF) — Phase 1 contracts.
 * Master Product Blueprint knowledge architecture — no calculations.
 */

export type EckfProductId =
  | "home-loan"
  | "lap"
  | "business-loan"
  | "working-capital"
  | "construction-finance"
  | "personal-loan";

export type EckfSectionId =
  | "overview"
  | "customer_categories"
  | "credit_programs"
  | "income_assessment"
  | "eligibility"
  | "property_rules"
  | "documentation"
  | "risk_exceptions"
  | "special_programs"
  | "lender_variations"
  | "version_history";

export type EckfProgramStatus = "planned" | "blueprint" | "active_placeholder";

export type EckfCustomerCategoryKind = "salaried" | "self_employed" | "other";

export interface EckfProductNavItem {
  id: EckfProductId;
  label: string;
  shortLabel: string;
  emoji: string;
  available: boolean;
  description: string;
}

export interface EckfSectionDef {
  id: EckfSectionId;
  title: string;
  subtitle: string;
}

export interface EckfProductOverview {
  productName: string;
  description: string;
  purpose: string;
  typicalBorrower: string;
  securityType: string;
  repaymentType: string;
  futureNotes: string;
}

export interface EckfCustomerCategoryCard {
  id: string;
  kind: EckfCustomerCategoryKind;
  title: string;
  summary: string;
  placeholderBody: string;
}

export interface EckfCreditProgramCard {
  id: string;
  title: string;
  description: string;
  purpose: string;
  applicableCustomerType: string;
  status: EckfProgramStatus;
  futureNotes: string;
}

export interface EckfVersionHistoryEntry {
  id: string;
  version: string;
  at: string;
  summary: string;
  author: string;
}

export interface EckfPlaceholderSection {
  id: EckfSectionId;
  title: string;
  headline: string;
  body: string;
}

/** Master Product Blueprint — never lender-specific. */
export interface EckfProductBlueprint {
  productId: EckfProductId;
  overview: EckfProductOverview;
  customerCategories: EckfCustomerCategoryCard[];
  creditPrograms: EckfCreditProgramCard[];
  placeholders: EckfPlaceholderSection[];
  lenderVariationsNote: string;
  versionHistory: EckfVersionHistoryEntry[];
}
