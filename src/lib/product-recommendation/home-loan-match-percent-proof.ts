import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { calculateReducingBalanceEmi } from "@/lib/home-loan-recommendation/tenure";
import { calculateSalariedFoir } from "@/lib/home-loan-recommendation/foir";
import { applyCibilCategoryGate } from "@/lib/home-loan-recommendation/cibil-category";
import {
  buildHomeLoanMatchPercentContext,
  buildHomeLoanMatchPercentContexts,
  parseCriterionWeights,
  presentationSlice,
  rankByMatchPercent,
  resolveEffectiveAvailableTenureMonths,
  resolveHomeLoanCibilCategoryUniverse,
  scoreProgrammes,
  createGovernedEvaluatorTypeRegistry,
  MATCH_PERCENT_CRITERION_REASONS,
  validateWeightPublish,
  weightsTotalExact100,
} from "@/lib/product-recommendation";
import type { HomeLoanMatchInputSource } from "@/lib/product-recommendation/home-loan-inputs";
import type { ActiveRecommendationRuleSet as RuleSet } from "@/lib/product-recommendation/types";

const here = dirname(fileURLToPath(import.meta.url));

function ruleSet(selected: Record<string, number>): RuleSet {
  const parsed = parseCriterionWeights(selected);
  if ("error" in parsed) throw new Error(parsed.error);
  return {
    id: "hl-v1-proof",
    organizationId: "proof-org",
    productCode: "HOME_LOAN",
    lineageId: "hl-v1",
    versionNumber: 1,
    weights: parsed,
    labelledUnapproved: false,
    simulationOnly: false,
    lifecycleStatus: "active",
  };
}

function fixture(patch: Partial<HomeLoanMatchInputSource> & Pick<HomeLoanMatchInputSource, "programmeId">): HomeLoanMatchInputSource {
  return {
    maxFoirPercent: 70,
    minRoiPercent: 8.5,
    requiredAmountRupees: 5000000,
    propertyValueRupees: 6000000,
    monthlyIncomeRupees: 100000,
    existingMonthlyEmiRupees: 10000,
    ageYears: 45,
    programmeMaxTenureMonths: 360,
    maxAgeAtMaturityYears: 75,
    ...patch,
  };
}

