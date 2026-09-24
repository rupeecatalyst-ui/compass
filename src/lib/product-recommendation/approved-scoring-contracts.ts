import { MATCH_PERCENT_CRITERION_REASONS } from "./match-percent-reasons";
import type { CriterionEvaluation, CriterionEvaluationContext, CriterionEvaluator } from "./types";

function bag(context: CriterionEvaluationContext, keys: readonly string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const value = context[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pending(
  criterionKey: string,
  weightPercent: number,
  reason: string,
  inputs?: CriterionEvaluation["inputs"],
): CriterionEvaluation {
  return {
    criterionKey,
    status: "scoring_contract_pending",
    criterionScore: null,
    weightPercent,
    weightedContribution: null,
    inputs,
    reason,
  };
}

function missing(
  criterionKey: string,
  weightPercent: number,
  reason: string,
  inputs?: CriterionEvaluation["inputs"],
): CriterionEvaluation {
  return {
    criterionKey,
    status: "missing_required_input",
    criterionScore: null,
    weightPercent,
    weightedContribution: null,
    inputs,
    reason,
  };
}

function scored(
  criterionKey: string,
  weightPercent: number,
  criterionScore: number,
  inputs?: CriterionEvaluation["inputs"],
): CriterionEvaluation {
  return {
    criterionKey,
    status: "scored",
    criterionScore,
    weightPercent,
    weightedContribution: null,
    inputs,
  };
}

/** MIN(assessed / required, 1) * 100. No bonus above the requested amount. */
export const cappedRequirementRatioEvaluator: CriterionEvaluator = ({ criterionKey, weightPercent, context }) => {
  const inputs = bag(context, [`${criterionKey}Inputs`, "eligibleAmountInputs", "fundingFitInputs"]);
  const assessed = finiteNumber(inputs?.assessedOfferRupees);
  const required = finiteNumber(inputs?.requiredAmountRupees);
  const recorded = {
    assessedOfferRupees: assessed,
    requiredAmountRupees: required,
  };
  if (assessed == null || assessed <= 0 || required == null || required <= 0) {
    return missing(criterionKey, weightPercent, "SCORING_INPUT_REQUIRED", recorded);
  }
  return scored(criterionKey, weightPercent, Math.min(assessed / required, 1) * 100, recorded);
};

/** value / maxAmongEligible * 100. Fail closed for nonpositive tenure. */
export const relativeToEligibleMaxEvaluator: CriterionEvaluator = ({ criterionKey, weightPercent, context }) => {
  const inputs = bag(context, [`${criterionKey}Inputs`, "tenureAvailabilityInputs"]);
  const effective = finiteNumber(inputs?.effectiveAvailableTenureMonths);
  const highest = finiteNumber(inputs?.highestEffectiveAvailableTenureMonthsAmongEligible);
  const recorded = {
    effectiveAvailableTenureMonths: effective,
    highestEffectiveAvailableTenureMonthsAmongEligible: highest,
  };
  if (effective == null || effective <= 0 || highest == null || highest <= 0) {
    return missing(criterionKey, weightPercent, "SCORING_INPUT_REQUIRED", recorded);
  }
  return scored(criterionKey, weightPercent, (effective / highest) * 100, recorded);
};

/** 100 when at/under the governed norm. Above-norm curve is not approved. */
export const withinNormOrPendingEvaluator: CriterionEvaluator = ({ criterionKey, weightPercent, context }) => {
  const inputs = bag(context, [`${criterionKey}Inputs`, "foirFitInputs"]);
  const calculated = finiteNumber(inputs?.calculatedFoirPercent);
  const norm = finiteNumber(inputs?.programmeFoirNormPercent);
  const recorded = {
    calculatedFoirPercent: calculated,
    programmeFoirNormPercent: norm,
    aboveProgrammeNorm: inputs?.aboveProgrammeNorm === true,
  };
  if (calculated == null || norm == null) {
    return missing(criterionKey, weightPercent, "SCORING_INPUT_REQUIRED", recorded);
  }
  if (calculated <= norm) {
    return scored(criterionKey, weightPercent, 100, recorded);
  }
  return pending(
    criterionKey,
    weightPercent,
    MATCH_PERCENT_CRITERION_REASONS.FOIR_ABOVE_NORM_SCORING_CONTRACT_PENDING,
    recorded,
  );
};

/** Lowest valid comparable value scores 100. Missing or higher values stay pending. */
export const lowestAmongEligibleOrPendingEvaluator: CriterionEvaluator = ({
  criterionKey,
  weightPercent,
  context,
}) => {
  const inputs = bag(context, [`${criterionKey}Inputs`, "roiCompetitivenessInputs"]);
  const applicable = finiteNumber(inputs?.applicableRoiPercent);
  const lowest = finiteNumber(inputs?.lowestApplicableRoiPercentAmongEligible);
  const recorded = {
    applicableRoiPercent: applicable,
    lowestApplicableRoiPercentAmongEligible: lowest,
  };
  if (applicable == null) {
    return pending(
      criterionKey,
      weightPercent,
      MATCH_PERCENT_CRITERION_REASONS.APPLICABLE_ROI_UNAVAILABLE,
      recorded,
    );
  }
  if (lowest == null) {
    return missing(criterionKey, weightPercent, "SCORING_INPUT_REQUIRED", recorded);
  }
  if (applicable === lowest) {
    return scored(criterionKey, weightPercent, 100, recorded);
  }
  return pending(
    criterionKey,
    weightPercent,
    MATCH_PERCENT_CRITERION_REASONS.ROI_SCORING_CONTRACT_PENDING,
    recorded,
  );
};
