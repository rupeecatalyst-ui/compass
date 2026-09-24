import type { CriterionEvaluation, CriterionEvaluator, RecommendationCriterionDefinition } from "./types";
import { CANONICAL_RECOMMENDATION_FIELD_PROJECTION, resolveProjectedField } from "./field-projection";
import { RECOMMENDATION_EVALUATOR_TYPES } from "./evaluator-types";
import { MATCH_PERCENT_CRITERION_REASONS } from "./match-percent-reasons";
import {
  cappedRequirementRatioEvaluator,
  lowestAmongEligibleOrPendingEvaluator,
  relativeToEligibleMaxEvaluator,
  withinNormOrPendingEvaluator,
} from "./approved-scoring-contracts";

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

function pendingReasonFor(criterionKey: string, context: CriterionEvaluation["inputs"] | Record<string, unknown> | undefined): string {
  const declared = context && typeof context === "object" ? context.pendingReason : null;
  if (typeof declared === "string" && declared.trim()) return declared;
  if (criterionKey === "ltvFit" || criterionKey === "derived:ltvPercent") {
    return MATCH_PERCENT_CRITERION_REASONS.LTV_SCORING_CONTRACT_PENDING;
  }
  return "SCORING_CONTRACT_PENDING";
}

function typedPendingEvaluator(reason: "SCORING_CONTRACT_PENDING" | "EVALUATOR_MISSING"): CriterionEvaluator {
  return ({ criterionKey, weightPercent, context }) => {
    const status = reason === "EVALUATOR_MISSING" ? "evaluator_missing" : "scoring_contract_pending";
    const wired =
      (context[`${criterionKey}Inputs`] as CriterionEvaluation["inputs"] | undefined) ??
      (context.ltvFitInputs as CriterionEvaluation["inputs"] | undefined);
    return {
      criterionKey,
      status,
      criterionScore: null,
      weightPercent,
      weightedContribution: null,
      inputs: typeof wired === "object" && wired != null ? wired : undefined,
      reason: reason === "EVALUATOR_MISSING" ? reason : pendingReasonFor(criterionKey, wired),
    };
  };
}

/** Production evaluator-type registry. No unapproved degradation curves. */
export function createGovernedEvaluatorTypeRegistry(): CriterionEvaluatorRegistry {
  return createCriterionEvaluatorRegistry({
    [RECOMMENDATION_EVALUATOR_TYPES.PENDING_CONTRACT]: typedPendingEvaluator("SCORING_CONTRACT_PENDING"),
    [RECOMMENDATION_EVALUATOR_TYPES.NOT_IMPLEMENTED]: typedPendingEvaluator("EVALUATOR_MISSING"),
    [RECOMMENDATION_EVALUATOR_TYPES.CAPPED_REQUIREMENT_RATIO]: cappedRequirementRatioEvaluator,
    [RECOMMENDATION_EVALUATOR_TYPES.RELATIVE_TO_ELIGIBLE_MAX]: relativeToEligibleMaxEvaluator,
    [RECOMMENDATION_EVALUATOR_TYPES.WITHIN_NORM_OR_PENDING]: withinNormOrPendingEvaluator,
    [RECOMMENDATION_EVALUATOR_TYPES.LOWEST_AMONG_ELIGIBLE_OR_PENDING]: lowestAmongEligibleOrPendingEvaluator,
  });
}

/** @deprecated Use createGovernedEvaluatorTypeRegistry. Kept as the production default. */
export function createGovernedCriterionRegistry(): CriterionEvaluatorRegistry {
  return createGovernedEvaluatorTypeRegistry();
}
