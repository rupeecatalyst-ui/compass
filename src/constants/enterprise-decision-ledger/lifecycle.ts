/**
 * Enterprise Decision Ledger — lifecycle & configurable change categories.
 * Extensible: add categories without rewriting history.
 */

export const EDL_FRAMEWORK_VERSION = "1.0.0";

/** Configurable / extensible decision categories (Phase 1 SSOT). */
export const EDL_CHANGE_CATEGORIES = {
  COMMISSION_STRUCTURE: "commission_structure",
  PARTNER_COMMERCIALS: "partner_commercials",
  LENDER_COMMERCIALS: "lender_commercials",
  PRODUCT_RULES: "product_rules",
  CREDIT_POLICIES: "credit_policies",
  WORKFLOW_CONFIGURATION: "workflow_configuration",
  STAGE_CONFIGURATION: "stage_configuration",
  SLA_CONFIGURATION: "sla_configuration",
  DOCUMENT_CHECKLIST: "document_checklist",
  BUSINESS_RULES: "business_rules",
  POLICY_ENGINE_CONFIGURATION: "policy_engine_configuration",
  CREDIT_RISK_ENGINE_CONFIGURATION: "credit_risk_engine_configuration",
  EXPERIENCE_CONSOLE_CHANGES: "experience_console_changes",
  ORGANIZATION_SETTINGS: "organization_settings",
  USER_ROLE_CHANGES: "user_role_changes",
  PERMISSION_CHANGES: "permission_changes",
  COMMERCIAL_AGREEMENT: "commercial_agreement",
  IMMUTABLE_FACT_CORRECTION: "immutable_fact_correction",
  ENTERPRISE_ENGINE_CONFIGURATION: "enterprise_engine_configuration",
  OTHER: "other",
} as const;

export const EDL_CHANGE_CATEGORY_LABELS: Record<string, string> = {
  commission_structure: "Commission Structure",
  partner_commercials: "Partner Commercials",
  lender_commercials: "Lender Commercials",
  product_rules: "Product Rules",
  credit_policies: "Credit Policies",
  workflow_configuration: "Workflow Configuration",
  stage_configuration: "Stage Configuration",
  sla_configuration: "SLA Configuration",
  document_checklist: "Document Checklist",
  business_rules: "Business Rules",
  policy_engine_configuration: "Policy Engine Configuration",
  credit_risk_engine_configuration: "Credit & Risk Engine Configuration",
  experience_console_changes: "Experience Console Changes",
  organization_settings: "Organization Settings",
  user_role_changes: "User Role Changes",
  permission_changes: "Permission Changes",
  commercial_agreement: "Commercial Agreement",
  immutable_fact_correction: "Immutable Fact Correction",
  enterprise_engine_configuration: "Enterprise Engine Configuration",
  other: "Other",
};

export const EDL_CHANGE_TYPES = {
  CREATED: "created",
  UPDATED: "updated",
  VERSIONED: "versioned",
  PUBLISHED: "published",
  DEPRECATED: "deprecated",
  ARCHIVED: "archived",
  CORRECTED: "corrected",
  MIGRATED: "migrated",
} as const;

export const EDL_IMPACT_SCOPES = {
  GLOBAL: "global",
  TENANT: "tenant",
  ORGANIZATION: "organization",
  PRODUCT: "product",
  LENDER: "lender",
  PARTNER: "partner",
  POLICY: "policy",
  WORKFLOW: "workflow",
  ROLE: "role",
  ENTITY: "entity",
  TRANSACTION_FUTURE_ONLY: "transaction_future_only",
} as const;

/** Ledger ID prefix — permanent, unique. */
export const EDL_LEDGER_ID_PREFIX = "EDL";
