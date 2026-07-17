/**
 * Context-Aware Data Collection — visibility + sanitization.
 */

import {
  CONTEXT_SALARIED_FIELDS,
  CONTEXT_SALARIED_FORBIDDEN,
  CONTEXT_SALARIED_VALUE_KEYS,
  CONTEXT_SELF_EMPLOYED_FIELDS,
  CONTEXT_SELF_EMPLOYED_FORBIDDEN,
  CONTEXT_SELF_EMPLOYED_VALUE_KEYS,
  CONTEXT_SHARED_FIELDS,
} from "@/constants/context-aware-data-collection";
import { normalizeEcmEmploymentTypeId } from "@/constants/enterprise-contact-master";
import type {
  ContextAwareFieldKey,
  ContextAwareVisibility,
  ContextCustomerCategory,
  ContextCustomerFamily,
} from "@/types/context-aware-data-collection";

/** Normalize free-form category / employment labels into a canonical category. */
export function resolveContextCustomerCategory(
  raw?: string | null,
): ContextCustomerCategory {
  if (!raw) return "";

  const ecm = normalizeEcmEmploymentTypeId(raw);
  if (ecm === "salaried") return "salaried";
  if (ecm === "self-employed-professional") return "self_employed_professional";
  if (ecm === "self-employed-business") return "self_employed_business";

  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "salaried" || s.startsWith("salaried")) return "salaried";
  if (s === "nri" || s.includes("nri")) return "nri";
  if (s === "self_employed_professional" || s.includes("professional")) {
    return "self_employed_professional";
  }
  if (
    s === "self_employed_business" ||
    s === "self_employed" ||
    s.includes("self_employed") ||
    s.includes("business")
  ) {
    return "self_employed_business";
  }
  if (ecm === "other" || s === "other") return "other";
  return "other";
}

export function resolveContextCustomerFamily(
  categoryOrEmployment?: string | null,
): ContextCustomerFamily {
  const category = resolveContextCustomerCategory(categoryOrEmployment);
  if (category === "salaried" || category === "nri") return "salaried";
  if (
    category === "self_employed_professional" ||
    category === "self_employed_business"
  ) {
    return "self_employed";
  }
  return "unknown";
}

export function getContextAwareVisibility(
  categoryOrEmployment?: string | null,
): ContextAwareVisibility {
  const category = resolveContextCustomerCategory(categoryOrEmployment);
  const family = resolveContextCustomerFamily(category);

  let keys: readonly ContextAwareFieldKey[] = [];
  if (family === "salaried") keys = CONTEXT_SALARIED_FIELDS;
  if (family === "self_employed") keys = CONTEXT_SELF_EMPLOYED_FIELDS;

  const visible = new Set<ContextAwareFieldKey>(keys);

  return {
    family,
    category,
    visible,
    isVisible: (key) => visible.has(key),
    isSalariedFamily: family === "salaried",
    isSelfEmployedFamily: family === "self_employed",
  };
}

export function isContextFieldVisible(
  categoryOrEmployment: string | null | undefined,
  key: ContextAwareFieldKey,
): boolean {
  return getContextAwareVisibility(categoryOrEmployment).isVisible(key);
}

/**
 * Strip values that belong to the opposite family so they cannot affect calculations.
 */
export function sanitizeValuesForCustomerCategory<T extends Record<string, unknown>>(
  values: T,
  categoryOrEmployment?: string | null,
): T {
  const family = resolveContextCustomerFamily(categoryOrEmployment);
  if (family === "unknown") return values;

  const next = { ...values };
  const clearKeys =
    family === "salaried"
      ? CONTEXT_SELF_EMPLOYED_VALUE_KEYS
      : CONTEXT_SALARIED_VALUE_KEYS;

  for (const key of clearKeys) {
    if (key in next) {
      (next as Record<string, unknown>)[key] = typeof next[key] === "number" ? 0 : "";
    }
  }
  return next;
}

export function isFieldForbiddenForFamily(
  family: ContextCustomerFamily,
  key: ContextAwareFieldKey,
): boolean {
  if (family === "salaried") return CONTEXT_SALARIED_FORBIDDEN.includes(key);
  if (family === "self_employed") return CONTEXT_SELF_EMPLOYED_FORBIDDEN.includes(key);
  return false;
}

/** Map Analyze Deal / UI category to ECM employment type id. */
export function contextCategoryToEcmEmploymentId(
  category: ContextCustomerCategory,
): string {
  switch (category) {
    case "salaried":
    case "nri":
      return "salaried";
    case "self_employed_professional":
      return "self-employed-professional";
    case "self_employed_business":
      return "self-employed-business";
    default:
      return "other";
  }
}
