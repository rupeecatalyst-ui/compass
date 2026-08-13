/**
 * CO-MARKETING-MKT-03 — Extensible audience filter evaluation.
 * Field names are discovered from the source — not hard-coded categories.
 */

import type { MarketingFilterOp } from "@/constants/enterprise-marketing-engine/audience";
import type {
  MarketingFilterDefinition,
  MarketingFilterRule,
} from "@/types/enterprise-marketing-audience";

function cell(row: Record<string, unknown>, field: string): string {
  const v = row[field];
  if (v == null) return "";
  return String(v).trim();
}

function resolveFieldValue(
  row: Record<string, unknown>,
  field: string,
  columns: { emailColumn: string | null; phoneColumn: string | null },
): string {
  if (field === "__email__") {
    return columns.emailColumn ? cell(row, columns.emailColumn) : "";
  }
  if (field === "__phone__") {
    return columns.phoneColumn ? cell(row, columns.phoneColumn) : "";
  }
  return cell(row, field);
}

export function evaluateFilterRule(
  row: Record<string, unknown>,
  rule: MarketingFilterRule,
  columns: { emailColumn: string | null; phoneColumn: string | null },
): boolean {
  const op: MarketingFilterOp = rule.op;

  if (op === "email_available") {
    const v = columns.emailColumn ? cell(row, columns.emailColumn) : "";
    return v.length > 0;
  }
  if (op === "mobile_available") {
    const v = columns.phoneColumn ? cell(row, columns.phoneColumn) : "";
    return v.length > 0;
  }

  const raw = resolveFieldValue(row, rule.field, columns);
  const lower = raw.toLowerCase();
  const value = Array.isArray(rule.value)
    ? rule.value.map((x) => String(x))
    : rule.value != null
      ? String(rule.value)
      : "";

  switch (op) {
    case "eq":
      return lower === String(value).trim().toLowerCase();
    case "neq":
      return lower !== String(value).trim().toLowerCase();
    case "contains":
      return lower.includes(String(value).trim().toLowerCase());
    case "not_contains":
      return !lower.includes(String(value).trim().toLowerCase());
    case "starts_with":
      return lower.startsWith(String(value).trim().toLowerCase());
    case "in": {
      const list = Array.isArray(rule.value)
        ? rule.value
        : String(value)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      return list.some((x) => lower === String(x).toLowerCase());
    }
    case "not_in": {
      const list = Array.isArray(rule.value)
        ? rule.value
        : String(value)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      return !list.some((x) => lower === String(x).toLowerCase());
    }
    case "is_empty":
      return raw.length === 0;
    case "is_not_empty":
      return raw.length > 0;
    default:
      return true;
  }
}

export function evaluateFilterDefinition(
  row: Record<string, unknown>,
  definition: MarketingFilterDefinition,
  columns: { emailColumn: string | null; phoneColumn: string | null },
): boolean {
  const rules = definition.rules ?? [];
  if (rules.length === 0) return true;
  if (definition.logic === "OR") {
    return rules.some((r) => evaluateFilterRule(row, r, columns));
  }
  return rules.every((r) => evaluateFilterRule(row, r, columns));
}

export function emptyFilterDefinition(): MarketingFilterDefinition {
  return { version: 1, logic: "AND", rules: [] };
}