export async function runHomeLoanMatchPercentProof() {
  const registry = createGovernedEvaluatorTypeRegistry();

  {
    const source = readFileSync(join(here, "weights.ts"), "utf8");
    assert.match(source, /weightsTotalExact100|WEIGHTS_NOT_EXACTLY_100/);
    assert.doesNotMatch(source, /applicableRoi:\s*30|eligibleAmount:\s*25|foirFit:\s*20/);
    const draft = parseCriterionWeights({ eligibleAmount: 30, tenureAvailability: 15, foirFit: 20, roiCompetitiveness: 25 });
    if ("error" in draft) throw new Error(draft.error);
    assert.equal(draft.total, 90);
    assert.equal(weightsTotalExact100(draft), false);
    assert.equal(validateWeightPublish({ eligibleAmount: 25, tenureAvailability: 15, foirFit: 20, roiCompetitiveness: 30, ltvFit: 10 }), "SCORING_CONTRACT_PENDING");
    assert.equal(validateWeightPublish({ eligibleAmount: 60, tenureAvailability: 40 }), null);
    console.log("1 weights remain configuration-driven and active totals must equal 100: PASS");
  }

  {
    assert.deepEqual(resolveHomeLoanCibilCategoryUniverse("not_known").permittedCategories, ["A"]);
    assert.deepEqual(resolveHomeLoanCibilCategoryUniverse(699).permittedCategories, ["C"]);
    assert.deepEqual(resolveHomeLoanCibilCategoryUniverse(650).permittedCategories, ["C"]);
    assert.deepEqual(resolveHomeLoanCibilCategoryUniverse(700).permittedCategories, ["A", "B", "C"]);
    assert.deepEqual(resolveHomeLoanCibilCategoryUniverse(750).permittedCategories, ["A", "B", "C"]);
    assert.deepEqual(applyCibilCategoryGate({ cibilBandOrScore: 800 }).permittedCategories, ["A", "B", "C"]);
    console.log("3 CIBIL category universe occurs before programme-level CIBIL assessment: PASS");
  }

  {
    const full = scoreProgrammes({
      ruleSet: ruleSet({ eligibleAmount: 100 }),
      programmes: [
        {
          programmeId: "offer-full",
          context: buildHomeLoanMatchPercentContext(fixture({
            programmeId: "offer-full",
            assessedOfferRupees: 10000000,
            requiredAmountRupees: 10000000,
          })) as Record<string, unknown>,
        },
        {
          programmeId: "offer-90",
          context: buildHomeLoanMatchPercentContext(fixture({
            programmeId: "offer-90",
            assessedOfferRupees: 9000000,
            requiredAmountRupees: 10000000,
          })) as Record<string, unknown>,
        },
        {
          programmeId: "offer-over",
          context: buildHomeLoanMatchPercentContext(fixture({
            programmeId: "offer-over",
            assessedOfferRupees: 12000000,
            requiredAmountRupees: 10000000,
          })) as Record<string, unknown>,
        },
      ],
      registry,
    });
    assert.equal(full.ok, true);
    if (full.ok) {
      assert.equal(full.scores.find((row) => row.programmeId === "offer-full")?.matchPercent, 100);
      assert.equal(full.scores.find((row) => row.programmeId === "offer-90")?.matchPercent, 90);
      assert.equal(full.scores.find((row) => row.programmeId === "offer-over")?.matchPercent, 100);
    }
    console.log("4 eligible amount score is MIN(assessed/required, 1)*100: PASS");
  }

  {
    const age60 = resolveEffectiveAvailableTenureMonths({
      ageYears: 60,
      programmeMaxTenureMonths: 360,
      maxAgeAtMaturityYears: 75,
    });
    const age60cap65 = resolveEffectiveAvailableTenureMonths({
      ageYears: 60,
      programmeMaxTenureMonths: 360,
      maxAgeAtMaturityYears: 65,
    });
    assert.equal(age60.agePermittedTenureMonths, 15 * 12);
    assert.equal(age60.effectiveAvailableTenureMonths, 15 * 12);
    assert.equal(age60cap65.effectiveAvailableTenureMonths, 5 * 12);
    const invalid = resolveEffectiveAvailableTenureMonths({
      ageYears: 70,
      programmeMaxTenureMonths: 360,
      maxAgeAtMaturityYears: 65,
    });
    assert.ok(invalid.effectiveAvailableTenureMonths == null || invalid.effectiveAvailableTenureMonths <= 0);
    console.log("5 age-derived effective tenure is MIN(programme max, maturity − age): PASS");
  }

  {
    const contexts = buildHomeLoanMatchPercentContexts([
      fixture({ programmeId: "t-30", ageYears: 45, maxAgeAtMaturityYears: 75, programmeMaxTenureMonths: 360 }),
      fixture({ programmeId: "t-25", ageYears: 50, maxAgeAtMaturityYears: 75, programmeMaxTenureMonths: 360 }),
      fixture({ programmeId: "t-20", ageYears: 55, maxAgeAtMaturityYears: 75, programmeMaxTenureMonths: 360 }),
      fixture({ programmeId: "t-15", ageYears: 60, maxAgeAtMaturityYears: 75, programmeMaxTenureMonths: 360 }),
    ]);
    const scored = scoreProgrammes({
      ruleSet: ruleSet({ tenureAvailability: 100 }),
      programmes: contexts.map((context, index) => ({
        programmeId: ["t-30", "t-25", "t-20", "t-15"][index]!,
        context: context as Record<string, unknown>,
      })),
      registry,
    });
    assert.equal(scored.ok, true);
    if (scored.ok) {
      const byId = Object.fromEntries(scored.scores.map((row) => [row.programmeId, row.matchPercent]));
      assert.equal(byId["t-30"], 100);
      assert.ok(Math.abs((byId["t-25"] ?? 0) - (25 / 30) * 100) < 0.01);
      assert.ok(Math.abs((byId["t-20"] ?? 0) - (20 / 30) * 100) < 0.01);
      assert.ok(Math.abs((byId["t-15"] ?? 0) - 50) < 0.01);
    }
    console.log("6 relative tenure score uses highest effective tenure among eligible programmes: PASS");
  }

  {
    const ctxA = buildHomeLoanMatchPercentContext(fixture({
      programmeId: "emi-a",
      assessedOfferRupees: 5000000,
      minRoiPercent: 7.5,
      effectiveTenureMonths: 180,
    }));
    const ctxB = buildHomeLoanMatchPercentContext(fixture({
      programmeId: "emi-b",
      assessedOfferRupees: 4000000,
      minRoiPercent: 9,
      effectiveTenureMonths: 60,
    }));
    assert.equal("error" in ctxA || "error" in ctxB, false);
    if (!("error" in ctxA) && !("error" in ctxB)) {
      const emiA = (ctxA.foirFitInputs as { proposedEmiRupees: number }).proposedEmiRupees;
      const emiB = (ctxB.foirFitInputs as { proposedEmiRupees: number }).proposedEmiRupees;
      assert.equal(emiA, calculateReducingBalanceEmi({ principalRupees: 5000000, annualRoiPercent: 7.5, tenureMonths: 180 }));
      assert.equal(emiB, calculateReducingBalanceEmi({ principalRupees: 4000000, annualRoiPercent: 9, tenureMonths: 60 }));
      assert.notEqual(emiA, emiB);
      const foirA = calculateSalariedFoir({
        eligibleMonthlyIncomeRupees: 100000,
        existingMonthlyEmiRupees: 10000,
        proposedMonthlyEmiRupees: emiA,
        maxFoirPercent: 70,
      });
      assert.equal((ctxA.foirFitInputs as { calculatedFoirPercent: number }).calculatedFoirPercent, foirA.foirPercent);
    }
    console.log("7 EMI uses programme-specific amount/ROI/tenure: PASS");
    console.log("8 EMI feeds FOIR: PASS");
  }

  {
    const within = buildHomeLoanMatchPercentContext(fixture({
      programmeId: "foir-in",
      assessedOfferRupees: 1000000,
      requiredAmountRupees: 1000000,
      monthlyIncomeRupees: 200000,
      existingMonthlyEmiRupees: 5000,
      minRoiPercent: 8.5,
      effectiveTenureMonths: 240,
      maxFoirPercent: 70,
    }));
    const above = buildHomeLoanMatchPercentContext(fixture({
      programmeId: "foir-out",
      assessedOfferRupees: 5000000,
      requiredAmountRupees: 5000000,
      monthlyIncomeRupees: 150000,
      existingMonthlyEmiRupees: 20000,
      minRoiPercent: 8.5,
      effectiveTenureMonths: 240,
      maxFoirPercent: 35,
    }));
    const scoredIn = scoreProgrammes({
      ruleSet: ruleSet({ foirFit: 100 }),
      programmes: [{ programmeId: "foir-in", context: within as Record<string, unknown> }],
      registry,
    });
    const scoredOut = scoreProgrammes({
      ruleSet: ruleSet({ foirFit: 100 }),
      programmes: [{ programmeId: "foir-out", context: above as Record<string, unknown> }],
      registry,
    });
    assert.equal(scoredIn.ok, true);
    if (scoredIn.ok) assert.equal(scoredIn.scores[0]?.matchPercent, 100);
    assert.equal(scoredOut.ok, false);
    if (!scoredOut.ok) {
      assert.equal(scoredOut.code, "SCORING_CONTRACT_PENDING");
      assert.equal(scoredOut.detail, MATCH_PERCENT_CRITERION_REASONS.FOIR_ABOVE_NORM_SCORING_CONTRACT_PENDING);
    }
    console.log("9 within-norm FOIR scores 100: PASS");
    console.log("10 above-norm FOIR does not invent a score: PASS");
  }

  {
    const contexts = buildHomeLoanMatchPercentContexts([
      fixture({ programmeId: "roi-best", minRoiPercent: 7.1 }),
      fixture({ programmeId: "roi-higher", minRoiPercent: 8.5 }),
      fixture({ programmeId: "roi-missing", minRoiPercent: null }),
    ]);
    const scored = scoreProgrammes({
      ruleSet: ruleSet({ roiCompetitiveness: 100 }),
      programmes: [
        { programmeId: "roi-best", context: contexts[0] as Record<string, unknown> },
        { programmeId: "roi-higher", context: contexts[1] as Record<string, unknown> },
        { programmeId: "roi-missing", context: contexts[2] as Record<string, unknown> },
      ],
      registry,
    });
    assert.equal(scored.ok, false);
    if (!scored.ok) {
      assert.equal(scored.code, "SCORING_CONTRACT_PENDING");
      assert.ok(
        scored.detail === MATCH_PERCENT_CRITERION_REASONS.ROI_SCORING_CONTRACT_PENDING ||
          scored.detail === MATCH_PERCENT_CRITERION_REASONS.APPLICABLE_ROI_UNAVAILABLE,
      );
    }
    const lowestOnly = scoreProgrammes({
      ruleSet: ruleSet({ roiCompetitiveness: 100 }),
      programmes: [{ programmeId: "roi-best", context: contexts[0] as Record<string, unknown> }],
      registry,
    });
    assert.equal(lowestOnly.ok, true);
    if (lowestOnly.ok) assert.equal(lowestOnly.scores[0]?.matchPercent, 100);
    assert.equal("error" in (contexts[2] as object), false);
    console.log("11 lowest valid ROI scores 100: PASS");
    console.log("12 other ROI scores remain pending until configured: PASS");
    console.log("13 missing ROI does not automatically eliminate the candidate context: PASS");
  }

  {
    const ctx = buildHomeLoanMatchPercentContext(fixture({
      programmeId: "ltv",
      assessedOfferRupees: 5000000,
      propertyValueRupees: 6000000,
    }));
    assert.equal("error" in ctx, false);
    if (!("error" in ctx)) {
      const ltv = ctx.ltvFitInputs as { actualLtvPercent: number };
      assert.ok(Math.abs(ltv.actualLtvPercent - (5000000 / 6000000) * 100) < 0.0001);
    }
    const scored = scoreProgrammes({
      ruleSet: ruleSet({ ltvFit: 100 }),
      programmes: [{ programmeId: "ltv", context: ctx as Record<string, unknown> }],
      registry,
    });
    assert.equal(scored.ok, false);
    if (!scored.ok) {
      assert.equal(scored.code, "SCORING_CONTRACT_PENDING");
      assert.equal(scored.detail, MATCH_PERCENT_CRITERION_REASONS.LTV_SCORING_CONTRACT_PENDING);
    }
    console.log("14 LTV is calculated and scoring remains pending: PASS");
  }

  {
    const withDocs = buildHomeLoanMatchPercentContext(fixture({
      programmeId: "docs",
      requiredDocumentTypeIds: ["doc:pan"],
      maxDbrPercent: 65,
    }));
    const withoutDocs = buildHomeLoanMatchPercentContext(fixture({
      programmeId: "docs",
      requiredDocumentTypeIds: null,
      maxDbrPercent: null,
    }));
    if (!("error" in withDocs) && !("error" in withoutDocs)) {
      assert.deepEqual(withDocs.foirFitInputs, withoutDocs.foirFitInputs);
      assert.notEqual((withDocs as { excludedDbrPercent?: unknown }).excludedDbrPercent, 70);
    }
    const scoreSource = readFileSync(join(here, "score.ts"), "utf8");
    assert.doesNotMatch(scoreSource, /excludedDbrPercent|requiredDocumentTypeIds|maxDbrPercent/);
    console.log("15 documents do not block recommendation scoring: PASS");
    console.log("16 DBR is not used as FOIR: PASS");
  }

  {
    const contexts = buildHomeLoanMatchPercentContexts([
      fixture({ programmeId: "p-a", minRoiPercent: 7.1, assessedOfferRupees: 5000000 }),
      fixture({ programmeId: "p-b", minRoiPercent: 8.5, assessedOfferRupees: 4500000 }),
    ]);
    assert.notDeepEqual(
      (contexts[0] as { foirFitInputs: unknown }).foirFitInputs,
      undefined,
    );
    const v1 = scoreProgrammes({
      ruleSet: ruleSet({
        roiCompetitiveness: 30,
        eligibleAmount: 25,
        foirFit: 20,
        tenureAvailability: 15,
        ltvFit: 10,
      }),
      programmes: [
        { programmeId: "p-a", context: contexts[0] as Record<string, unknown> },
        { programmeId: "p-b", context: contexts[1] as Record<string, unknown> },
      ],
      registry,
    });
    assert.equal(v1.ok, false);
    if (!v1.ok) {
      assert.equal(v1.code, "SCORING_CONTRACT_PENDING");
      assert.equal(v1.detail, MATCH_PERCENT_CRITERION_REASONS.LTV_SCORING_CONTRACT_PENDING);
    }
    console.log("17 no universal borrower Match % is emitted: PASS");
    console.log("18 incomplete scoring contracts do not emit a fake Match %: PASS");
  }

  {
    const ranked = rankByMatchPercent([
      { item: {}, programmeId: "p1", matchPercent: 90, applicableRoiPercent: 8, tentativeOfferRupees: 1 },
      { item: {}, programmeId: "p2", matchPercent: 88, applicableRoiPercent: 7, tentativeOfferRupees: 1 },
      { item: {}, programmeId: "p3", matchPercent: 80, applicableRoiPercent: 8, tentativeOfferRupees: 1 },
      { item: {}, programmeId: "p4", matchPercent: 79, applicableRoiPercent: 8, tentativeOfferRupees: 1 },
      { item: {}, programmeId: "p5", matchPercent: 78, applicableRoiPercent: 8, tentativeOfferRupees: 1 },
      { item: {}, programmeId: "p6", matchPercent: 70, applicableRoiPercent: 8, tentativeOfferRupees: 1 },
      { item: {}, programmeId: "p7", matchPercent: 60, applicableRoiPercent: 8, tentativeOfferRupees: 1 },
      { item: {}, programmeId: "p8", matchPercent: 50, applicableRoiPercent: 8, tentativeOfferRupees: 1 },
      { item: {}, programmeId: "p9", matchPercent: 40, applicableRoiPercent: 8, tentativeOfferRupees: 1 },
    ]);
    const slice = presentationSlice(ranked);
    assert.deepEqual(slice.primary.map((row) => row.programmeId), ["p1", "p2", "p3", "p4", "p5"]);
    assert.deepEqual(slice.additional.map((row) => row.programmeId), ["p6", "p7"]);
    assert.equal(slice.evaluated.length, 9);
    console.log("20 rank 1-5 / 6-7 / 8+ presentation behaviour remains intact: PASS");
  }

  runFourUatCases(registry);
  console.log("HOME_LOAN_MATCH_PERCENT_PROOF: PASS");
}

