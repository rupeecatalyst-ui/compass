/**
 * Enterprise Initial Data Collection — visibility, defaults, validation helpers.
 * Single implementation for Partner Gateway + any future C1 consumer.
 */

import type {
  IdcFieldDef,
  IdcFieldValidation,
  IdcSectionDef,
} from "@/types/enterprise-initial-data-collection";
import {
  EMPLOYMENT_TYPE_FIELD_KEY,
  MONTHLY_INCOME_FIELD_KEY,
  TURNOVER_CAPACITY_FIELD_KEYS,
  isMonthlyIncomeRequired,
  resolveMonthlyIncomeMax,
} from "@/constants/enterprise-initial-data-collection/income-rules";

export function resolveProductFieldFamily(productCode: string): string {
  const c = productCode.trim().toUpperCase();
  if (c.includes("HOME_LOAN") || c === "HL" || c.startsWith("HL_")) return "HOME_LOAN";
  if (c.includes("LAP") || c.includes("LOAN_AGAINST_PROPERTY")) return "LAP";
  if (c.includes("CONSTRUCTION") || c.includes("PROJECT_FINANCE")) return "CONSTRUCTION_FINANCE";
  if (
    c.includes("WORKING_CAPITAL") ||
    c === "CASH_CREDIT" ||
    c === "OVERDRAFT" ||
    c.includes("CASH_CREDIT") ||
    c.includes("OVERDRAFT")
  ) {
    return "WORKING_CAPITAL";
  }
  if (c.includes("BUSINESS") || c.includes("MSME") || c.startsWith("BL_")) {
    return "BUSINESS_LOAN";
  }
  if (c.includes("PERSONAL") || c.startsWith("PL_")) return "PERSONAL_LOAN";
  return c;
}

function fieldMatchesProductFamily(field: IdcFieldDef, family: string): boolean {
  if (!field.visibleWhenProductFamilies?.length) return true;
  return field.visibleWhenProductFamilies.includes(family);
}

function fieldMatchesBorrower(
  field: IdcFieldDef,
  primaryBorrowerKind: "individual" | "company",
): boolean {
  if (!field.visibleWhenBorrower) return true;
  return field.visibleWhenBorrower === primaryBorrowerKind;
}

function fieldMatchesValueGate(field: IdcFieldDef, values: Record<string, string>): boolean {
  if (!field.visibleWhenField) return true;
  const current = (values[field.visibleWhenField] ?? "").trim();
  const allowed = field.visibleWhenValues ?? [];
  if (!allowed.length) return current.length > 0;
  return allowed.includes(current);
}

export function isIdcFieldVisible(
  field: IdcFieldDef,
  ctx: {
    primaryBorrowerKind: "individual" | "company";
    productFamily: string;
    values: Record<string, string>;
  },
): boolean {
  return (
    fieldMatchesBorrower(field, ctx.primaryBorrowerKind) &&
    fieldMatchesProductFamily(field, ctx.productFamily) &&
    fieldMatchesValueGate(field, ctx.values)
  );
}

/**
 * Apply Enterprise visibility rules encoded on section + field metadata.
 * Presentation filter only — does not invent business rules.
 */
export function resolveVisibleIdcSections(
  sections: IdcSectionDef[],
  ctx: {
    primaryBorrowerKind: "individual" | "company";
    productCode: string;
    /** Merged values across buckets for field-level gates. */
    values?: Record<string, string>;
  },
): IdcSectionDef[] {
  const family = resolveProductFieldFamily(ctx.productCode);
  const values = ctx.values ?? {};
  return [...sections]
    .filter((s) => (s.visibility ?? "visible") !== "hidden")
    .filter((s) => {
      const gate = s.visibleWhenBorrower ?? "any";
      if (gate === "any") return true;
      return gate === ctx.primaryBorrowerKind;
    })
    .filter((s) => {
      if (!s.visibleWhenProductFamilies?.length) return true;
      return s.visibleWhenProductFamilies.includes(family);
    })
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((s) => ({
      ...s,
      fields: [...s.fields]
        .filter((f) =>
          isIdcFieldVisible(f, {
            primaryBorrowerKind: ctx.primaryBorrowerKind,
            productFamily: family,
            values,
          }),
        )
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }))
    .filter((s) => s.fields.length > 0);
}

/** Seed empty keys with Enterprise defaultValue when first visible. */
export function applyIdcFieldDefaults(
  fields: IdcFieldDef[],
  existing: Record<string, string>,
): Record<string, string> {
  const next = { ...existing };
  for (const field of fields) {
    const current = (next[field.key] ?? "").trim();
    if (!current && field.defaultValue != null && field.defaultValue !== "") {
      next[field.key] = field.defaultValue;
    }
  }
  return next;
}

export type IdcFieldValidationResult =
  | { ok: true }
  | { ok: false; message: string };

