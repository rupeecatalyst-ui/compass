import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  createCriterionEvaluatorRegistry,
  createGovernedCriterionRegistry,
  parseCriterionWeights,
  presentationSlice,
  rankByMatchPercent,
  scoreProgrammes,
  weightsTotalExact100,
  assertActivateableWeights,
} from "@/lib/product-recommendation";
import { canonicalizeRecommendationProductCode, recommendationProductCodesEquivalent } from "@/lib/product-recommendation/product-code";
import { resolveActiveRecommendationRuleSet } from "@/lib/product-recommendation/resolve-active-rule-set";
import { resolveHomeLoanCibilCategoryUniverse } from "@/lib/product-recommendation/home-loan-cibil-universe";
import {
  buildHomeLoanMatchPercentContext,
  contributingCoApplicantIncomeRupees,
} from "@/lib/product-recommendation/home-loan-inputs";
import { calculateReducingBalanceEmi } from "@/lib/home-loan-recommendation/tenure";
import { calculateSalariedFoir } from "@/lib/home-loan-recommendation/foir";
import { validateWeightPublish } from "@/lib/product-recommendation";
import type { ActiveRecommendationRuleSet } from "@/lib/product-recommendation/types";

const here = dirname(fileURLToPath(import.meta.url));

function ruleSet(productCode: string, selected: Record<string, number>, patch: Partial<ActiveRecommendationRuleSet> = {}): ActiveRecommendationRuleSet {
  const parsed = parseCriterionWeights(selected);
  if ("error" in parsed) throw new Error(parsed.error);
  return {
    id: `${productCode}-rule`,
    organizationId: "org-1",
    productCode,
    lineageId: `${productCode}-lineage`,
    versionNumber: 1,
    weights: parsed,
    labelledUnapproved: false,
    simulationOnly: false,
    lifecycleStatus: "active",
    ...patch,
  };
}

function scoredRegistry() {
  return createCriterionEvaluatorRegistry({
    proofAlpha: ({ weightPercent, context }) => {
      const score = Number(context.proofAlpha);
      return {
        criterionKey: "proofAlpha",
        status: "scored",
        criterionScore: score,
        weightPercent,
        weightedContribution: score * (weightPercent / 100),
      };
    },
    proofBeta: ({ weightPercent, context }) => {
      const score = Number(context.proofBeta);
      return {
        criterionKey: "proofBeta",
        status: "scored",
        criterionScore: score,
        weightPercent,
        weightedContribution: score * (weightPercent / 100),
      };
    },
  });
}

