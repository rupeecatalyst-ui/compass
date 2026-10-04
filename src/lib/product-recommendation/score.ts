import { type CriterionEvaluatorRegistry } from "./registry";
import { CANONICAL_RECOMMENDATION_FIELD_PROJECTION, resolveProjectedField } from "./field-projection";
import { isRegisteredEvaluatorType } from "./evaluator-types";
import type {
  ActiveRecommendationRuleSet,
  CriterionEvaluation,
  CriterionEvaluationContext,
  CriterionEvaluator,
  MatchPercentEngineResult,
  ProgrammeMatchScore,
  ProjectedRecommendationField,
} from "./types";
import { weightsTotalExact100 } from "./weights";

export type ScoreableProgramme = {
  programmeId: string;
  context: CriterionEvaluationContext;
};

function contribution(score: number, weightPercent: number): number {
  return score * (weightPercent / 100);
}

function resolveEvaluator(
  key: string,
  registry: CriterionEvaluatorRegistry,
  catalog: readonly ProjectedRecommendationField[],
): { evaluator?: CriterionEvaluator; status?: CriterionEvaluation["status"]; reason?: string } {
  const field = resolveProjectedField(key, catalog);
  if (field) {
    const byType = registry.get(field.evaluatorType);
    if (byType) return { evaluator: byType };
    if (!isRegisteredEvaluatorType(field.evaluatorType) && !registry.get(field.evaluatorType)) {
      return { status: "evaluator_missing", reason: "UNKNOWN_EVALUATOR_TYPE" };
    }
    return { status: "evaluator_missing", reason: "EVALUATOR_MISSING" };
  }
  const byKey = registry.get(key);
  if (byKey) return { evaluator: byKey };
  return { status: "unknown_criterion", reason: "UNKNOWN_CRITERION" };
}

function evaluateOne(
  key: string,
  weightPercent: number,
  context: CriterionEvaluationContext,
  registry: CriterionEvaluatorRegistry,
  catalog: readonly ProjectedRecommendationField[],
): CriterionEvaluation {
  const resolved = resolveEvaluator(key, registry, catalog);
  if (!resolved.evaluator) {
    return {
      criterionKey: key,
      status: resolved.status ?? "unknown_criterion",
      criterionScore: null,
      weightPercent,
      weightedContribution: null,
      reason: resolved.reason,
    };
  }
  const result = resolved.evaluator({ criterionKey: key, weightPercent, context });
  if (result.status === "scored") {
    if (
      result.criterionScore == null ||
      !Number.isFinite(result.criterionScore) ||
      result.criterionScore < 0 ||
      result.criterionScore > 100
    ) {
      return {
        ...result,
        status: "missing_required_input",
        criterionScore: null,
        weightPercent,
        weightedContribution: null,
        reason: "INVALID_CRITERION_SCORE",
      };
    }
    return {
      ...result,
      weightPercent,
      weightedContribution: contribution(result.criterionScore, weightPercent),
    };
  }
  return { ...result, weightPercent, weightedContribution: null };
}

/**
 * Universal Match % engine. Product-agnostic.
 * Does not contain product-specific assumptions, default weights, or scoring curves.
 */
export function scoreProgrammes(input: {
  ruleSet: ActiveRecommendationRuleSet;
  programmes: ScoreableProgramme[];
  registry: CriterionEvaluatorRegistry;
  catalog?: readonly ProjectedRecommendationField[];
}): MatchPercentEngineResult {
  const { ruleSet, programmes, registry } = input;
  const catalog = input.catalog ?? CANONICAL_RECOMMENDATION_FIELD_PROJECTION;
  if (ruleSet.simulationOnly || ruleSet.labelledUnapproved || ruleSet.lifecycleStatus !== "active") {
    return { ok: false, code: "RULE_SET_NOT_ACTIVE" };
  }
  if (!weightsTotalExact100(ruleSet.weights)) {
    return { ok: false, code: "WEIGHTS_NOT_EXACTLY_100" };
  }

  const selected = Object.entries(ruleSet.weights.selected);
  for (const [key] of selected) {
    const sample = evaluateOne(key, ruleSet.weights.selected[key]!, { programmeId: "" }, registry, catalog);
    if (sample.reason === "UNKNOWN_EVALUATOR_TYPE") return { ok: false, code: "UNKNOWN_EVALUATOR_TYPE", detail: key };
    if (sample.status === "unknown_criterion") return { ok: false, code: "UNKNOWN_CRITERION", detail: key };
    if (sample.status === "evaluator_missing") return { ok: false, code: "EVALUATOR_MISSING", detail: key };
  }

  const scores: ProgrammeMatchScore[] = [];
  for (const programme of programmes) {
    const contributions: CriterionEvaluation[] = [];
    for (const [key, weightPercent] of selected) {
      contributions.push(evaluateOne(key, weightPercent, programme.context, registry, catalog));
    }
    if (contributions.some((row) => row.reason === "UNKNOWN_EVALUATOR_TYPE")) {
      return { ok: false, code: "UNKNOWN_EVALUATOR_TYPE" };
    }
    if (contributions.some((row) => row.status === "unknown_criterion")) {
      return { ok: false, code: "UNKNOWN_CRITERION" };
    }
    if (contributions.some((row) => row.status === "evaluator_missing")) {
      return { ok: false, code: "EVALUATOR_MISSING" };
    }
    const pending = contributions.find((row) => row.status === "scoring_contract_pending");
    if (pending) {
      return { ok: false, code: "SCORING_CONTRACT_PENDING", detail: pending.reason ?? programme.programmeId };
    }
    if (contributions.some((row) => row.status === "missing_required_input")) {
      return { ok: false, code: "SCORING_INPUT_REQUIRED", detail: programme.programmeId };
    }
    if (contributions.some((row) => row.status !== "scored" || row.weightedContribution == null)) {
      return { ok: false, code: "NON_SCORABLE", detail: programme.programmeId };
    }
    let matchPercent = 0;
    for (const row of contributions) {
      if (row.weightedContribution == null || !Number.isFinite(row.weightedContribution)) {
        return { ok: false, code: "NON_SCORABLE", detail: programme.programmeId };
      }
      matchPercent += row.weightedContribution;
    }
    scores.push({
      programmeId: programme.programmeId,
      matchPercent: Math.min(100, matchPercent),
      contributions,
    });
  }

  return {
    ok: true,
    scores,
    ruleSet: {
      id: ruleSet.id,
      lineageId: ruleSet.lineageId,
      versionNumber: ruleSet.versionNumber,
      productCode: ruleSet.productCode,
    },
    weights: ruleSet.weights,
  };
}
