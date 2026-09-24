import type { CriterionEvaluatorRegistry } from "./registry";
import { createGovernedEvaluatorTypeRegistry } from "./registry";
import type { ParsedCriterionWeights, ProjectedRecommendationField } from "./types";
import { CANONICAL_RECOMMENDATION_FIELD_PROJECTION, resolveProjectedField } from "./field-projection";
import { isRegisteredEvaluatorType } from "./evaluator-types";

/** Persisted by older drafts next to real criterion keys. Never a Match % criterion. */
export const RESERVED_WEIGHT_METADATA_KEYS = new Set(["total", "weightsTotal", "selected", "error"]);

export function parseCriterionWeights(raw: unknown): ParsedCriterionWeights | { error: string } {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "WEIGHTS_JSON_INVALID" };
  }
  const selected: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (RESERVED_WEIGHT_METADATA_KEYS.has(key)) continue;
    if (!key.trim()) return { error: "CRITERION_KEY_INVALID" };
    if (typeof value !== "number" || !Number.isFinite(value)) return { error: "WEIGHT_NOT_NUMERIC" };
    if (value < 0) return { error: "WEIGHT_NEGATIVE" };
    selected[key] = value;
  }
  const total = Object.values(selected).reduce((sum, weight) => sum + weight, 0);
  return { selected, total };
}

/**
 * Draft/edit normalization only. Does not rewrite historical stored JSON on read.
 * Collapses alias + canonical duplicates onto the canonical field ID and drops metadata keys.
 */
export function normalizeDraftCriterionWeights(
  raw: unknown,
  catalog: readonly ProjectedRecommendationField[] = CANONICAL_RECOMMENDATION_FIELD_PROJECTION,
): ParsedCriterionWeights | { error: string } {
  const parsed = parseCriterionWeights(raw);
  if ("error" in parsed) return parsed;
  const incoming = parsed.selected;
  const selected: Record<string, number> = {};
  const claimed = new Set<string>();
  for (const [key, value] of Object.entries(incoming)) {
    const field = resolveProjectedField(key, catalog);
    const canonical = field?.id ?? key;
    if (claimed.has(canonical)) continue;
    if (field && Object.prototype.hasOwnProperty.call(incoming, field.id)) {
      selected[field.id] = incoming[field.id]!;
    } else {
      selected[canonical] = value;
    }
    claimed.add(canonical);
  }
  const total = Object.values(selected).reduce((sum, weight) => sum + weight, 0);
  return { selected, total };
}

export function weightsTotalExact100(weights: ParsedCriterionWeights): boolean {
  return Object.keys(weights.selected).length > 0 && weights.total === 100;
}

export function assertActivateableWeights(weights: ParsedCriterionWeights): string | null {
  if (Object.keys(weights.selected).length === 0) return "NO_CRITERIA_SELECTED";
  if (!weightsTotalExact100(weights)) return "WEIGHTS_NOT_EXACTLY_100";
  return null;
}

export function validateWeightPublish(
  weightsJson: unknown,
  registry: CriterionEvaluatorRegistry = createGovernedEvaluatorTypeRegistry(),
  catalog: readonly ProjectedRecommendationField[] = CANONICAL_RECOMMENDATION_FIELD_PROJECTION,
): string | null {
  const parsed = normalizeDraftCriterionWeights(weightsJson, catalog);
  if ("error" in parsed) return parsed.error;
  const totalError = assertActivateableWeights(parsed);
  if (totalError) return totalError;
  for (const key of Object.keys(parsed.selected)) {
    const projected = resolveProjectedField(key, catalog);
    if (!projected) {
      if (!registry.get(key)) return "UNKNOWN_CRITERION";
      continue;
    }
    if (projected.scoreability === "inputs_wired_scoring_contract_pending") return "SCORING_CONTRACT_PENDING";
    if (projected.scoreability !== "fully_scorable") return "EVALUATOR_MISSING";
    if (!isRegisteredEvaluatorType(projected.evaluatorType) && !registry.get(projected.evaluatorType)) {
      return "UNKNOWN_EVALUATOR_TYPE";
    }
    if (!registry.get(projected.evaluatorType) && !registry.get(key)) return "EVALUATOR_MISSING";
  }
  return null;
}
