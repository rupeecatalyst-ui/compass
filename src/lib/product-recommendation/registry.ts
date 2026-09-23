import type { CriterionEvaluation, CriterionEvaluator, RecommendationCriterionDefinition } from "./types";
import { CANONICAL_RECOMMENDATION_FIELD_PROJECTION, resolveProjectedField } from "./field-projection";
import { RECOMMENDATION_EVALUATOR_TYPES } from "./evaluator-types";

/**
 * Compatibility aliases only. Not the Recommendation Masters field SSOT.
 * New field selection uses Canonical Field Projection identities.
 */
export const SUPPORTED_RECOMMENDATION_CRITERIA: readonly RecommendationCriterionDefinition[] =
  CANONICAL_RECOMMENDATION_FIELD_PROJECTION.filter((row) => row.aliases.length > 0 || row.id.startsWith("legacy:")).map(
    (row) => ({
      key: row.aliases[0] ?? row.id.replace(/^legacy:/, ""),
      label: row.label,
      catalogStatus: row.scoreability,
    }),
  );

export const SUPPORTED_CRITERION_KEYS = new Set(SUPPORTED_RECOMMENDATION_CRITERIA.map((row) => row.key));

export function criterionCatalogStatus(key: string): RecommendationCriterionDefinition["catalogStatus"] | "unknown" {
  const field = resolveProjectedField(key);
  return field?.scoreability ?? "unknown";
}

export type CriterionEvaluatorRegistry = {
  get(key: string): CriterionEvaluator | undefined;
};

export function createCriterionEvaluatorRegistry(
  evaluators: Record<string, CriterionEvaluator>,
): CriterionEvaluatorRegistry {
  const map = new Map(Object.entries(evaluators));
  return { get: (key) => map.get(key) };
}

function typedPendingEvaluator(reason: "SCORING_CONTRACT_PENDING" | "EVALUATOR_MISSING"): CriterionEvaluator {
  return ({ criterionKey, weightPercent, context }) => {
    const status = reason === "EVALUATOR_MISSING" ? "evaluator_missing" : "scoring_contract_pending";
    const wired = context[`${criterionKey}Inputs`];
    return {
      criterionKey,
      status,
      criterionScore: null,
      weightPercent,
      weightedContribution: null,
      inputs: typeof wired === "object" && wired != null ? (wired as CriterionEvaluation["inputs"]) : undefined,
      reason,
    };
  };
}

/** Production evaluator-type registry. No field-specific scoring curves. */
export function createGovernedEvaluatorTypeRegistry(): CriterionEvaluatorRegistry {
  return createCriterionEvaluatorRegistry({
    [RECOMMENDATION_EVALUATOR_TYPES.PENDING_CONTRACT]: typedPendingEvaluator("SCORING_CONTRACT_PENDING"),
    [RECOMMENDATION_EVALUATOR_TYPES.NOT_IMPLEMENTED]: typedPendingEvaluator("EVALUATOR_MISSING"),
  });
}

/** @deprecated Use createGovernedEvaluatorTypeRegistry. Kept as the production default. */
export function createGovernedCriterionRegistry(): CriterionEvaluatorRegistry {
  return createGovernedEvaluatorTypeRegistry();
}
