import {
  PROGRAMME_CONSTRUCTION_STATUSES,
  PROGRAMME_EMPLOYMENT_TYPES,
  PROGRAMME_LEGAL_CONSTITUTIONS,
  PROGRAMME_PROPERTY_CATEGORIES,
  PROGRAMME_RESIDENCY,
} from "@/constants/product-programme-operations/controlled-masters";
import { applicableJourneyFields } from "@/lib/product-journey/applicability";
import { resolveEffectiveJourneyFields } from "@/lib/product-journey/parse";
import {
  listProjectedRecommendationFields,
  resolveProjectedField,
} from "@/lib/product-recommendation/field-projection";
import type { ProjectedRecommendationField } from "@/lib/product-recommendation/types";
import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";
import { constraintKeyForField } from "./programme-constraints";
import type { FilterFieldOption, FilterFieldValueType } from "./types";

const ENUM_OPTIONS: Record<string, readonly { id: string; label: string }[]> = {
  constructionStatus: PROGRAMME_CONSTRUCTION_STATUSES,
  propertyCategory: PROGRAMME_PROPERTY_CATEGORIES,
  employment: PROGRAMME_EMPLOYMENT_TYPES.map((item) => ({ id: item.id, label: item.label })),
  residency: PROGRAMME_RESIDENCY,
  constitution: PROGRAMME_LEGAL_CONSTITUTIONS,
};

function asFilterValueType(field: ProjectedRecommendationField): FilterFieldValueType {
  const key = constraintKeyForField(field.id);
  if (key && ENUM_OPTIONS[key]) return "enum";
  return field.valueType;
}

function optionFromProjected(field: ProjectedRecommendationField): FilterFieldOption {
  const key = constraintKeyForField(field.id);
  return {
    id: field.id,
    label: field.label,
    valueType: asFilterValueType(field),
    enumOptions: key ? ENUM_OPTIONS[key] : undefined,
    productCodes: field.productCodes,
  };
}

function isCustomerSelectable(field: ProjectedRecommendationField): boolean {
  if (!field.selectable) return false;
  if (field.fieldKind === "programme_fact" || field.fieldKind === "compatibility_alias") return false;
  return field.fieldKind === "assessment_fact" || field.fieldKind === "derived_fact" || Boolean(field.customerFactRef);
}

export function listAdditionalEligibilityFilterFields(input: {
  productCode: string;
  employmentFamily?: "salaried" | "self_employed" | "unknown" | null;
  journeyFields?: ProductJourneyFieldRow[] | unknown;
}): FilterFieldOption[] {
  const projected = listProjectedRecommendationFields({
    productCode: input.productCode,
    includeNonSelectable: false,
  });
  const journey = resolveEffectiveJourneyFields({
    productCode: input.productCode,
    persistedFields: input.journeyFields,
  });
  const applicable = applicableJourneyFields(journey, input.employmentFamily ?? "unknown");
  if (applicable.length) {
    const options: FilterFieldOption[] = [];
    const seen = new Set<string>();
    for (const row of applicable) {
      const field = resolveProjectedField(row.fieldId, projected) ?? resolveProjectedField(row.fieldId);
      if (field) {
        if (!isCustomerSelectable(field) || seen.has(field.id)) continue;
        seen.add(field.id);
        options.push({
          ...optionFromProjected(field),
          label: row.label || field.label,
        });
        continue;
      }
      if (seen.has(row.fieldId)) continue;
      seen.add(row.fieldId);
      const key = constraintKeyForField(row.fieldId);
      options.push({
        id: row.fieldId,
        label: row.label || row.fieldId,
        valueType: key && ENUM_OPTIONS[key] ? "enum" : /age|income|cibil|score|amount|value|months/i.test(row.fieldId) ? "number" : "string",
        enumOptions: key ? ENUM_OPTIONS[key] : undefined,
        productCodes: [input.productCode],
      });
    }
    return options;
  }
  return projected.filter(isCustomerSelectable).map(optionFromProjected);
}

export function assertFilterFieldsAreModuleScoped(input: {
  productCode?: string | null;
  filters?: { root: { kind: string; children?: unknown[] } & Record<string, unknown> } | null;
}): string | null {
  if (!input.productCode || !input.filters) return null;
  const allowed = new Set(listAdditionalEligibilityFilterFields({ productCode: input.productCode }).map((field) => field.id));
  const walk = (node: unknown): string | null => {
    if (!node || typeof node !== "object") return null;
    const row = node as Record<string, unknown>;
    if (row.kind === "predicate") {
      const fieldId = String(row.fieldId ?? "");
      if (fieldId && !allowed.has(fieldId)) return fieldId;
      return null;
    }
    if (Array.isArray(row.children)) {
      for (const child of row.children) {
        const bad = walk(child);
        if (bad) return bad;
      }
    }
    return null;
  };
  return walk(input.filters.root);
}

export function resolveFilterFieldOption(
  fieldId: string,
  productCode: string,
  extras?: { employmentFamily?: "salaried" | "self_employed" | "unknown" | null; journeyFields?: unknown },
): FilterFieldOption | null {
  return listAdditionalEligibilityFilterFields({
    productCode,
    employmentFamily: extras?.employmentFamily,
    journeyFields: extras?.journeyFields,
  }).find((field) => field.id === fieldId) ?? null;
}
