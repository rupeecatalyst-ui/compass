import { isEmptyAdditionalFilterSet, parseAdditionalEligibilityFilters } from "./parse";
import type { AdditionalEligibilityFilters } from "./types";

export function extractAdditionalEligibilityFilters(value: unknown): AdditionalEligibilityFilters | null {
  if (value == null) return null;
  return parseAdditionalEligibilityFilters(value);
}

/** Persist empty as SQL NULL. Never nest into policyAssessmentJson. */
export function serializeAdditionalEligibilityFilters(
  filters: AdditionalEligibilityFilters | null | undefined,
): AdditionalEligibilityFilters | null {
  if (filters === undefined || filters == null || isEmptyAdditionalFilterSet(filters)) return null;
  return filters;
}

/** Draft AST must not affect live recommendation. */
export function liveAdditionalEligibilityFilters(input: {
  additionalEligibilityFilters?: unknown;
  publicationState?: string | null;
  isLivePublished?: boolean | null;
}): AdditionalEligibilityFilters | null {
  if (input.isLivePublished !== true && input.publicationState !== "published") return null;
  return extractAdditionalEligibilityFilters(input.additionalEligibilityFilters ?? null);
}

/** Structural copy for draft-from-published. Does not mutate the ancestor. */
export function copyAdditionalEligibilityFilters(source: unknown): AdditionalEligibilityFilters | null {
  const parsed = extractAdditionalEligibilityFilters(source);
  if (parsed == null) return null;
  return JSON.parse(JSON.stringify(parsed)) as AdditionalEligibilityFilters;
}
