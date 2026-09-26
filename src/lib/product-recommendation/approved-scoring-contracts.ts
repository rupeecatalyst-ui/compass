import { MATCH_PERCENT_CRITERION_REASONS } from "./match-percent-reasons";
import {
  roiDifferenceBasisPoints,
  scoreHomeLoanV1Foir,
  scoreHomeLoanV1Ltv,
  scoreHomeLoanV1RoiFromBest,
} from "./home-loan-v1-scoring-contracts";
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

/** @deprecated Kept for evaluator-type compatibility. FOIR V1 uses foirLowerBetterBandsEvaluator. */
export const withinNormOrPendingEvaluator: CriterionEvaluator = ({ criterionKey, weightPercent, context }) => {
  return foirLowerBetterBandsEvaluator({ criterionKey, weightPercent, context });
};

/** @deprecated Kept for evaluator-type compatibility. ROI V1 uses roiBpsFromBestEvaluator. */
export const lowestAmongEligibleOrPendingEvaluator: CriterionEvaluator = ({
  criterionKey,
  weightPercent,
  context,
}) => {
  return roiBpsFromBestEvaluator({ criterionKey, weightPercent, context });
};

/**
 * HOME_LOAN / HOME_LOAN_BT V1 ROI: lower is better.
 * Anchor is the lowest comparable eligible ROI for this run. Missing ROI stays fail-closed.
 */
export const roiBpsFromBestEvaluator: CriterionEvaluator = ({ criterionKey, weightPercent, context }) => {
  const inputs = bag(context, [`${criterionKey}Inputs`, "roiCompetitivenessInputs"]);
  const applicable = finiteNumber(inputs?.applicableRoiPercent);
  const lowest = finiteNumber(inputs?.lowestApplicableRoiPercentAmongEligible);
  const recorded: CriterionEvaluation["inputs"] = {
    applicableRoiPercent: applicable,
    lowestApplicableRoiPercentAmongEligible: lowest,
    scoringDirection: "LOWER_IS_BETTER",
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
  const differenceBps = roiDifferenceBasisPoints(applicable, lowest);
  return scored(criterionKey, weightPercent, scoreHomeLoanV1RoiFromBest(applicable, lowest), {
    ...recorded,
    differenceBps,
  });
};

/**
 * HOME_LOAN / HOME_LOAN_BT V1 FOIR: lower is better.
 * Programme/policy FOIR norm remains audit/eligibility, not this Match % curve.
 */
export const foirLowerBetterBandsEvaluator: CriterionEvaluator = ({ criterionKey, weightPercent, context }) => {
  const inputs = bag(context, [`${criterionKey}Inputs`, "foirFitInputs"]);
  const calculated = finiteNumber(inputs?.calculatedFoirPercent);
  const norm = finiteNumber(inputs?.programmeFoirNormPercent);
  const recorded: CriterionEvaluation["inputs"] = {
    calculatedFoirPercent: calculated,
    programmeFoirNormPercent: norm,
    aboveProgrammeNorm: inputs?.aboveProgrammeNorm === true,
    scoringDirection: "LOWER_IS_BETTER",
  };
  if (calculated == null) {
    return missing(criterionKey, weightPercent, "SCORING_INPUT_REQUIRED", recorded);
  }
  return scored(criterionKey, weightPercent, scoreHomeLoanV1Foir(calculated), recorded);
};

/**
 * HOME_LOAN / HOME_LOAN_BT V1 LTV: lower is better.
 * Uses assessed/tentative amount ÷ property value. Does not replace programme/RBI caps.
 */
export const ltvLowerBetterBandsEvaluator: CriterionEvaluator = ({ criterionKey, weightPercent, context }) => {
  const inputs = bag(context, [`${criterionKey}Inputs`, "ltvFitInputs"]);
  const assessedLtv = finiteNumber(inputs?.actualLtvPercent);
  const assessedOffer = finiteNumber(inputs?.assessedOfferRupees);
  const propertyValue = finiteNumber(inputs?.propertyValueRupees);
  const recorded: CriterionEvaluation["inputs"] = {
    actualLtvPercent: assessedLtv,
    assessedOfferRupees: assessedOffer,
    propertyValueRupees: propertyValue,
    programmeMaxLtvPercent: finiteNumber(inputs?.programmeMaxLtvPercent),
    scoringDirection: "LOWER_IS_BETTER",
  };
  if (assessedLtv == null || assessedLtv < 0 || assessedOffer == null || assessedOffer <= 0 || propertyValue == null || propertyValue <= 0) {
    return missing(criterionKey, weightPercent, "SCORING_INPUT_REQUIRED", recorded);
  }
  return scored(criterionKey, weightPercent, scoreHomeLoanV1Ltv(assessedLtv), recorded);
};
