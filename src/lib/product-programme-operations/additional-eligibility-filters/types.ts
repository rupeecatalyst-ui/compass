/**
 * Additional Eligibility Filters — structured deterministic rules only.
 * No eval(), no configured JavaScript, no executable expressions.
 */

export const ADDITIONAL_FILTER_OPERATORS = [
  "EQUALS",
  "NOT_EQUALS",
  "GREATER_THAN",
  "GREATER_THAN_OR_EQUAL",
  "LESS_THAN",
  "LESS_THAN_OR_EQUAL",
  "CONTAINS",
  "NOT_CONTAINS",
  "IN",
  "NOT_IN",
  "IS_EMPTY",
  "IS_NOT_EMPTY",
] as const;

export type AdditionalFilterOperator = (typeof ADDITIONAL_FILTER_OPERATORS)[number];

export const ADDITIONAL_FILTER_COMBINATORS = ["AND", "OR"] as const;
export type AdditionalFilterCombinator = (typeof ADDITIONAL_FILTER_COMBINATORS)[number];

export const ADDITIONAL_FILTER_RESULTS = [
  "PASS",
  "FAIL",
  "INPUT_REQUIRED",
  "CONFIGURATION_INVALID",
  "CONFLICT",
] as const;
export type AdditionalFilterResultCode = (typeof ADDITIONAL_FILTER_RESULTS)[number];

/** Technical safety only — not a business-rule cap on how many filters a Product Owner may add. */
export const ADDITIONAL_FILTER_MAX_DEPTH = 8;
export const ADDITIONAL_FILTER_MAX_NODES = 250;

export type AdditionalFilterPredicate = {
  kind: "predicate";
  id: string;
  fieldId: string;
  operator: AdditionalFilterOperator;
  value?: unknown;
};

export type AdditionalFilterGroup = {
  kind: "group";
  id: string;
  combinator: AdditionalFilterCombinator;
  children: AdditionalFilterNode[];
};

export type AdditionalFilterNode = AdditionalFilterPredicate | AdditionalFilterGroup;

export type AdditionalEligibilityFilters = {
  version: 1;
  root: AdditionalFilterGroup;
};

export type AdditionalFilterAuditEntry = {
  filterId: string;
  fieldId: string | null;
  operator: AdditionalFilterOperator | null;
  configuredComparison: unknown;
  actualValue: unknown;
  result: AdditionalFilterResultCode;
  combinator: AdditionalFilterCombinator | null;
  groupId: string | null;
};

export type AdditionalFilterEvaluation = {
  result: AdditionalFilterResultCode;
  missingFieldIds: string[];
  audit: AdditionalFilterAuditEntry[];
  detail?: string;
};

export type AdditionalFilterConflict = {
  code: "ADDITIONAL_FILTER_CONFLICT";
  fieldId: string;
  fieldLabel: string;
  existingGovernedRule: string;
  attemptedAdditionalRule: string;
};

export type AdditionalFilterConflictReport = {
  ok: true;
} | {
  ok: false;
  code: "ADDITIONAL_FILTER_CONFLICT" | "CONFIGURATION_INVALID";
  conflicts: AdditionalFilterConflict[];
  detail?: string;
};

export type FilterFieldValueType = "number" | "percent" | "currency" | "integer" | "string" | "boolean" | "date" | "enum";

export type FilterFieldOption = {
  id: string;
  label: string;
  valueType: FilterFieldValueType;
  enumOptions?: readonly { id: string; label: string }[];
  productCodes: readonly string[];
};
