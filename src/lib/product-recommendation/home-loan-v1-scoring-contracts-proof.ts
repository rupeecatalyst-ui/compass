import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createGovernedEvaluatorTypeRegistry,
  listProjectedRecommendationFields,
  parseCriterionWeights,
  rankByMatchPercent,
  scoreProgrammes,
  validateWeightPublish,
  weightsTotalExact100,
} from "@/lib/product-recommendation";
import {
  scoreHomeLoanV1Foir,
  scoreHomeLoanV1Ltv,
  scoreHomeLoanV1RoiFromBest,
  roiDifferenceBasisPoints,
  HOME_LOAN_V1_SCORING_PRODUCT_CODES,
} from "@/lib/product-recommendation/home-loan-v1-scoring-contracts";
import { MATCH_PERCENT_CRITERION_REASONS } from "@/lib/product-recommendation/match-percent-reasons";
import type { ActiveRecommendationRuleSet } from "@/lib/product-recommendation/types";

const here = dirname(fileURLToPath(import.meta.url));

const CONFIGURED_V1_WEIGHTS = {
  roiCompetitiveness: 35,
  eligibleAmount: 20,
  foirFit: 15,
  ltvFit: 15,
  tenureAvailability: 15,
} as const;

function ruleSet(productCode: string, selected: Record<string, number>): ActiveRecommendationRuleSet {
  const parsed = parseCriterionWeights(selected);
  if ("error" in parsed) throw new Error(parsed.error);
  return {
    id: `${productCode}-v1-contract`,
    organizationId: "proof-org",
    productCode,
    lineageId: `${productCode}-v1`,
    versionNumber: 1,
    weights: parsed,
    labelledUnapproved: false,
    simulationOnly: false,
    lifecycleStatus: "active",
  };
}

function context(patch: Record<string, unknown>): Record<string, unknown> {
  return {
    programmeId: "base",
    eligibleAmountInputs: { assessedOfferRupees: 10000000, requiredAmountRupees: 10000000 },
    roiCompetitivenessInputs: {
      applicableRoiPercent: 7,
      lowestApplicableRoiPercentAmongEligible: 7,
      scoringDirection: "LOWER_IS_BETTER",
    },
    foirFitInputs: { calculatedFoirPercent: 30, programmeFoirNormPercent: 70, aboveProgrammeNorm: false },
    ltvFitInputs: {
      actualLtvPercent: 50,
      assessedOfferRupees: 10000000,
      propertyValueRupees: 20000000,
      scoringDirection: "LOWER_IS_BETTER",
    },
    tenureAvailabilityInputs: {
      effectiveAvailableTenureMonths: 360,
      highestEffectiveAvailableTenureMonthsAmongEligible: 360,
    },
    ...patch,
  };
}

