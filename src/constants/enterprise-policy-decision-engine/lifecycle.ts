/**
 * EPDE lifecycle and framework constants.
 */

export const EPDE_FRAMEWORK_VERSION = "7.0.0";

export const EPDE_POLICY_LIFECYCLE_STATUS = {
  DRAFT: "draft",
  VALIDATED: "validated",
  APPROVED: "approved",
  PUBLISHED: "published",
  DEPRECATED: "deprecated",
  ARCHIVED: "archived",
} as const;

export const EPDE_POLICY_CATEGORIES = {
  ACCESS: "access",
  ELIGIBILITY: "eligibility",
  ROUTING: "routing",
  SCORING: "scoring",
  APPROVAL: "approval",
  COMPLIANCE: "compliance",
  GENERAL: "general",
} as const;

export const EPDE_SCOPE_TYPES = {
  GLOBAL: "global",
  TENANT: "tenant",
  ORGANIZATION: "organization",
  MODULE: "module",
  ENTITY: "entity",
} as const;

export const EPDE_CONFLICT_STRATEGIES = {
  PRIORITY: "priority",
  DENY_OVERRIDES: "deny_overrides",
  ALLOW_OVERRIDES: "allow_overrides",
  MERGE: "merge",
  FIRST_MATCH: "first_match",
} as const;

export const EPDE_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  draft: ["validated", "archived"],
  validated: ["approved", "draft", "archived"],
  approved: ["published", "draft", "archived"],
  published: ["deprecated", "archived"],
  deprecated: ["archived", "published"],
  archived: [],
};

export const EPDE_LIFECYCLE_ACTION_MAP: Record<string, string> = {
  validate: "validated",
  approve: "approved",
  publish: "published",
  deprecate: "deprecated",
  archive: "archived",
  revert_to_draft: "draft",
};

export const EPDE_MIN_PRIORITY = 1;
export const EPDE_MAX_PRIORITY = 1000;

export const EPDE_LOGICAL_OPERATORS = ["and", "or", "not"] as const;

export const EPDE_COMPARISON_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "gte",
  "lte",
  "in",
  "not_in",
  "exists",
  "not_exists",
] as const;