export async function runUniversalMatchPercentPhase1Proof() {
  const registry = scoredRegistry();

  {
    const engineSource = readFileSync(join(here, "score.ts"), "utf8");
    assert.doesNotMatch(engineSource, /journeyKind|maxFoirPercent|cibilBand|HOME_LOAN_BT/);
    assert.doesNotMatch(engineSource, /roiCompetitiveness:\s*15|UNAPPROVED_DRAFT_WEIGHTS/);
    console.log("A universal scorer is not Home-Loan-specific: PASS");
  }

  {
    const homeLoan = scoreProgrammes({
      ruleSet: ruleSet("HOME_LOAN", { proofAlpha: 40, proofBeta: 60 }),
      programmes: [{ programmeId: "hl-1", context: { proofAlpha: 90, proofBeta: 50 } }],
      registry,
    });
    const personalLoan = scoreProgrammes({
      ruleSet: ruleSet("PERSONAL_LOAN", { proofBeta: 100 }),
      programmes: [{ programmeId: "pl-1", context: { proofAlpha: 90, proofBeta: 50 } }],
      registry,
    });
    assert.equal(homeLoan.ok, true);
    assert.equal(personalLoan.ok, true);
    if (homeLoan.ok && personalLoan.ok) {
      assert.notDeepEqual(Object.keys(homeLoan.weights.selected), Object.keys(personalLoan.weights.selected));
      assert.notDeepEqual(homeLoan.weights.selected, personalLoan.weights.selected);
      assert.equal(homeLoan.scores[0]?.matchPercent, 90 * 0.4 + 50 * 0.6);
      assert.equal(personalLoan.scores[0]?.matchPercent, 50);
    }
    console.log("B different products can have different configured criterion sets: PASS");
    console.log("C different products can have different manual weights: PASS");
  }

  {
    const draft = parseCriterionWeights({ proofAlpha: 40, proofBeta: 52 });
    if ("error" in draft) throw new Error(draft.error);
    assert.equal(draft.total, 92);
    assert.equal(weightsTotalExact100(draft), false);
    assert.equal(assertActivateableWeights(draft), "WEIGHTS_NOT_EXACTLY_100");
    console.log("D draft may total !=100: PASS");
  }

  {
    assert.equal(validateWeightPublish({ proofAlpha: 99 }), "WEIGHTS_NOT_EXACTLY_100");
    assert.equal(validateWeightPublish({ proofAlpha: 101 }), "WEIGHTS_NOT_EXACTLY_100");
    assert.equal(
      validateWeightPublish({ foirFit: 40, roiCompetitiveness: 30, ltvFit: 30 }),
      "SCORING_CONTRACT_PENDING",
    );
    console.log("E activation validation rejects 99%: PASS");
    console.log("F activation validation rejects 101%: PASS");
    console.log("G activation validation rejects pending scoring-contract fields at 100%: PASS");
  }

  {
    const unknown = scoreProgrammes({
      ruleSet: ruleSet("HOME_LOAN", { notARealCriterion: 100 }),
      programmes: [{ programmeId: "p1", context: {} }],
      registry,
    });
    assert.equal(unknown.ok, false);
    if (!unknown.ok) assert.equal(unknown.code, "UNKNOWN_CRITERION");
    const missing = scoreProgrammes({
      ruleSet: ruleSet("HOME_LOAN", { lenderScore: 100 }),
      programmes: [{ programmeId: "p1", context: {} }],
      registry,
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.code, "EVALUATOR_MISSING");
    console.log("H unknown criterion fails closed: PASS");
    console.log("I selected criterion without evaluator fails closed: PASS");
  }

  {
    const source = readFileSync(join(here, "score.ts"), "utf8");
    assert.doesNotMatch(source, /roiCompetitiveness:\s*\d+|DEFAULT_WEIGHT|fallbackWeights/);
    const missingRule = resolveActiveRecommendationRuleSet({
      organizationId: "org-1",
      productCode: "HOME_LOAN",
      rows: [],
    });
    assert.equal(missingRule.status, "missing");
    const draftOnly = resolveActiveRecommendationRuleSet({
      organizationId: "org-1",
      productCode: "HOME_LOAN",
      rows: [{
        id: "d1", organizationId: "org-1", productCode: "home-loan", lineageId: "l1", versionNumber: 1,
        weightsJson: { proofAlpha: 100 }, labelledUnapproved: true, simulationOnly: true, lifecycleStatus: "draft",
      }],
    });
    assert.equal(draftOnly.status, "missing");
    console.log("J no hardcoded default weights are used by runtime: PASS");
  }

  {
    const scored = scoreProgrammes({
      ruleSet: ruleSet("ANY_PRODUCT", { proofAlpha: 30, proofBeta: 70 }),
      programmes: [{ programmeId: "p1", context: { proofAlpha: 90, proofBeta: 50 } }],
      registry,
    });
    assert.equal(scored.ok, true);
    if (scored.ok) {
      assert.equal(scored.scores[0]?.contributions[0]?.weightedContribution, 27);
      assert.equal(scored.scores[0]?.contributions[1]?.weightedContribution, 35);
      assert.equal(scored.scores[0]?.matchPercent, 62);
    }
    console.log("K Match % arithmetic is deterministic: PASS");
  }

  {
    const candidates = Array.from({ length: 9 }, (_, index) => ({
      item: { id: `p${index + 1}` },
      programmeId: `p${index + 1}`,
      matchPercent: 90 - index,
      applicableRoiPercent: 8,
      tentativeOfferRupees: 1000000,
    }));
    const ranked = rankByMatchPercent(candidates);
    const slice = presentationSlice(ranked);
    assert.equal(ranked.length, 9);
    assert.deepEqual(ranked.map((row) => row.programmeId), ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9"]);
    assert.deepEqual(slice.primary.map((row) => row.programmeId), ["p1", "p2", "p3", "p4", "p5"]);
    assert.deepEqual(slice.additional.map((row) => row.programmeId), ["p6", "p7"]);
    assert.equal(slice.evaluated.length, 9);
    assert.equal(slice.primary.length + slice.additional.length, 7);
    console.log("L complete candidate universe is scored before display slicing: PASS");
    console.log("M ranking is Match % descending: PASS");
    console.log("N Top 5 slicing does not alter underlying evaluated universe: PASS");
  }

  {
    assert.equal(canonicalizeRecommendationProductCode("HOME-LOAN"), "HOME_LOAN");
    assert.equal(canonicalizeRecommendationProductCode("home-loan"), "HOME_LOAN");
    assert.equal(canonicalizeRecommendationProductCode("home-loan-balance-transfer"), "HOME_LOAN_BT");
    assert.equal(recommendationProductCodesEquivalent("HOME_LOAN", "home-loan"), true);
    assert.equal(recommendationProductCodesEquivalent("HOME_LOAN_BT", "home-loan-balance-transfer"), true);
    const resolved = resolveActiveRecommendationRuleSet({
      organizationId: "org-1",
      productCode: "HOME_LOAN",
      rows: [{
        id: "w1", organizationId: "org-1", productCode: "home-loan", lineageId: "l1", versionNumber: 2,
        weightsJson: { foirFit: 100 }, labelledUnapproved: false, simulationOnly: false, lifecycleStatus: "active",
      }],
    });
    assert.equal(resolved.status, "resolved");
    console.log("O product-code aliases resolve through canonical mapping: PASS");
  }

  {
    const unknown = resolveHomeLoanCibilCategoryUniverse("not_known");
    assert.equal(unknown.cibilKnown, false);
    assert.equal(unknown.numericScore, null);
    assert.deepEqual(unknown.permittedCategories, ["A"]);
    assert.notEqual(unknown.numericScore, 0);
    assert.notEqual(unknown.numericScore, 650);
    assert.notEqual(unknown.numericScore, 700);
    const below = resolveHomeLoanCibilCategoryUniverse(699);
    assert.deepEqual(below.permittedCategories, ["C"]);
    const above = resolveHomeLoanCibilCategoryUniverse(700);
    assert.deepEqual(above.permittedCategories, ["A", "B", "C"]);
    const ranked = rankByMatchPercent([
      { item: { category: "C" }, programmeId: "c-bank", matchPercent: 80, applicableRoiPercent: 8, tentativeOfferRupees: 1 },
      { item: { category: "A" }, programmeId: "a-bank", matchPercent: 70, applicableRoiPercent: 7, tentativeOfferRupees: 9 },
    ]);
    assert.equal(ranked[0]?.programmeId, "c-bank");
    console.log("P CIBIL Not Known remains non-numeric: PASS");
    console.log("Q Home Loan Not Known selects A only: PASS");
    console.log("R Home Loan CIBIL <700 selects C only: PASS");
    console.log("S Home Loan CIBIL >=700 selects A+B+C: PASS");
    console.log("T category does not create ranking priority after selection: PASS");
  }

  {
    const withDocs = buildHomeLoanMatchPercentContext({
      programmeId: "p1",
      requiredDocumentTypeIds: ["doc:pan"],
      maxDbrPercent: 65,
      maxFoirPercent: 70,
      minRoiPercent: 8.5,
      requiredAmountRupees: 1000000,
      propertyValueRupees: 4000000,
      monthlyIncomeRupees: 200000,
      existingMonthlyEmiRupees: 5000,
      customerSelectedTenureMonths: 240,
    });
    const withoutDocs = buildHomeLoanMatchPercentContext({
      programmeId: "p1",
      requiredDocumentTypeIds: null,
      maxDbrPercent: null,
      maxFoirPercent: 70,
      minRoiPercent: 8.5,
      requiredAmountRupees: 1000000,
      propertyValueRupees: 4000000,
      monthlyIncomeRupees: 200000,
      existingMonthlyEmiRupees: 5000,
      customerSelectedTenureMonths: 240,
    });
    assert.equal("error" in withDocs, false);
    assert.equal("error" in withoutDocs, false);
    if (!("error" in withDocs) && !("error" in withoutDocs)) {
      assert.deepEqual(withDocs.foirFitInputs, withoutDocs.foirFitInputs);
      assert.notEqual((withDocs as { excludedDbrPercent?: unknown }).excludedDbrPercent, (withDocs as { foirFitInputs: { programmeFoirNormPercent: number } }).foirFitInputs.programmeFoirNormPercent);
    }
    const scoreSource = readFileSync(join(here, "score.ts"), "utf8");
    assert.doesNotMatch(scoreSource, /requiredDocumentTypeIds|maxDbrPercent|excludedDocumentTypeIds/);
    console.log("U documents do not affect Match %: PASS");
    console.log("V DBR does not feed FOIR: PASS");
  }

  {
    const emi = calculateReducingBalanceEmi({ principalRupees: 5000000, annualRoiPercent: 8.5, tenureMonths: 240 });
    const foir = calculateSalariedFoir({
      eligibleMonthlyIncomeRupees: 150000,
      existingMonthlyEmiRupees: 20000,
      proposedMonthlyEmiRupees: emi,
      maxFoirPercent: 35,
    });
    assert.ok(emi != null);
    assert.equal(foir.numeratorRupees, 20000 + emi);
    assert.equal(foir.withinProgrammeCap, false);
    const ctx70 = buildHomeLoanMatchPercentContext({
      programmeId: "foir-70", maxFoirPercent: 70, minRoiPercent: 8.5,
      requiredAmountRupees: 5000000, propertyValueRupees: 7500000,
      monthlyIncomeRupees: 150000, existingMonthlyEmiRupees: 20000, customerSelectedTenureMonths: 240,
    });
    const ctx35 = buildHomeLoanMatchPercentContext({
      programmeId: "foir-35", maxFoirPercent: 35, minRoiPercent: 8.5,
      requiredAmountRupees: 5000000, propertyValueRupees: 7500000,
      monthlyIncomeRupees: 150000, existingMonthlyEmiRupees: 20000, customerSelectedTenureMonths: 240,
    });
    assert.equal("error" in ctx70 || "error" in ctx35, false);
    if (!("error" in ctx70) && !("error" in ctx35)) {
      const a = ctx70.foirFitInputs as { programmeFoirNormPercent: number; aboveProgrammeNorm: boolean };
      const b = ctx35.foirFitInputs as { programmeFoirNormPercent: number; aboveProgrammeNorm: boolean };
      assert.equal(a.programmeFoirNormPercent, 70);
      assert.equal(b.programmeFoirNormPercent, 35);
      assert.equal(a.aboveProgrammeNorm, false);
      assert.equal(b.aboveProgrammeNorm, true);
    }
    const pending = scoreProgrammes({
      ruleSet: ruleSet("HOME_LOAN", { foirFit: 100 }),
      programmes: [{ programmeId: "p1", context: ctx35 as Record<string, unknown> }],
      registry: createGovernedCriterionRegistry(),
    });
    assert.equal(pending.ok, false);
    if (!pending.ok) assert.equal(pending.code, "SCORING_CONTRACT_PENDING");
    console.log("W FOIR uses obligations + proposed EMI: PASS");
    console.log("X FOIR norm is programme-specific: PASS");
    console.log("Y FOIR above programme norm is not automatically rejected solely for that reason: PASS");
  }

  {
    assert.equal(contributingCoApplicantIncomeRupees({
      acceptsCoApplicantIncome: true, coApplicantDecision: "yes", coApplicantIncomeRupees: 40000,
    }), 40000);
    assert.equal(contributingCoApplicantIncomeRupees({
      acceptsCoApplicantIncome: true, coApplicantDecision: "not_decided", coApplicantIncomeRupees: 40000,
    }), 0);
    assert.equal(contributingCoApplicantIncomeRupees({
      acceptsCoApplicantIncome: false, coApplicantDecision: "yes", coApplicantIncomeRupees: 40000,
    }), 0);
    const used = buildHomeLoanMatchPercentContext({
      programmeId: "p1", maxFoirPercent: 70, minRoiPercent: 8.5,
      requiredAmountRupees: 1000000, propertyValueRupees: 4000000,
      monthlyIncomeRupees: 100000, existingMonthlyEmiRupees: 0, customerSelectedTenureMonths: 240,
      acceptsCoApplicantIncome: true, coApplicantDecision: "yes", coApplicantIncomeRupees: 50000,
    });
    const unused = buildHomeLoanMatchPercentContext({
      programmeId: "p1", maxFoirPercent: 70, minRoiPercent: 8.5,
      requiredAmountRupees: 1000000, propertyValueRupees: 4000000,
      monthlyIncomeRupees: 100000, existingMonthlyEmiRupees: 0, customerSelectedTenureMonths: 240,
      acceptsCoApplicantIncome: true, coApplicantDecision: "no", coApplicantIncomeRupees: 50000,
    });
    if (!("error" in used) && !("error" in unused)) {
      const usedInputs = used.foirFitInputs as { eligibleMonthlyIncomeRupees: number; coApplicantIncomeUsed: boolean };
      const unusedInputs = unused.foirFitInputs as { eligibleMonthlyIncomeRupees: number; coApplicantIncomeUsed: boolean };
      assert.equal(usedInputs.eligibleMonthlyIncomeRupees, 150000);
      assert.equal(usedInputs.coApplicantIncomeUsed, true);
      assert.equal(unusedInputs.eligibleMonthlyIncomeRupees, 100000);
      assert.equal(unusedInputs.coApplicantIncomeUsed, false);
    }
    console.log("Z co-applicant income is used only when explicitly captured as contributing and programme-permitted: PASS");
  }

  {
    const equal = rankByMatchPercent([
      { item: {}, programmeId: "zeta", matchPercent: 80, applicableRoiPercent: 8.1, tentativeOfferRupees: 900000 },
      { item: {}, programmeId: "alpha", matchPercent: 80, applicableRoiPercent: 7.9, tentativeOfferRupees: 800000 },
      { item: {}, programmeId: "mid", matchPercent: 80, applicableRoiPercent: 8.1, tentativeOfferRupees: 950000 },
    ]);
    assert.deepEqual(equal.map((row) => row.programmeId), ["alpha", "mid", "zeta"]);
    console.log("TIE_BREAK lower ROI then higher offer then stable programme id: PASS");
  }

  console.log("UNIVERSAL_MATCH_PERCENT_PHASE1: PASS");
}
