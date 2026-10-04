import type { ProjectedRecommendationField } from "@/lib/product-recommendation/types";
import {
  asStringList,
  normalizeComparableToken,
  operatorIsAllowedForType,
  operatorNeedsValue,
  parseComparableDate,
  parseComparableNumber,
} from "./operators";
import { isEmptyAdditionalFilterSet } from "./parse";
import type {
  AdditionalEligibilityFilters,
  AdditionalFilterAuditEntry,
  AdditionalFilterCombinator,
  AdditionalFilterEvaluation,
  AdditionalFilterGroup,
  AdditionalFilterNode,
  AdditionalFilterPredicate,
  AdditionalFilterResultCode,
  FilterFieldValueType,
} from "./types";

export type FilterFactBag = Readonly<Record<string, unknown>>;

function valueTypeOf(fieldId: string, catalog?: readonly ProjectedRecommendationField[]): FilterFieldValueType {
  const projected = catalog?.find((row) => row.id === fieldId || row.aliases.includes(fieldId));
  return (projected?.valueType ?? inferValueType(fieldId)) as FilterFieldValueType;
}

function inferValueType(fieldId: string): FilterFieldValueType {
  const leaf = fieldId.split(".").pop() ?? fieldId;
  if (/Percent|Roi|Foir|Ltv|Dbr|Age|Score|Income|Amount|Value|Months|Count/i.test(leaf)) return "number";
  if (/Date|Dob/i.test(leaf)) return "date";
  if (/Status|Category|Type|Kind|Family|City|State|Residency|Constitution/i.test(leaf)) return "enum";
  return "string";
}

function lookupFact(facts: FilterFactBag, fieldId: string): { present: boolean; value: unknown } {
  if (Object.prototype.hasOwnProperty.call(facts, fieldId)) {
    return { present: facts[fieldId] !== undefined, value: facts[fieldId] };
  }
  const aliases = [
    fieldId.replace(/^assessment:/, ""),
    fieldId.replace(/^idc:/, ""),
    fieldId.replace(/^derived:/, ""),
    fieldId.split(".").pop() ?? "",
    fieldId.split(":").pop() ?? "",
  ];
  for (const alias of aliases) {
    if (alias && Object.prototype.hasOwnProperty.call(facts, alias)) {
      return { present: facts[alias] !== undefined, value: facts[alias] };
    }
  }
  return { present: false, value: undefined };
}

function isVacant(value: unknown): boolean {
  return value == null || value === "" || (Array.isArray(value) && value.length === 0);
}

function tokensEqual(left: unknown, right: unknown, valueType: FilterFieldValueType): boolean {
  if (valueType === "boolean") return Boolean(left) === Boolean(right);
  if (valueType === "date") {
    const a = parseComparableDate(left);
    const b = parseComparableDate(right);
    return a != null && b != null && a === b;
  }
  if (valueType === "number" || valueType === "percent" || valueType === "currency" || valueType === "integer") {
    const a = parseComparableNumber(left);
    const b = parseComparableNumber(right);
    return a != null && b != null && a === b;
  }
  return normalizeComparableToken(left) === normalizeComparableToken(right);
}

function compareOrder(left: unknown, right: unknown, valueType: FilterFieldValueType): number | null {
  if (valueType === "date") {
    const a = parseComparableDate(left);
    const b = parseComparableDate(right);
    if (a == null || b == null) return null;
    return a - b;
  }
  const a = parseComparableNumber(left);
  const b = parseComparableNumber(right);
  if (a == null || b == null) return null;
  return a - b;
}

function contains(actual: unknown, needle: unknown): boolean {
  return normalizeComparableToken(actual).includes(normalizeComparableToken(needle));
}

function inList(actual: unknown, expected: unknown, valueType: FilterFieldValueType): boolean | null {
  const list = asStringList(expected);
  if (list == null) return null;
  return list.some((item) => tokensEqual(actual, item, valueType));
}

function comparePredicate(
  predicate: AdditionalFilterPredicate,
  actual: unknown,
  valueType: FilterFieldValueType,
): boolean | "CONFIGURATION_INVALID" {
  const { operator, value } = predicate;
  if (!operatorIsAllowedForType(operator, valueType)) return "CONFIGURATION_INVALID";
  if (operator === "IS_EMPTY") return isVacant(actual);
  if (operator === "IS_NOT_EMPTY") return !isVacant(actual);
  if (operator === "EQUALS") return tokensEqual(actual, value, valueType);
  if (operator === "NOT_EQUALS") return !tokensEqual(actual, value, valueType);
  if (operator === "CONTAINS") return contains(actual, value);
  if (operator === "NOT_CONTAINS") return !contains(actual, value);
  if (operator === "IN") {
    const hit = inList(actual, value, valueType);
    return hit == null ? "CONFIGURATION_INVALID" : hit;
  }
  if (operator === "NOT_IN") {
    const hit = inList(actual, value, valueType);
    return hit == null ? "CONFIGURATION_INVALID" : !hit;
  }
  const order = compareOrder(actual, value, valueType);
  if (order == null) return "CONFIGURATION_INVALID";
  if (operator === "GREATER_THAN") return order > 0;
  if (operator === "GREATER_THAN_OR_EQUAL") return order >= 0;
  if (operator === "LESS_THAN") return order < 0;
  if (operator === "LESS_THAN_OR_EQUAL") return order <= 0;
  return "CONFIGURATION_INVALID";
}