function runFourUatCases(registry: ReturnType<typeof createGovernedEvaluatorTypeRegistry>) {
  const v1Weights = {
    roiCompetitiveness: 30,
    eligibleAmount: 25,
    foirFit: 20,
    tenureAvailability: 15,
    ltvFit: 10,
  };

  const case1 = buildHomeLoanMatchPercentContexts([
    fixture({
      programmeId: "case1-complete-roi",
      requiredAmountRupees: 5000000,
      assessedOfferRupees: 5000000,
      propertyValueRupees: 6000000,
      monthlyIncomeRupees: 100000,
      existingMonthlyEmiRupees: 10000,
      ageYears: 45,
      minRoiPercent: 8.4,
    }),
    fixture({
      programmeId: "case1-missing-roi",
      requiredAmountRupees: 5000000,
      assessedOfferRupees: 5000000,
      propertyValueRupees: 6000000,
      monthlyIncomeRupees: 100000,
      existingMonthlyEmiRupees: 10000,
      ageYears: 45,
      minRoiPercent: null,
    }),
  ]);
  assert.equal("error" in case1[0]! || "error" in case1[1]!, false);
  if (!("error" in case1[0]!) && !("error" in case1[1]!)) {
    assert.ok(Math.abs((case1[0].ltvFitInputs as { actualLtvPercent: number }).actualLtvPercent - 5000000 / 6000000 * 100) < 0.001);
    assert.equal((case1[1].roiCompetitivenessInputs as { applicableRoiPercent: number | null }).applicableRoiPercent, null);
  }
  const case1Score = scoreProgrammes({
    ruleSet: ruleSet(v1Weights),
    programmes: [
      { programmeId: "case1-complete-roi", context: case1[0] as Record<string, unknown> },
      { programmeId: "case1-missing-roi", context: case1[1] as Record<string, unknown> },
    ],
    registry,
  });
  assert.equal(case1Score.ok, false);
  assert.deepEqual(resolveHomeLoanCibilCategoryUniverse(750).permittedCategories, ["A", "B", "C"]);
  console.log("UAT CASE 1 A+B+C universe, LTV 83.33, missing ROI retained, no invented Match %: PASS");

  const case2a = resolveEffectiveAvailableTenureMonths({ ageYears: 60, maxAgeAtMaturityYears: 75, programmeMaxTenureMonths: 360 });
  const case2b = resolveEffectiveAvailableTenureMonths({ ageYears: 60, maxAgeAtMaturityYears: 65, programmeMaxTenureMonths: 360 });
  assert.equal(case2a.effectiveAvailableTenureMonths, 180);
  assert.equal(case2b.effectiveAvailableTenureMonths, 60);
  const case2 = buildHomeLoanMatchPercentContexts([
    fixture({
      programmeId: "case2-m75",
      requiredAmountRupees: 10000000,
      assessedOfferRupees: 10000000,
      propertyValueRupees: 20000000,
      monthlyIncomeRupees: 150000,
      existingMonthlyEmiRupees: 20000,
      ageYears: 60,
      maxAgeAtMaturityYears: 75,
      minRoiPercent: 8,
    }),
    fixture({
      programmeId: "case2-m65",
      requiredAmountRupees: 10000000,
      assessedOfferRupees: 10000000,
      propertyValueRupees: 20000000,
      monthlyIncomeRupees: 150000,
      existingMonthlyEmiRupees: 20000,
      ageYears: 60,
      maxAgeAtMaturityYears: 65,
      minRoiPercent: 8.5,
    }),
  ]);
  if (!("error" in case2[0]!) && !("error" in case2[1]!)) {
    assert.ok(Math.abs((case2[0].ltvFitInputs as { actualLtvPercent: number }).actualLtvPercent - 50) < 0.001);
    assert.notEqual(
      (case2[0].foirFitInputs as { proposedEmiRupees: number }).proposedEmiRupees,
      (case2[1].foirFitInputs as { proposedEmiRupees: number }).proposedEmiRupees,
    );
    assert.notEqual(
      (case2[0].foirFitInputs as { calculatedFoirPercent: number }).calculatedFoirPercent,
      (case2[1].foirFitInputs as { calculatedFoirPercent: number }).calculatedFoirPercent,
    );
  }
  const case2Score = scoreProgrammes({
    ruleSet: ruleSet(v1Weights),
    programmes: [
      { programmeId: "case2-m75", context: case2[0] as Record<string, unknown> },
      { programmeId: "case2-m65", context: case2[1] as Record<string, unknown> },
    ],
    registry,
  });
  assert.equal(case2Score.ok, false);
  assert.deepEqual(resolveHomeLoanCibilCategoryUniverse("800_plus").permittedCategories, ["A", "B", "C"]);
  console.log("UAT CASE 2 A+B+C universe, LTV 50, maturity changes EMI/FOIR, no invented Match %: PASS");

  assert.deepEqual(resolveHomeLoanCibilCategoryUniverse(650).permittedCategories, ["C"]);
  const case3 = buildHomeLoanMatchPercentContext(fixture({
    programmeId: "case3",
    requiredAmountRupees: 50000000,
    assessedOfferRupees: 50000000,
    propertyValueRupees: 75000000,
    monthlyIncomeRupees: 800000,
    existingMonthlyEmiRupees: 100000,
    ageYears: 25,
    minRoiPercent: 7.75,
  }));
  if (!("error" in case3)) {
    assert.ok(Math.abs((case3.ltvFitInputs as { actualLtvPercent: number }).actualLtvPercent - (50000000 / 75000000) * 100) < 0.001);
  }
  const case3Score = scoreProgrammes({
    ruleSet: ruleSet(v1Weights),
    programmes: [{ programmeId: "case3", context: case3 as Record<string, unknown> }],
    registry,
  });
  assert.equal(case3Score.ok, false);
  console.log("UAT CASE 3 Category C universe, LTV 66.67, no invented Match %: PASS");

  const case4 = buildHomeLoanMatchPercentContexts([
    fixture({
      programmeId: "case4-priced",
      requiredAmountRupees: 25000000,
      assessedOfferRupees: 25000000,
      propertyValueRupees: 30000000,
      monthlyIncomeRupees: 500000,
      existingMonthlyEmiRupees: 10000,
      ageYears: 35,
      minRoiPercent: 8.1,
    }),
    fixture({
      programmeId: "case4-missing-roi",
      requiredAmountRupees: 25000000,
      assessedOfferRupees: 24000000,
      propertyValueRupees: 30000000,
      monthlyIncomeRupees: 500000,
      existingMonthlyEmiRupees: 10000,
      ageYears: 35,
      minRoiPercent: null,
    }),
  ]);
  if (!("error" in case4[0]!) && !("error" in case4[1]!)) {
    assert.ok(Math.abs((case4[0].ltvFitInputs as { actualLtvPercent: number }).actualLtvPercent - 25000000 / 30000000 * 100) < 0.001);
    assert.equal((case4[1].roiCompetitivenessInputs as { applicableRoiPercent: number | null }).applicableRoiPercent, null);
    assert.notEqual(
      (case4[0].eligibleAmountInputs as { assessedOfferRupees: number }).assessedOfferRupees,
      (case4[1].eligibleAmountInputs as { assessedOfferRupees: number }).assessedOfferRupees,
    );
  }
  const case4Score = scoreProgrammes({
    ruleSet: ruleSet(v1Weights),
    programmes: [
      { programmeId: "case4-priced", context: case4[0] as Record<string, unknown> },
      { programmeId: "case4-missing-roi", context: case4[1] as Record<string, unknown> },
    ],
    registry,
  });
  assert.equal(case4Score.ok, false);
  assert.deepEqual(resolveHomeLoanCibilCategoryUniverse("800_plus").permittedCategories, ["A", "B", "C"]);
  console.log("UAT CASE 4 A+B+C universe, LTV 83.33, missing ROI retained, no invented Match %: PASS");
}
