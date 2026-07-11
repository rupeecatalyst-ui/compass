/**
 * ERDE lifecycle and framework constants.
 */

export const ERDE_FRAMEWORK_VERSION = "7.0.0";

export const ERDE_RULE_LIFECYCLE_STATUS = {
  DRAFT: "draft",
  VALIDATED: "validated",
  APPROVED: "approved",
  PUBLISHED: "published",
  DEPRECATED: "deprecated",
  ARCHIVED: "archived",
} as const;

export const ERDE_RULE_CATEGORIES = {
  VALIDATION: "validation",
  ROUTING: "routing",
  SCORING: "scoring",
  ELIGIBILITY: "eligibility",
  APPROVAL: "approval",
  NOTIFICATION: "notification",
  GENERAL: "general",
} as const;

export const ERDE_EXPRESSION_OPERATORS = {
  EQUALS: "equals",
  NOT_EQUALS: "not_equals",
  GREATER_THAN: "greater_than",
  LESS_THAN: "less_than",
  GTE: "gte",
  LTE: "lte",
  IN: "in",
  NOT_IN: "not_in",
  EXISTS: "exists",
  NOT_EXISTS: "not_exists",
  AND: "and",
  OR: "or",
  NOT: "not",
} as const;

export const ERDE_ACTION_KINDS = {
  SET_VARIABLE: "set_variable",
  EMIT_RESULT: "emit_result",
  CHAIN_RULE: "chain_rule",
  STOP: "stop",
  LOG: "log",
} as const;

export const ERDE_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  draft: ["validated", "archived"],
  validated: ["approved", "draft", "archived"],
  approved: ["published", "draft", "archived"],
  published: ["deprecated", "archived"],
  deprecated: ["archived", "published"],
  archived: [],
};

export const ERDE_LIFECYCLE_ACTION_MAP: Record<string, string> = {
  validate: "validated",
  approve: "approved",
  publish: "published",
  deprecate: "deprecated",
  archive: "archived",
  revert_to_draft: "draft",
};

export const ERDE_LOGICAL_OPERATORS = ["and", "or", "not"] as const;

export const ERDE_COMPARISON_OPERATORS = [
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

export const ERDE_MIN_PRIORITY = 1;
export const ERDE_MAX_PRIORITY = 1000;
