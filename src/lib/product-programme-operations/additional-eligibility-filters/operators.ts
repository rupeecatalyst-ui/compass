import type { AdditionalFilterOperator, FilterFieldValueType } from "./types";

const NUMERIC_TYPES = new Set<FilterFieldValueType>(["number", "percent", "currency", "integer", "date"]);

export function operatorsForValueType(valueType: FilterFieldValueType): readonly AdditionalFilterOperator[] {
  const empty: AdditionalFilterOperator[] = ["IS_EMPTY", "IS_NOT_EMPTY"];
  if (valueType === "boolean") {
    return ["EQUALS", "NOT_EQUALS", ...empty];
  }
  if (NUMERIC_TYPES.has(valueType)) {
    return [
      "EQUALS",
      "NOT_EQUALS",
      "GREATER_THAN",
      "GREATER_THAN_OR_EQUAL",
      "LESS_THAN",
      "LESS_THAN_OR_EQUAL",
      ...empty,
    ];
  }
  if (valueType === "enum") {
    return ["EQUALS", "NOT_EQUALS", "IN", "NOT_IN", ...empty];
  }
  if (valueType === "string") {
    return ["EQUALS", "NOT_EQUALS", "CONTAINS", "NOT_CONTAINS", "IN", "NOT_IN", ...empty];
  }
  return ["EQUALS", "NOT_EQUALS", ...empty];
}

export function operatorIsAllowedForType(
  operator: AdditionalFilterOperator,
  valueType: FilterFieldValueType,
): boolean {
  return operatorsForValueType(valueType).includes(operator);
}

export function operatorNeedsValue(operator: AdditionalFilterOperator): boolean {
  return operator !== "IS_EMPTY" && operator !== "IS_NOT_EMPTY";
}

export function operatorNeedsList(operator: AdditionalFilterOperator): boolean {
  return operator === "IN" || operator === "NOT_IN";
}

export function normalizeComparableToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function parseComparableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && /^\d+(\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseComparableDate(value: unknown): number | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) ? time : null;
  }
  return parseComparableNumber(value);
}

export function asStringList(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length ? items : [];
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return null;
}