export async function runHomeLoanV1ScoringContractsProof() {
  const registry = createGovernedEvaluatorTypeRegistry();

  {
    assert.deepEqual([...HOME_LOAN_V1_SCORING_PRODUCT_CODES], ["HOME_LOAN", "HOME_LOAN_BT"]);
    const engine = readFileSync(join(here, "score.ts"), "utf8");
    const weights = readFileSync(join(here, "weights.ts"), "utf8");
    const contracts = readFileSync(join(here, "approved-scoring-contracts.ts"), "utf8");
    const bands = readFileSync(join(here, "home-loan-v1-scoring-contracts.ts"), "utf8");
    assert.doesNotMatch(engine, /roiCompetitiveness:\s*35|eligibleAmount:\s*20|foirFit:\s*15|ltvFit:\s*15|tenureAvailability:\s*15/);
    assert.doesNotMatch(weights, /roiCompetitiveness:\s*35|eligibleAmount:\s*20|foirFit:\s*15/);
    assert.doesNotMatch(contracts, /maxDbrPercent|excludedDbrPercent|DBR 65|dbrPercent/);
    assert.doesNotMatch(bands, /roiCompetitiveness:\s*35|eligibleAmount:\s*20/);
    assert.doesNotMatch(engine, /7\.00%|7\.00\s*\*|marketRoi|MARKET_ROI/);
    console.log("weights remain administrator-configured, DBR is not FOIR: PASS");
  }

  {
    const best = 7;
    const cases: Array<[number, number, number]> = [
      [7.0, 0, 100],
      [7.1, 10, 95],
      [7.25, 25, 85],
      [7.5, 50, 70],
      [7.75, 75, 55],
      [8.0, 100, 40],
      [8.5, 150, 20],
      [8.51, 151, 10],
    ];
    for (const [roi, bps, score] of cases) {
      assert.equal(roiDifferenceBasisPoints(roi, best), bps);
      assert.equal(scoreHomeLoanV1RoiFromBest(roi, best), score);
    }
    const scored = scoreProgrammes({
      ruleSet: ruleSet("HOME_LOAN", { roiCompetitiveness: 100 }),
      programmes: [
        { programmeId: "best", context: context({ roiCompetitivenessInputs: { applicableRoiPercent: 7, lowestApplicableRoiPercentAmongEligible: 7 } }) },
        { programmeId: "plus-10", context: context({ roiCompetitivenessInputs: { applicableRoiPercent: 7.1, lowestApplicableRoiPercentAmongEligible: 7 } }) },
        { programmeId: "plus-25", context: context({ roiCompetitivenessInputs: { applicableRoiPercent: 7.25, lowestApplicableRoiPercentAmongEligible: 7 } }) },
        { programmeId: "plus-50", context: context({ roiCompetitivenessInputs: { applicableRoiPercent: 7.5, lowestApplicableRoiPercentAmongEligible: 7 } }) },
        { programmeId: "plus-75", context: context({ roiCompetitivenessInputs: { applicableRoiPercent: 7.75, lowestApplicableRoiPercentAmongEligible: 7 } }) },
        { programmeId: "plus-100", context: context({ roiCompetitivenessInputs: { applicableRoiPercent: 8, lowestApplicableRoiPercentAmongEligible: 7 } }) },
        { programmeId: "plus-150", context: context({ roiCompetitivenessInputs: { applicableRoiPercent: 8.5, lowestApplicableRoiPercentAmongEligible: 7 } }) },
        { programmeId: "over-150", context: context({ roiCompetitivenessInputs: { applicableRoiPercent: 8.51, lowestApplicableRoiPercentAmongEligible: 7 } }) },
      ],
      registry,
    });
    assert.equal(scored.ok, true);
    if (scored.ok) {
      const byId = Object.fromEntries(scored.scores.map((row) => [row.programmeId, row.matchPercent]));
      assert.deepEqual(byId, {
        best: 100,
        "plus-10": 95,
        "plus-25": 85,
        "plus-50": 70,
        "plus-75": 55,
        "plus-100": 40,
        "plus-150": 20,
        "over-150": 10,
      });
      assert.equal(scored.scores.find((row) => row.programmeId === "plus-10")?.contributions[0]?.inputs?.differenceBps, 10);
      assert.notEqual(scored.scores.find((row) => row.programmeId === "plus-10")?.contributions[0]?.reason, MATCH_PERCENT_CRITERION_REASONS.ROI_SCORING_CONTRACT_PENDING);
    }
    const missing = scoreProgrammes({
      ruleSet: ruleSet("HOME_LOAN", { roiCompetitiveness: 100 }),
      programmes: [
        {
          programmeId: "missing",
          context: context({
            roiCompetitivenessInputs: {
              applicableRoiPercent: null,
              lowestApplicableRoiPercentAmongEligible: 7,
              pendingReason: MATCH_PERCENT_CRITERION_REASONS.APPLICABLE_ROI_UNAVAILABLE,
            },
          }),
        },
      ],
      registry,
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) {
      assert.ok(missing.code === "SCORING_CONTRACT_PENDING" || missing.code === "SCORING_INPUT_REQUIRED");
      assert.ok(
        missing.detail === MATCH_PERCENT_CRITERION_REASONS.APPLICABLE_ROI_UNAVAILABLE || missing.detail === "missing",
      );
    }
    console.log("ROI TEST: PASS");
  }

  {
    const cases: Array<[number, number]> = [
      [30, 100],
      [30.01, 90],
      [40, 90],
      [40.01, 75],
      [50, 75],
      [50.01, 60],
      [60, 60],
      [60.01, 40],
      [70, 40],
      [70.01, 20],
    ];
    for (const [foir, score] of cases) assert.equal(scoreHomeLoanV1Foir(foir), score);
    const aboveNorm = scoreProgrammes({
      ruleSet: ruleSet("HOME_LOAN", { foirFit: 100 }),
      programmes: [
        {
          programmeId: "above-norm",
          context: context({
            foirFitInputs: {
              calculatedFoirPercent: 55,
              programmeFoirNormPercent: 35,
              aboveProgrammeNorm: true,
            },
          }),
        },
      ],
      registry,
    });
    assert.equal(aboveNorm.ok, true);
    if (aboveNorm.ok) {
      assert.equal(aboveNorm.scores[0]?.matchPercent, 60);
      assert.equal(aboveNorm.scores[0]?.contributions[0]?.status, "scored");
      assert.equal(aboveNorm.scores[0]?.contributions[0]?.inputs?.aboveProgrammeNorm, true);
    }
    console.log("FOIR TEST: PASS");
  }

  {
    const cases: Array<[number, number]> = [
      [50, 100],
      [50.01, 90],
      [60, 90],
      [60.01, 75],
      [70, 75],
      [70.01, 60],
      [75, 60],
      [75.01, 45],
      [80, 45],
      [80.01, 25],
      [90, 25],
      [90.01, 10],
    ];
    for (const [ltv, score] of cases) assert.equal(scoreHomeLoanV1Ltv(ltv), score);
    console.log("LTV TEST: PASS");
  }

  {
    const scored = scoreProgrammes({
      ruleSet: ruleSet("HOME_LOAN", { eligibleAmount: 100 }),
      programmes: [
        {
          programmeId: "below",
          context: context({
            eligibleAmountInputs: { assessedOfferRupees: 8000000, requiredAmountRupees: 10000000 },
          }),
        },
        {
          programmeId: "equal",
          context: context({
            eligibleAmountInputs: { assessedOfferRupees: 10000000, requiredAmountRupees: 10000000 },
          }),
        },
        {
          programmeId: "above",
          context: context({
            eligibleAmountInputs: { assessedOfferRupees: 12000000, requiredAmountRupees: 10000000 },
          }),
        },
      ],
      registry,
    });
    assert.equal(scored.ok, true);
    if (scored.ok) {
      const byId = Object.fromEntries(scored.scores.map((row) => [row.programmeId, row.matchPercent]));
      assert.deepEqual(byId, { below: 80, equal: 100, above: 100 });
    }
    console.log("ELIGIBLE AMOUNT TEST: PASS");
  }

  {
    const scored = scoreProgrammes({
      ruleSet: ruleSet("HOME_LOAN", { tenureAvailability: 100 }),
      programmes: [
        {
          programmeId: "best-tenure",
          context: context({
            tenureAvailabilityInputs: {
              effectiveAvailableTenureMonths: 180,
              highestEffectiveAvailableTenureMonthsAmongEligible: 180,
            },
          }),
        },
        {
          programmeId: "shorter",
          context: context({
            tenureAvailabilityInputs: {
              effectiveAvailableTenureMonths: 60,
              highestEffectiveAvailableTenureMonthsAmongEligible: 180,
            },
          }),
        },
      ],
      registry,
    });
    assert.equal(scored.ok, true);
    if (scored.ok) {
      assert.equal(scored.scores.find((row) => row.programmeId === "best-tenure")?.matchPercent, 100);
      assert.equal(scored.scores.find((row) => row.programmeId === "shorter")?.matchPercent, (60 / 180) * 100);
    }
    console.log("TENURE REGRESSION: PASS");
  }

  {
    const parsed = parseCriterionWeights(CONFIGURED_V1_WEIGHTS);
    if ("error" in parsed) throw new Error(parsed.error);
    assert.equal(parsed.total, 100);
    assert.equal(weightsTotalExact100(parsed), true);
    assert.equal(validateWeightPublish(CONFIGURED_V1_WEIGHTS), null);
    assert.equal(
      validateWeightPublish({
        "derived:applicableRoiPercent": 35,
        "derived:assessedOfferRupees": 20,
        "derived:foirPercent": 15,
        "derived:ltvPercent": 15,
        "derived:effectiveTenureMonths": 15,
      }),
      null,
    );
    assert.equal(
      validateWeightPublish({
        "derived:applicableRoiPercent": 35,
        "derived:assessedOfferRupees": 20,
        "derived:foirPercent": 15,
        "derived:ltvPercent": 15,
        "ppo:maxTenureMonths": 15,
      }),
      "SCORING_CONTRACT_PENDING",
    );
    assert.equal(
      validateWeightPublish({
        roiCompetitiveness: 35,
        eligibleAmount: 20,
        foirFit: 15,
        ltvFit: 15,
        tenureAvailability: 10,
      }),
      "WEIGHTS_NOT_EXACTLY_100",
    );
    assert.equal(validateWeightPublish({ "assessment:cibil.exactScore": 100 }), "SCORING_CONTRACT_PENDING");
    console.log("WEIGHT VALIDATION: PASS");
  }

  {
    const scored = scoreProgrammes({
      ruleSet: ruleSet("HOME_LOAN", { ...CONFIGURED_V1_WEIGHTS }),
      programmes: [
        { programmeId: "alpha", context: context({}) },
        {
          programmeId: "beta",
          context: context({
            eligibleAmountInputs: { assessedOfferRupees: 8000000, requiredAmountRupees: 10000000 },
            roiCompetitivenessInputs: { applicableRoiPercent: 7.1, lowestApplicableRoiPercentAmongEligible: 7 },
            foirFitInputs: { calculatedFoirPercent: 40, programmeFoirNormPercent: 70, aboveProgrammeNorm: false },
            ltvFitInputs: {
              actualLtvPercent: 60,
              assessedOfferRupees: 8000000,
              propertyValueRupees: 20000000 / 1.5,
            },
            tenureAvailabilityInputs: {
              effectiveAvailableTenureMonths: 180,
              highestEffectiveAvailableTenureMonthsAmongEligible: 360,
            },
          }),
        },
      ],
      registry,
    });
    assert.equal(scored.ok, true);
    if (scored.ok) {
      const alpha = scored.scores.find((row) => row.programmeId === "alpha")!;
      const beta = scored.scores.find((row) => row.programmeId === "beta")!;
      assert.equal(alpha.matchPercent, 100);
      const expectedBeta =
        95 * 0.35 +
        80 * 0.2 +
        90 * 0.15 +
        90 * 0.15 +
        50 * 0.15;
      assert.ok(Math.abs(beta.matchPercent - expectedBeta) < 0.0001);
      for (const row of scored.scores) {
        const sum = row.contributions.reduce((total, item) => total + (item.weightedContribution ?? 0), 0);
        assert.ok(Math.abs(sum - row.matchPercent) < 0.0001);
        assert.equal(row.contributions.length, 5);
        for (const item of row.contributions) {
          assert.equal(item.status, "scored");
          assert.ok(item.inputs);
          assert.ok(item.weightPercent > 0);
        }
      }
      assert.equal(scored.ruleSet.versionNumber, 1);
      assert.equal(scored.ruleSet.productCode, "HOME_LOAN");
      const hlbt = scoreProgrammes({
        ruleSet: ruleSet("HOME_LOAN_BT", { ...CONFIGURED_V1_WEIGHTS }),
        programmes: [{ programmeId: "bt", context: context({}) }],
        registry,
      });
      assert.equal(hlbt.ok, true);
      if (hlbt.ok) assert.equal(hlbt.scores[0]?.matchPercent, 100);
      const homeLoanFields = listProjectedRecommendationFields({ productCode: "HOME_LOAN" });
      const hlbtFields = listProjectedRecommendationFields({ productCode: "HOME_LOAN_BT" });
      const personal = listProjectedRecommendationFields({ productCode: "PERSONAL_LOAN" });
      assert.equal(homeLoanFields.find((row) => row.id === "derived:foirPercent")?.scoreability, "fully_scorable");
      assert.equal(hlbtFields.find((row) => row.id === "derived:ltvPercent")?.scoreability, "fully_scorable");
      const tenureField = homeLoanFields.find((row) => row.id === "derived:effectiveTenureMonths");
      assert.equal(tenureField?.label, "Max Tenure Months");
      assert.equal(tenureField?.scoreability, "fully_scorable");
      assert.equal(tenureField?.evaluatorType, "relative_to_eligible_max");
      assert.equal(homeLoanFields.some((row) => row.id === "ppo:maxTenureMonths"), false);
      assert.equal(personal.some((row) => row.id === "derived:foirPercent"), false);
      assert.equal(personal.some((row) => row.id === "derived:ltvPercent"), false);
      assert.equal(personal.some((row) => row.id === "derived:applicableRoiPercent"), false);
    }
    console.log("weighted Match % and product scope: PASS");
  }

  {
    const ranked = rankByMatchPercent([
      { item: {}, programmeId: "p-low", matchPercent: 80, applicableRoiPercent: 7, tentativeOfferRupees: 1 },
      { item: {}, programmeId: "p-high", matchPercent: 90, applicableRoiPercent: 9, tentativeOfferRupees: 1 },
      { item: {}, programmeId: "tie-b", matchPercent: 70, applicableRoiPercent: 8, tentativeOfferRupees: 2 },
      { item: {}, programmeId: "tie-a", matchPercent: 70, applicableRoiPercent: 8, tentativeOfferRupees: 2 },
      { item: {}, programmeId: "tie-roi", matchPercent: 70, applicableRoiPercent: 7.5, tentativeOfferRupees: 1 },
    ]);
    assert.deepEqual(
      ranked.map((row) => row.programmeId),
      ["p-high", "p-low", "tie-roi", "tie-a", "tie-b"],
    );
    const eligibility = readFileSync(
      join(here, "../../../server/services/lender-recommendation/canonical-governed-eligibility.ts"),
      "utf8",
    );
    assert.doesNotMatch(eligibility, /scoreHomeLoanV1Foir|scoreHomeLoanV1Ltv|scoreHomeLoanV1RoiFromBest|foirFitInputs/);
    console.log("RANKING REGRESSION: PASS");
    console.log("no eligibility broadening: PASS");
  }

  console.log("HOME_LOAN_V1_SCORING_CONTRACTS: PASS");
}