function combine(combinator: AdditionalFilterCombinator, results: AdditionalFilterResultCode[]): AdditionalFilterResultCode {
  if (results.includes("CONFIGURATION_INVALID")) return "CONFIGURATION_INVALID";
  if (results.includes("CONFLICT")) return "CONFLICT";
  if (combinator === "AND") {
    if (results.includes("FAIL")) return "FAIL";
    if (results.includes("INPUT_REQUIRED")) return "INPUT_REQUIRED";
    return "PASS";
  }
  if (results.includes("PASS")) return "PASS";
  if (results.every((item) => item === "INPUT_REQUIRED")) return "INPUT_REQUIRED";
  if (results.includes("INPUT_REQUIRED") && results.every((item) => item === "FAIL" || item === "INPUT_REQUIRED")) {
    return "INPUT_REQUIRED";
  }
  return "FAIL";
}

function auditEntry(
  node: AdditionalFilterNode,
  result: AdditionalFilterResultCode,
  extra: Partial<AdditionalFilterAuditEntry>,
): AdditionalFilterAuditEntry {
  return {
    filterId: node.id,
    fieldId: node.kind === "predicate" ? node.fieldId : null,
    operator: node.kind === "predicate" ? node.operator : null,
    configuredComparison: node.kind === "predicate" ? node.value ?? null : node.combinator,
    actualValue: extra.actualValue ?? null,
    result,
    combinator: extra.combinator ?? (node.kind === "group" ? node.combinator : null),
    groupId: extra.groupId ?? (node.kind === "group" ? node.id : null),
  };
}

function evaluateNode(
  node: AdditionalFilterNode,
  facts: FilterFactBag,
  catalog: readonly ProjectedRecommendationField[] | undefined,
  parent: AdditionalFilterGroup | null,
): { result: AdditionalFilterResultCode; missingFieldIds: string[]; audit: AdditionalFilterAuditEntry[] } {
  if (node.kind === "predicate") {
    const valueType = valueTypeOf(node.fieldId, catalog);
    if (operatorNeedsValue(node.operator) && node.value === undefined) {
      return {
        result: "CONFIGURATION_INVALID",
        missingFieldIds: [],
        audit: [auditEntry(node, "CONFIGURATION_INVALID", { combinator: parent?.combinator ?? null, groupId: parent?.id ?? null })],
      };
    }
    const looked = lookupFact(facts, node.fieldId);
    if (!looked.present || looked.value === undefined) {
      return {
        result: "INPUT_REQUIRED",
        missingFieldIds: [node.fieldId],
        audit: [auditEntry(node, "INPUT_REQUIRED", {
          combinator: parent?.combinator ?? null,
          groupId: parent?.id ?? null,
          actualValue: null,
        })],
      };
    }
    const compared = comparePredicate(node, looked.value, valueType);
    if (compared === "CONFIGURATION_INVALID") {
      return {
        result: "CONFIGURATION_INVALID",
        missingFieldIds: [],
        audit: [auditEntry(node, "CONFIGURATION_INVALID", {
          combinator: parent?.combinator ?? null,
          groupId: parent?.id ?? null,
          actualValue: looked.value,
        })],
      };
    }
    const result: AdditionalFilterResultCode = compared ? "PASS" : "FAIL";
    return {
      result,
      missingFieldIds: [],
      audit: [auditEntry(node, result, {
        combinator: parent?.combinator ?? null,
        groupId: parent?.id ?? null,
        actualValue: looked.value,
      })],
    };
  }

  if (!node.children.length) {
    return {
      result: "PASS",
      missingFieldIds: [],
      audit: [auditEntry(node, "PASS", { combinator: node.combinator, groupId: node.id })],
    };
  }
  const childResults = node.children.map((child) => evaluateNode(child, facts, catalog, node));
  const result = combine(node.combinator, childResults.map((child) => child.result));
  return {
    result,
    missingFieldIds: [...new Set(childResults.flatMap((child) => child.missingFieldIds))],
    audit: [
      auditEntry(node, result, { combinator: node.combinator, groupId: node.id }),
      ...childResults.flatMap((child) => child.audit),
    ],
  };
}

export function evaluateAdditionalEligibilityFilters(input: {
  filters: AdditionalEligibilityFilters | null | undefined;
  facts: FilterFactBag;
  catalog?: readonly ProjectedRecommendationField[];
}): AdditionalFilterEvaluation {
  if (isEmptyAdditionalFilterSet(input.filters ?? null)) {
    return { result: "PASS", missingFieldIds: [], audit: [] };
  }
  const evaluated = evaluateNode(input.filters!.root, input.facts, input.catalog, null);
  return evaluated;
}
