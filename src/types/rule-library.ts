/**
 * CRC-10.3A.2 — Rule Library SSOT types.
 * Policies reference rules from this library — no duplicated business logic.
 */

export type RuleLifecycleStatus = "draft" | "published" | "archived";

/** Mandatory classification — where the rule applies in the domain model. */
export type RuleScope =
  | "global"
  | "organization"
  | "lender"
  | "product"
  | "customer_category"
  | "property"
  | "geography"
  | "occupation"
  | "financial"
  | "custom";

/** Mandatory classification — what the rule does in the engine. */
export type RuleType =
  | "validation"
  | "calculation"
  | "eligibility"
  | "decision"
  | "scoring"
  | "recommendation"
  | "display"
  | "workflow"
  | "exception"
  | "compliance";

/** Mandatory governance — business criticality for workflow, alerts and approvals. */
export type RuleSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "informational";

/** Configurable master (Admin) — rule owner team. */
export type RuleOwnerId =
  | "credit_team"
  | "risk_team"
  | "operations"
  | "compliance"
  | "finance"
  | "admin"
  | "other";

/** Configurable master (Admin) — governance review cycle. */
export type RuleReviewCycleId =
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "annually"
  | "on_regulatory_change"
  | "manual";

/** Derived at runtime via computeReviewStatus() — never stored on RuleLibraryVersion. */
export type RuleReviewStatus = "upcoming" | "due_soon" | "due_today" | "overdue" | "reviewed";

/**
 * Inheritance override hierarchy — lower levels override higher when explicitly configured.
 * Global → Organization → Lender → Product → Customer → Loan
 */
export type RuleInheritanceLevel =
  | "global"
  | "organization"
  | "lender"
  | "product"
  | "customer"
  | "loan";

/** Configurable rule categories — admin can extend via Custom. */
export type RuleCategoryId =
  | "financial"
  | "property"
  | "bureau"
  | "banking"
  | "customer"
  | "geography"
  | "custom";

export type RuleDataType =
  | "number"
  | "percentage"
  | "currency"
  | "string"
  | "boolean"
  | "date"
  | "enum";

export type RuleOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "greater_than_or_equal"
  | "less_than"
  | "less_than_or_equal"
  | "between"
  | "in"
  | "not_in"
  | "contains";

/** Immutable rule version — never overwrite published rules. */
export interface RuleLibraryVersion {
  id: string;
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  description: string;
  /** Mandatory — rule scope classification. */
  ruleScope: RuleScope;
  /** Mandatory — rule type classification. */
  ruleType: RuleType;
  /** Mandatory — business criticality for governance and future engines. */
  ruleSeverity: RuleSeverity;
  /** Inheritance level for override resolution. */
  inheritanceLevel: RuleInheritanceLevel;
  categoryId: RuleCategoryId;
  subCategory: string;
  dataType: RuleDataType;
  operator: RuleOperator;
  value: string;
  /** Upstream rule dependencies (rule-to-rule composition). */
  dependsOnRuleIds: string[];
  applicableProducts: string[];
  applicableCustomerCategories: string[];
  applicablePropertyTypes: string[];
  applicableOccupancy: string[];
  status: RuleLifecycleStatus;
  majorVersion: number;
  minorVersion: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdBy: string;
  publishedBy?: string;
  publishedDate?: string;
  lastModified: string;
  /** Governance — review events never deactivate rules automatically. */
  businessImpact: string;
  affectedSystems: string[];
  ruleOwnerId: RuleOwnerId;
  reviewCycleId: RuleReviewCycleId;
  /** Mandatory — used only for governance reminders; does NOT control rule activation. */
  nextReviewDate: string;
  lastReviewedOn?: string;
  lastReviewedBy?: string;
  businessJustification: string;
  approvalAuthority: string;
}

/** Policy binding — where a rule is referenced by a lending policy. */
export interface RulePolicyBinding {
  id: string;
  ruleId: string;
  policyId: string;
  policyName: string;
  lenderName: string;
  productName: string;
}

/** @deprecated Use RulePolicyBinding */
export type RuleDependency = RulePolicyBinding;

/** Rule-to-rule composition edge — for dependency graph & impact analysis. */
export interface RuleCompositionEdge {
  id: string;
  ruleId: string;
  dependsOnRuleId: string;
}

/** Resolved node for future dependency visualization. */
export interface RuleCompositionNode {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  ruleScope: RuleScope;
  ruleType: RuleType;
  ruleSeverity: RuleSeverity;
  status: RuleLifecycleStatus;
}

export interface RuleCompositionGraph {
  nodes: RuleCompositionNode[];
  edges: RuleCompositionEdge[];
}

/** Context for inheritance resolution — populated by engines in future sprints. */
export interface RuleInheritanceContext {
  organizationId?: string;
  lenderId?: string;
  productId?: string;
  customerCategoryId?: string;
  loanId?: string;
}

export interface RuleCategoryConfig {
  id: RuleCategoryId;
  label: string;
  description: string;
  enabled: boolean;
  sortOrder: number;
}

export interface RuleLibraryDashboardMetrics {
  totalRules: number;
  activeRules: number;
  draftRules: number;
  publishedRules: number;
  ruleCategories: number;
  recentlyUpdated: number;
  rulesDueThisWeek: number;
  rulesDueToday: number;
  rulesOverdue: number;
  recentlyReviewed: number;
  upcomingReviews: number;
}

export interface RuleSimulationInput {
  sampleValue: string;
}

export interface RuleSimulationResult {
  passed: boolean;
  message: string;
  evaluatedAt: string;
}

export interface RuleImpactSummary {
  ruleId: string;
  dependentRuleCount: number;
  policyBindingCount: number;
  dependentRules: RuleCompositionNode[];
}

/** Audit entry when rule severity changes. */
export interface RuleSeverityAuditEntry {
  id: string;
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  oldSeverity: RuleSeverity | null;
  newSeverity: RuleSeverity;
  changedBy: string;
  changedOn: string;
  reason?: string;
}

/** Audit entry for governance review events (does NOT change activation). */
export interface RuleReviewAuditEntry {
  id: string;
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  reviewedBy: string;
  reviewedOn: string;
  comments?: string;
  nextReviewDate: string;
}
