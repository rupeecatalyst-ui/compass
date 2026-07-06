import type {
  RuleInheritanceLevel,
  RuleScope,
  RuleType,
} from "@/types/rule-library";

export const RULE_SCOPE_LABELS: Record<RuleScope, string> = {
  global: "Global",
  organization: "Organization",
  lender: "Lender",
  product: "Product",
  customer_category: "Customer Category",
  property: "Property",
  geography: "Geography",
  occupation: "Occupation",
  financial: "Financial",
  custom: "Custom",
};

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

export const RULE_INHERITANCE_LABELS: Record<RuleInheritanceLevel, string> = {
  global: "Global",
  organization: "Organization",
  lender: "Lender",
  product: "Product",
  customer: "Customer",
  loan: "Loan",
};

/**
 * Override priority — index 0 is lowest priority (overridden by all below).
 * Lower levels override higher levels when explicitly configured.
 */
export const RULE_INHERITANCE_ORDER: RuleInheritanceLevel[] = [
  "global",
  "organization",
  "lender",
  "product",
  "customer",
  "loan",
];

/** Default inheritance level derived from rule scope when not explicitly set. */
export const SCOPE_DEFAULT_INHERITANCE: Record<RuleScope, RuleInheritanceLevel> = {
  global: "global",
  organization: "organization",
  lender: "lender",
  product: "product",
  customer_category: "customer",
  property: "loan",
  geography: "loan",
  occupation: "loan",
  financial: "global",
  custom: "loan",
};

export function getInheritancePriority(level: RuleInheritanceLevel): number {
  return RULE_INHERITANCE_ORDER.indexOf(level);
}

export function compareInheritancePriority(
  a: RuleInheritanceLevel,
  b: RuleInheritanceLevel,
): number {
  return getInheritancePriority(a) - getInheritancePriority(b);
}

export function inheritsFromScope(scope: RuleScope): RuleInheritanceLevel {
  return SCOPE_DEFAULT_INHERITANCE[scope];
}
