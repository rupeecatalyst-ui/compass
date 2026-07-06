/**
 * CRC-10.3A.1 — Credit & Risk Engine SSOT types.
 * Foundation only — no eligibility, scoring or lender-matching logic.
 */

/** Policy lifecycle — only `published` policies are active at runtime. */
export type PolicyLifecycleStatus =
  | "draft"
  | "validated"
  | "testing"
  | "approved"
  | "published"
  | "archived";

export const POLICY_LIFECYCLE_ORDER: PolicyLifecycleStatus[] = [
  "draft",
  "validated",
  "testing",
  "approved",
  "published",
];

/** Immutable version record — never overwrite previous versions. */
export interface CreditRiskPolicyVersion {
  id: string;
  policyId: string;
  policyName: string;
  majorVersion: number;
  minorVersion: number;
  status: PolicyLifecycleStatus;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdBy: string;
  approvedBy?: string;
  publishedBy?: string;
  publishedDate?: string;
  lastModified: string;
  /** Resolved display names — sourced from respective masters at read time. */
  lenderId: string;
  lenderName: string;
  productId: string;
  productName: string;
}

/**
 * Policy hierarchy (configuration tree).
 * Policy → Lender → Product → Customer Category → Property Type →
 * Property Occupancy → Geography → Financial Parameters → Decision Rules → Version
 */
export interface CreditRiskPolicyHierarchy {
  policyId: string;
  lenderId: string;
  productId: string;
  customerCategoryId?: string;
  propertyTypeId?: string;
  propertyOccupancyId?: string;
  geographyId?: string;
  financialParametersId?: string;
  decisionRulesId?: string;
  versionId: string;
}

/** Policy rule section — groups rule references within a policy. */
export type PolicyRuleSectionId =
  | "financial"
  | "property"
  | "banking"
  | "bureau"
  | "customer"
  | "geography"
  | "compliance"
  | "custom";

/**
 * Version-pinned rule reference — policies never duplicate business logic.
 * Published policies retain pinned versions until explicitly upgraded.
 */
export interface PolicyRuleReference {
  id: string;
  policyId: string;
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  sectionId: PolicyRuleSectionId;
  majorVersion: number;
  minorVersion: number;
  sortOrder: number;
}

/** Summary row for Policy Library cards. */
export interface CreditRiskPolicySummary extends CreditRiskPolicyVersion {
  policyCode: string;
  description: string;
  priority: number;
  approvalAuthority: string;
  customerCategoryId?: string;
  customerCategoryName?: string;
}

/** Policy Library dashboard KPI snapshot. */
export interface PolicyLibraryDashboardMetrics {
  totalPolicies: number;
  activePolicies: number;
  draftPolicies: number;
  publishedPolicies: number;
  pendingApprovalPolicies: number;
  recentlyModified: number;
  policyCategories: number;
}

/** Non-blocking validation warning from policy rule composition checks. */
export interface PolicyValidationWarning {
  code: "duplicate_rule" | "missing_category" | "missing_pair";
  severity: "error" | "warning";
  message: string;
  ruleId?: string;
  categoryId?: string;
}

/** Dependency view — policy pinned version vs latest rule version. */
export interface PolicyRuleUpgradeHint {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  sectionId: PolicyRuleSectionId;
  pinnedVersion: string;
  latestVersion: string;
  ruleLastModified: string;
  upgradeRecommended: boolean;
}

export type PolicyAuditAction =
  | "Created"
  | "Updated"
  | "Validated"
  | "Tested"
  | "Approved"
  | "Published"
  | "Archived";

/** Audit entry — every change records who, what, when, old/new value, version. */
export interface CreditRiskAuditEntry {
  id: string;
  policyId: string;
  policyName: string;
  versionLabel: string;
  actor: string;
  action: string;
  timestamp: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

/** Dashboard KPI snapshot. */
export interface CreditRiskDashboardMetrics {
  activeLenders: number;
  activePolicies: number;
  draftPolicies: number;
  publishedPolicies: number;
  pendingApprovalPolicies: number;
  latestPublishedVersion: string;
  recentlyModifiedCount: number;
}

/** Lender master record — unlimited lenders, no hardcoded business rules. */
export interface CreditRiskLenderRecord {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  sortOrder: number;
}

/** Future rule-engine placeholder (no calculations in this sprint). */
export interface FutureRiskEnginePlaceholder {
  id: string;
  name: string;
  description: string;
  status: "planned" | "in_design" | "foundation_ready";
}

export type CreditRiskEngineSectionId =
  | "overview"
  | "policy-library"
  | "rule-library"
  | "lenders"
  | "products"
  | "customer-categories"
  | "property-configuration"
  | "financial-metrics"
  | "risk-models"
  | "eligibility-models"
  | "decision-matrix"
  | "policy-simulator"
  | "version-history"
  | "audit-trail"
  | "settings";
