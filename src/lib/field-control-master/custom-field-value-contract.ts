/**
 * Typed JSON contract for one current custom-field value.
 * Select values are option keys. Display labels are never stored.
 */
import type { FieldControlFieldType } from "@/types/field-control-master";

export type SelectKeySets = {
  active: Set<string>;
  retired: Set<string>;
};

export class CustomFieldValueContractError extends Error {
  readonly statusCode = 400;
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function fail(code: string, message: string): never {
  throw new CustomFieldValueContractError(code, message);
}

export function readSelectKeySets(raw: unknown): SelectKeySets {
  if (!Array.isArray(raw)) fail("VALUE_INVALID", "Select options are not available for this definition.");
  const active = new Set<string>();
  const retired = new Set<string>();
  if (raw.every((item) => typeof item === "string")) {
    for (const key of raw) active.add(key);
    return { active, retired };
  }
  for (const item of raw) {
    if (typeof item !== "object" || item === null) fail("VALUE_INVALID", "Select options are not readable.");
    const record = item as Record<string, unknown>;
    if (typeof record.key !== "string" || typeof record.retired !== "boolean") {
      fail("VALUE_INVALID", "Select options are not readable.");
    }
    if (record.retired) retired.add(record.key);
    else active.add(record.key);
  }
  return { active, retired };
}

function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function assertKnownKeys(keys: string[], sets: SelectKeySets): void {
  for (const key of keys) {
    if (!sets.active.has(key) && !sets.retired.has(key)) {
      fail("OPTION_UNKNOWN", "The selected option is not defined for this field.");
    }
  }
}

function selectionEquals(existing: unknown, incoming: unknown): boolean {
  if (Array.isArray(existing) || Array.isArray(incoming)) {
    if (!Array.isArray(existing) || !Array.isArray(incoming)) return false;
    const left = [...existing].map(String).sort();
    const right = [...incoming].map(String).sort();
    return left.length === right.length && left.every((key, index) => key === right[index]);
  }
  return existing === incoming;
}

function assertSelectable(keys: string[], sets: SelectKeySets, existing: unknown, incoming: unknown): void {
  assertKnownKeys(keys, sets);
  if (keys.some((key) => sets.retired.has(key)) && !selectionEquals(existing, incoming)) {
    fail("OPTION_RETIRED", "A retired option cannot be newly selected.");
  }
}

function finiteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail("VALUE_INVALID", "The value must be a finite number.");
  }
  return value;
}

export function validateCustomFieldValue(input: {
  fieldType: FieldControlFieldType | string;
  raw: unknown;
  selectOptionKeysJson: unknown;
  existingValue: unknown;
}): unknown {
  const existing = input.existingValue;
  switch (input.fieldType) {
    case "text":
    case "long_text":
      if (typeof input.raw !== "string" || input.raw.length === 0) {
        fail("VALUE_INVALID", "The value must be a non-empty string. Clear the field to remove it.");
      }
      return input.raw;
    case "number":
    case "currency":
    case "percentage":
      return finiteNumber(input.raw);
    case "date":
      if (typeof input.raw !== "string" || !isIsoCalendarDate(input.raw)) {
        fail("VALUE_INVALID", "The value must be a calendar date in YYYY-MM-DD form.");
      }
      return input.raw;
    case "yes_no":
      if (typeof input.raw !== "boolean") fail("VALUE_INVALID", "The value must be true or false.");
      return input.raw;
    case "single_select": {
      if (typeof input.raw !== "string" || input.raw.length === 0) {
        fail("VALUE_INVALID", "A single select value must be one option key.");
      }
      const sets = readSelectKeySets(input.selectOptionKeysJson);
      assertSelectable([input.raw], sets, existing, input.raw);
      return input.raw;
    }
    case "multi_select": {
      if (!Array.isArray(input.raw) || input.raw.length === 0 || input.raw.some((item) => typeof item !== "string")) {
        fail("VALUE_INVALID", "A multi select value must be a non-empty array of option keys.");
      }
      if (new Set(input.raw).size !== input.raw.length) {
        fail("VALUE_INVALID", "A multi select value cannot repeat an option key.");
      }
      const sets = readSelectKeySets(input.selectOptionKeysJson);
      assertSelectable(input.raw, sets, existing, input.raw);
      return [...input.raw];
    }
    default:
      fail("VALUE_INVALID", "The field type cannot store a custom value.");
  }
}