function runValidation(
  raw: string,
  required: boolean | undefined,
  label: string,
  rules: IdcFieldValidation | undefined,
): IdcFieldValidationResult {
  const value = raw.trim();
  if (!value) {
    if (required) return { ok: false, message: `${label} is required.` };
    return { ok: true };
  }
  if (!rules) return { ok: true };
  if (rules.minLength != null && value.length < rules.minLength) {
    return {
      ok: false,
      message: `${label} must be at least ${rules.minLength} characters.`,
    };
  }
  if (rules.maxLength != null && value.length > rules.maxLength) {
    return {
      ok: false,
      message: `${label} must be at most ${rules.maxLength} characters.`,
    };
  }
  if (rules.pattern) {
    try {
      const re = new RegExp(rules.pattern);
      if (!re.test(value)) {
        return {
          ok: false,
          message: rules.patternMessage || `${label} format is invalid.`,
        };
      }
    } catch {
      /* ignore invalid pattern from config */
    }
  }
  if (rules.min != null || rules.max != null) {
    const num = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(num)) {
      if (rules.min != null && num < rules.min) {
        return { ok: false, message: `${label} must be at least ${rules.min}.` };
      }
      if (rules.max != null && num > rules.max) {
        return { ok: false, message: `${label} must be at most ${rules.max}.` };
      }
    }
  }
  return { ok: true };
}

function readEmploymentType(values: Record<string, string>): string {
  return (
    values[EMPLOYMENT_TYPE_FIELD_KEY] ||
    values.incomeType ||
    values.employmentType ||
    ""
  ).trim();
}

export function resolveIdcFieldRequired(
  field: IdcFieldDef,
  values: Record<string, string>,
  options?: { fieldVisible?: boolean },
): boolean {
  const visible = options?.fieldVisible ?? true;
  if (!visible) return false;

  if (field.key === MONTHLY_INCOME_FIELD_KEY || field.key === "monthlyIncome") {
    const turnoverKeys = field.notRequiredWhenFilled?.length
      ? field.notRequiredWhenFilled
      : [...TURNOVER_CAPACITY_FIELD_KEYS];
    const turnoverApplicable = turnoverKeys.some((key) =>
      Object.prototype.hasOwnProperty.call(values, key),
    );
    return isMonthlyIncomeRequired({
      fieldVisible: visible,
      employmentType: readEmploymentType(values),
      turnoverFieldApplicable: turnoverApplicable,
      values,
    });
  }

  if (field.requiredWhenField) {
    const current = (values[field.requiredWhenField] ?? "").trim();
    const allowed = field.requiredWhenValues ?? [];
    if (!allowed.length) return current.length > 0;
    return allowed.includes(current);
  }

  if (field.notRequiredWhenFilled?.some((key) => (values[key] ?? "").trim().length > 0)) {
    return false;
  }

  return Boolean(field.required);
}

function resolveIdcFieldValidation(
  field: IdcFieldDef,
  values: Record<string, string>,
): IdcFieldValidation | undefined {
  const base = field.validation;
  if (field.key !== MONTHLY_INCOME_FIELD_KEY && field.key !== "monthlyIncome") {
    return base;
  }
  return {
    ...base,
    min: base?.min,
    max: resolveMonthlyIncomeMax(readEmploymentType(values)),
  };
}

export function validateIdcFieldValue(
  field: IdcFieldDef,
  raw: string,
  values: Record<string, string> = {},
  options?: { fieldVisible?: boolean },
): IdcFieldValidationResult {
  const required = resolveIdcFieldRequired(field, values, options);
  return runValidation(raw, required, field.label, resolveIdcFieldValidation(field, values));
}

export function validateIdcFields(
  fields: IdcFieldDef[],
  values: Record<string, string>,
): IdcFieldValidationResult {
  for (const field of fields) {
    const result = validateIdcFieldValue(field, values[field.key] ?? "", values);
    if (!result.ok) return result;
  }
  return { ok: true };
}

export type IdcSectionCompletion = {
  sectionId: string;
  filled: number;
  total: number;
  percent: number;
  complete: boolean;
  requiredComplete: boolean;
};

export function deriveIdcSectionCompletion(
  section: IdcSectionDef,
  values: Record<string, string>,
): IdcSectionCompletion {
  const total = section.fields.length;
  const filled = section.fields.filter((f) => (values[f.key] ?? "").trim().length > 0).length;
  const required = section.fields.filter((f) => resolveIdcFieldRequired(f, values));
  const requiredComplete = required.every((f) => {
    const result = validateIdcFieldValue(f, values[f.key] ?? "", values);
    return result.ok && (values[f.key] ?? "").trim().length > 0;
  });
  const percent = total === 0 ? 100 : Math.round((filled / total) * 100);
  return {
    sectionId: section.sectionId,
    filled,
    total,
    percent,
    complete: total > 0 && filled === total,
    requiredComplete,
  };
}
