import type {
  RuleCategoryId,
  RuleDataType,
  RuleLifecycleStatus,
  RuleOperator,
  RuleScope,
  RuleType,
} from "@/types/rule-library";

export {
  RULE_INHERITANCE_LABELS,
  RULE_INHERITANCE_ORDER,
  RULE_SCOPE_LABELS,
  SCOPE_DEFAULT_INHERITANCE,
  compareInheritancePriority,
  getInheritancePriority,
  inheritsFromScope,
} from "@/constants/rule-inheritance";

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  validation: "Validation",
  calculation: "Calculation",
  eligibility: "Eligibility",
  decision: "Decision",
  scoring: "Scoring",
  recommendation: "Recommendation",
  display: "Display",
  workflow: "Workflow",
  exception: "Exception",
  compliance: "Compliance",
};

export const RULE_SCOPE_PILL_VARIANT: Record<
  RuleScope,
  "default" | "success" | "warning" | "error" | "info" | "muted"
> = {
  global: "info",
  organization: "default",
  lender: "default",
  product: "default",
  customer_category: "default",
  property: "success",
  geography: "warning",
  occupation: "muted",
  financial: "info",
  custom: "muted",
};

export const RULE_TYPE_PILL_VARIANT: Record<
  RuleType,
  "default" | "success" | "warning" | "error" | "info" | "muted"
> = {
  validation: "warning",
  calculation: "info",
  eligibility: "default",
  decision: "default",
  scoring: "success",
  recommendation: "default",
  display: "muted",
  workflow: "info",
  exception: "error",
  compliance: "warning",
};

export const RULE_CATEGORY_LABELS: Record<RuleCategoryId, string> = {
  financial: "Financial",
  property: "Property",
  bureau: "Bureau",
  banking: "Banking",
  customer: "Customer",
  geography: "Geography",
  custom: "Custom",
};

export const RULE_DATA_TYPE_LABELS: Record<RuleDataType, string> = {
  number: "Number",
  percentage: "Percentage",
  currency: "Currency (₹)",
  string: "String",
  boolean: "Boolean",
  date: "Date",
  enum: "Enumeration",
};

export const RULE_OPERATOR_LABELS: Record<RuleOperator, string> = {
  equals: "Equals",
  not_equals: "Not Equals",
  greater_than: "Greater Than",
  greater_than_or_equal: "Greater Than or Equal",
  less_than: "Less Than",
  less_than_or_equal: "Less Than or Equal",
  between: "Between",
  in: "In List",
  not_in: "Not In List",
  contains: "Contains",
};

export const RULE_STATUS_LABELS: Record<RuleLifecycleStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const RULE_STATUS_PILL_VARIANT: Record<
  RuleLifecycleStatus,
  "default" | "success" | "warning" | "error" | "info" | "muted"
> = {
  draft: "muted",
  published: "success",
  archived: "muted",
};

export function formatRuleVersion(major: number, minor: number): string {
  return `v${major}.${minor}`;
}

export function isRuleActive(status: RuleLifecycleStatus): boolean {
  return status === "published";
}

/** Operators available per data type — configuration-driven, not hardcoded per rule. */
export const OPERATORS_BY_DATA_TYPE: Record<RuleDataType, RuleOperator[]> = {
  number: ["equals", "not_equals", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "between"],
  percentage: ["equals", "not_equals", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "between"],
  currency: ["equals", "not_equals", "greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal", "between"],
  string: ["equals", "not_equals", "contains", "in", "not_in"],
  boolean: ["equals", "not_equals"],
  date: ["equals", "not_equals", "greater_than", "less_than", "between"],
  enum: ["equals", "not_equals", "in", "not_in"],
};
