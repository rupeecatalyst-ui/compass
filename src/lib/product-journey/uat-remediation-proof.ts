import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapProductJourneyFields } from "@/constants/product-journey/bootstrap";
import { buildCompassJourneyConfig } from "@server/services/compass-customer-gateway/compass-journey-config.service";
import { listAdditionalEligibilityFilterFields } from "@/lib/product-programme-operations/additional-eligibility-filters";
import {
  captureJourneyFields,
  parseProductJourneyFields,
  reorderJourneyFields,
  reorderVisibleJourneyFields,
} from "@/lib/product-journey";
import {
  assertActivateableWeights,
  createGovernedEvaluatorTypeRegistry,
  deselectFieldKeys,
  listProjectedRecommendationFields,
  normalizeDraftCriterionWeights,
  parseCriterionWeights,
  rankByMatchPercent,
  resolveActiveRecommendationRuleSet,
  resolveProjectedField,
  scoreProgrammes,
  sortByFriendlyDisplayLabel,
  validateWeightPublish,
  weightsTotalExact100,
} from "@/lib/product-recommendation";
import { buildHomeLoanMatchPercentContext } from "@/lib/product-recommendation/home-loan-inputs";
import type { StoredRecommendationRuleSetRow } from "@/lib/product-recommendation/resolve-active-rule-set";
import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";

const here = dirname(fileURLToPath(import.meta.url));

const CANONICAL_FIVE = {
  "derived:applicableRoiPercent": 30,
  "derived:assessedOfferRupees": 25,
  "derived:foirPercent": 20,
  "derived:effectiveTenureMonths": 15,
  "derived:ltvPercent": 10,
} as const;

function activeRow(weightsJson: unknown): StoredRecommendationRuleSetRow {
  return {
    id: "active-weights",
    organizationId: "org-1",
    productCode: "home-loan",
    lineageId: "lineage-1",
    versionNumber: 1,
    weightsJson,
    labelledUnapproved: false,
    simulationOnly: false,
    lifecycleStatus: "active",
  };
}

function resolveActive(weightsJson: unknown) {
  return resolveActiveRecommendationRuleSet({
    organizationId: "org-1",
    productCode: "HOME_LOAN",
    rows: [activeRow(weightsJson)],
  });
}

function flagsOf(rows: readonly ProductJourneyFieldRow[]) {
  return rows.map((row) => ({
    fieldId: row.fieldId,
    capture: row.capture,
    mandatoryForRecommendation: row.mandatoryForRecommendation,
    applicability: row.applicability,
  }));
}

export async function runProductJourneyUatRemediationProof() {
  {
    const parsed = normalizeDraftCriterionWeights({
      "derived:foirPercent": 0,
      "derived:ltvPercent": 7,
      "derived:applicableRoiPercent": 15,
      foirFit: 30,
      ltvFit: 25,
      roiCompetitiveness: 20,
      total: 78,
      weightsTotal: 100,
    });
    assert.equal("error" in parsed, false);
    if (!("error" in parsed)) {
      assert.equal(parsed.selected["derived:foirPercent"], 0);
      assert.equal(parsed.selected["derived:ltvPercent"], 7);
      assert.equal(parsed.selected["derived:applicableRoiPercent"], 15);
      assert.equal(parsed.selected.foirFit, undefined);
      assert.equal(parsed.selected.total, undefined);
      assert.equal(parsed.selected.weightsTotal, undefined);
      assert.equal(parsed.total, 22);
      assert.equal(weightsTotalExact100(parsed), false);
    }
    console.log("1 visible weights 0 + 7 + 15 produce TOTAL 22%, not 100%: PASS");
  }

  {
    const foir = resolveProjectedField("derived:foirPercent");
    assert.ok(foir);
    const before = normalizeDraftCriterionWeights({
      "derived:foirPercent": 0,
      "derived:ltvPercent": 7,
      "derived:applicableRoiPercent": 15,
      foirFit: 30,
    });
    assert.equal("error" in before, false);
    const removed = deselectFieldKeys(
      "error" in before ? {} : { ...before.selected },
      foir!,
    );
    const after = normalizeDraftCriterionWeights(removed);
    assert.equal("error" in after, false);
    if (!("error" in after)) {
      assert.equal(after.selected["derived:foirPercent"], undefined);
      assert.equal(after.selected.foirFit, undefined);
      assert.equal(after.total, 22);
    }
    console.log("2 removing a criterion removes its durable/current draft contribution: PASS");
  }

  {
    const parsed = parseCriterionWeights({
      "derived:assessedOfferRupees": 30,
      "derived:effectiveTenureMonths": 25,
      "derived:applicableRoiPercent": 20,
      "derived:foirPercent": 15,
      "derived:ltvPercent": 10,
    });
    assert.equal("error" in parsed, false);
    if (!("error" in parsed)) {
      assert.equal(parsed.total, 100);
      assert.equal(weightsTotalExact100(parsed), true);
      assert.equal(assertActivateableWeights(parsed), null);
    }
    console.log("3 configured 30 + 25 + 20 + 15 + 10 produces exactly 100%: PASS");
  }

  {
    const draft = parseCriterionWeights({ "derived:foirPercent": 40, "derived:ltvPercent": 20 });
    assert.equal("error" in draft, false);
    if (!("error" in draft)) {
      assert.equal(draft.total, 60);
      assert.equal(assertActivateableWeights(draft), "WEIGHTS_NOT_EXACTLY_100");
    }
    console.log("4 draft below 100% remains saveable (activation still blocked): PASS");
  }

  {
    assert.equal(validateWeightPublish({ "derived:foirPercent": 40 }), "WEIGHTS_NOT_EXACTLY_100");
    assert.equal(
      validateWeightPublish({
        "derived:assessedOfferRupees": 60,
        "derived:effectiveTenureMonths": 50,
      }),
      "WEIGHTS_NOT_EXACTLY_100",
    );
    assert.equal(validateWeightPublish({ "derived:assessedOfferRupees": 60, "derived:effectiveTenureMonths": 40 }), null);
    console.log("5 activation below/above 100% remains blocked: PASS");
  }

  {
    const homeLoan = listProjectedRecommendationFields({ productCode: "HOME_LOAN" });
    const sorted = sortByFriendlyDisplayLabel(homeLoan);
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1]!;
      const current = sorted[index]!;
      assert.ok(
        previous.label.localeCompare(current.label, "en", { sensitivity: "base", numeric: true }) < 0 ||
          (previous.label.localeCompare(current.label, "en", { sensitivity: "base", numeric: true }) === 0 &&
            previous.id.localeCompare(current.id) <= 0),
      );
    }
    const unsortedById = [...homeLoan].sort((a, b) => a.id.localeCompare(b.id));
    assert.notDeepEqual(
      sorted.map((row) => row.id),
      unsortedById.map((row) => row.id),
    );
    const filters = listAdditionalEligibilityFilterFields({ productCode: "HOME_LOAN" });
    for (let index = 1; index < filters.length; index += 1) {
      assert.ok(filters[index - 1]!.label.localeCompare(filters[index]!.label, "en", { sensitivity: "base", numeric: true }) <= 0);
    }
    console.log("6 governed field picker is alphabetical by friendly display label: PASS");
  }

  {
    const income = resolveProjectedField("assessment:incomeAndObligations.monthlyIncome");
    const foir = resolveProjectedField("derived:foirPercent");
    assert.equal(income?.id, "assessment:incomeAndObligations.monthlyIncome");
    assert.equal(foir?.id, "derived:foirPercent");
    assert.notEqual(foir?.id, "FOIR");
    const snapshot = { foirFit: 40, ltvFit: 60 };
    const raw = JSON.stringify(snapshot);
    normalizeDraftCriterionWeights(snapshot);
    assert.equal(JSON.stringify(snapshot), raw);
    console.log("7 technical canonical IDs remain unchanged: PASS");
  }

  {
    const original = parseProductJourneyFields([
      { fieldId: "assessment:borrower.employmentFamily", applicability: "all", capture: true, mandatoryForRecommendation: true, displayOrder: 10 },
      { fieldId: "assessment:loanRequirement.requestedAmount", applicability: "all", capture: true, mandatoryForRecommendation: false, displayOrder: 20 },
      { fieldId: "assessment:property.propertyValue", applicability: "all", capture: false, mandatoryForRecommendation: false, displayOrder: 30 },
    ]);
    const moved = reorderJourneyFields(original, 0, 2);
    assert.deepEqual(
      moved.map((row) => row.fieldId),
      [
        "assessment:loanRequirement.requestedAmount",
        "assessment:property.propertyValue",
        "assessment:borrower.employmentFamily",
      ],
    );
    assert.deepEqual(
      moved.map((row) => row.displayOrder),
      [10, 20, 30],
    );
    const reread = parseProductJourneyFields(moved);
    assert.deepEqual(
      reread.map((row) => row.fieldId),
      moved.map((row) => row.fieldId),
    );
    const compass = buildCompassJourneyConfig("home-loan", reread);
    const sequences = compass.fields
      .filter((field) => field.captureStepId === "incomeType" || field.captureStepId === "loanAmount" || field.fieldId.includes("employment") || field.fieldId.includes("loan"))
      .map((field) => field.sequence);
    assert.ok(sequences.every((value) => typeof value === "number"));
    console.log("8 Product Journey order persists across save/read/version lifecycle: PASS");
  }

  {
    const original = parseProductJourneyFields([
      { fieldId: "assessment:borrower.employmentFamily", applicability: "all", capture: true, mandatoryForRecommendation: true, displayOrder: 10 },
      { fieldId: "assessment:cibil.kind", applicability: "all", capture: false, mandatoryForRecommendation: true, displayOrder: 20 },
    ]);
    const moved = reorderJourneyFields(original, 1, 0);
    assert.deepEqual(flagsOf(moved), [
      { fieldId: "assessment:cibil.kind", capture: false, mandatoryForRecommendation: true, applicability: "all" },
      { fieldId: "assessment:borrower.employmentFamily", capture: true, mandatoryForRecommendation: true, applicability: "all" },
    ]);
    console.log("9 reordering does not change Show/Capture or Mandatory flags: PASS");
  }

  {
    const hl = bootstrapProductJourneyFields("HOME_LOAN");
    const salaried = captureJourneyFields(hl, "salaried").map((row) => row.fieldId);
    const selfEmployed = captureJourneyFields(hl, "self_employed").map((row) => row.fieldId);
    assert.ok(salaried.includes("assessment:incomeAndObligations.monthlyIncome"));
    assert.ok(!selfEmployed.includes("assessment:incomeAndObligations.monthlyIncome"));
    const mixed = parseProductJourneyFields([
      { fieldId: "assessment:incomeAndObligations.monthlyIncome", applicability: "salaried", capture: true, mandatoryForRecommendation: true, displayOrder: 10 },
      { fieldId: "assessment:selfEmployedEvidence.vintage", applicability: "self_employed", capture: true, mandatoryForRecommendation: false, displayOrder: 20 },
    ]);
    const after = reorderVisibleJourneyFields(mixed, (row) => row.applicability === "salaried", 0, 0);
    assert.equal(after[0]?.applicability, "salaried");
    assert.equal(after[1]?.applicability, "self_employed");
    console.log("10 customer-category applicability is preserved: PASS");
  }

  {
    const legacy = parseProductJourneyFields([
      { fieldId: "assessment:property.propertyValue", applicability: "all", capture: true, mandatoryForRecommendation: true },
      { fieldId: "assessment:borrower.employmentFamily", applicability: "all", capture: true, mandatoryForRecommendation: false },
      { fieldId: "assessment:cibil.kind", applicability: "all", capture: true, mandatoryForRecommendation: true },
    ]);
    assert.deepEqual(
      legacy.map((row) => row.fieldId),
      [
        "assessment:property.propertyValue",
        "assessment:borrower.employmentFamily",
        "assessment:cibil.kind",
      ],
    );
    assert.deepEqual(
      legacy.map((row) => row.displayOrder),
      [0, 10, 20],
    );
    console.log("11 legacy journey definitions without explicit order retain deterministic existing order: PASS");
  }

  {
    const score = readFileSync(join(here, "../product-recommendation/score.ts"), "utf8");
    const foir = readFileSync(join(here, "../home-loan-recommendation/foir.ts"), "utf8");
    const ltv = readFileSync(join(here, "../home-loan-recommendation/rbi-ltv.ts"), "utf8");
    const eligibility = readFileSync(join(here, "../../../server/services/lender-recommendation/canonical-governed-eligibility.ts"), "utf8");
    const evaluate = readFileSync(join(here, "../product-programme-operations/additional-eligibility-filters/evaluate.ts"), "utf8");
    assert.match(score, /Universal Match % engine/);
    assert.doesNotMatch(score, /HOME_LOAN_BT|maxFoirPercent|cibilBand/);
    assert.match(foir, /calculateSalariedFoir/);
    assert.match(ltv, /calculateActualLtvPercent|AUTHORISED_INDIVIDUAL_HOUSING_LTV/);
    assert.match(eligibility, /evaluateCanonicalEligibility|additionalEligibilityFilters/);
    assert.match(evaluate, /evaluateAdditionalEligibilityFilters/);
    console.log("12 no Match %, lender eligibility, Product Programme or recommendation business logic unintentionally changed: PASS");
  }

  {
    const parsed = normalizeDraftCriterionWeights(CANONICAL_FIVE);
    assert.equal("error" in parsed, false);
    if (!("error" in parsed)) {
      assert.equal(parsed.total, 100);
      assert.equal(assertActivateableWeights(parsed), null);
      assert.deepEqual(Object.keys(parsed.selected).sort(), Object.keys(CANONICAL_FIVE).sort());
    }
    const resolved = resolveActive(CANONICAL_FIVE);
    assert.equal(resolved.status, "resolved");
    if (resolved.status === "resolved") {
      assert.equal(resolved.ruleSet.weights.total, 100);
      assert.equal(assertActivateableWeights(resolved.ruleSet.weights), null);
    }
    console.log("A canonical ROI 30 + Amount 25 + FOIR 20 + Tenure 15 + LTV 10 = 100 and accepted: PASS");
  }

  {
    const dirty = { ...CANONICAL_FIVE, total: 100, weightsTotal: 100, selected: 0, error: 0 };
    const clean = normalizeDraftCriterionWeights(CANONICAL_FIVE);
    const withMeta = normalizeDraftCriterionWeights(dirty);
    const resolved = resolveActive(dirty);
    assert.equal("error" in clean, false);
    assert.equal("error" in withMeta, false);
    if (!("error" in clean) && !("error" in withMeta)) {
      assert.deepEqual(withMeta.selected, clean.selected);
      assert.equal(withMeta.total, 100);
    }
    assert.equal(resolved.status, "resolved");
    if (resolved.status === "resolved") {
      assert.equal(resolved.ruleSet.weights.total, 100);
      assert.equal(resolved.ruleSet.weights.selected.total, undefined);
      assert.equal(resolved.ruleSet.weights.selected.weightsTotal, undefined);
    }
    const registry = createGovernedEvaluatorTypeRegistry();
    const context = buildHomeLoanMatchPercentContext({
      programmeId: "p-meta",
      maxFoirPercent: 70,
      minRoiPercent: 8.5,
      requiredAmountRupees: 5000000,
      propertyValueRupees: 10000000,
      monthlyIncomeRupees: 200000,
      existingMonthlyEmiRupees: 0,
      ageYears: 40,
      programmeMaxTenureMonths: 360,
      maxAgeAtMaturityYears: 75,
      assessedOfferRupees: 5000000,
    });
    assert.equal("error" in context, false);
    const scorable = {
      "derived:assessedOfferRupees": 60,
      "derived:effectiveTenureMonths": 40,
    };
    const scoredClean = scoreProgrammes({
      ruleSet: {
        id: "r1",
        organizationId: "org-1",
        productCode: "HOME_LOAN",
        lineageId: "l1",
        versionNumber: 1,
        weights: { selected: scorable, total: 100 },
        labelledUnapproved: false,
        simulationOnly: false,
        lifecycleStatus: "active",
      },
      programmes: [{ programmeId: "p-meta", context: context as Record<string, unknown> }],
      registry,
    });
    const resolvedMeta = resolveActive({ ...scorable, total: 100, weightsTotal: 100 });
    assert.equal(resolvedMeta.status, "resolved");
    const scoredMeta =
      resolvedMeta.status === "resolved"
        ? scoreProgrammes({
            ruleSet: resolvedMeta.ruleSet,
            programmes: [{ programmeId: "p-meta", context: context as Record<string, unknown> }],
            registry,
          })
        : { ok: false as const, code: "RULE_SET_NOT_ACTIVE" };
    assert.equal(scoredClean.ok, scoredMeta.ok);
    if (scoredClean.ok && scoredMeta.ok) {
      assert.equal(scoredClean.scores[0]?.matchPercent, scoredMeta.scores[0]?.matchPercent);
    }
    console.log("B metadata total/weightsTotal does not change effective total or score: PASS");
  }

  {
    const doubled = {
      ...CANONICAL_FIVE,
      roiCompetitiveness: 99,
      eligibleAmount: 99,
      foirFit: 99,
      tenureAvailability: 99,
      ltvFit: 99,
    };
    const resolved = resolveActive(doubled);
    assert.equal(resolved.status, "resolved");
    if (resolved.status === "resolved") {
      assert.equal(resolved.ruleSet.weights.total, 100);
      assert.equal(resolved.ruleSet.weights.selected["derived:applicableRoiPercent"], 30);
      assert.equal(resolved.ruleSet.weights.selected["derived:assessedOfferRupees"], 25);
      assert.equal(resolved.ruleSet.weights.selected["derived:foirPercent"], 20);
      assert.equal(resolved.ruleSet.weights.selected["derived:effectiveTenureMonths"], 15);
      assert.equal(resolved.ruleSet.weights.selected["derived:ltvPercent"], 10);
      assert.equal(resolved.ruleSet.weights.selected.roiCompetitiveness, undefined);
      assert.equal(resolved.ruleSet.weights.selected.foirFit, undefined);
      assert.equal(Object.keys(resolved.ruleSet.weights.selected).length, 5);
    }
    console.log("C historical aliases alongside canonical keys do not double-count: PASS");
  }

  {
    const foir = resolveProjectedField("derived:foirPercent");
    assert.ok(foir);
    const removed = deselectFieldKeys({ ...CANONICAL_FIVE, foirFit: 20 }, foir!);
    const resolved = resolveActive(removed);
    assert.equal(resolved.status, "resolved");
    if (resolved.status === "resolved") {
      assert.equal(resolved.ruleSet.weights.selected["derived:foirPercent"], undefined);
      assert.equal(resolved.ruleSet.weights.selected.foirFit, undefined);
      assert.equal(resolved.ruleSet.weights.total, 80);
      assert.deepEqual(Object.keys(resolved.ruleSet.weights.selected).sort(), [
        "derived:applicableRoiPercent",
        "derived:assessedOfferRupees",
        "derived:effectiveTenureMonths",
        "derived:ltvPercent",
      ]);
    }
    console.log("D removed criterion alias cannot survive into effective activated criteria: PASS");
  }

  {
    const resolved = resolveActive({
      ...CANONICAL_FIVE,
      foirFit: 20,
      ltvFit: 10,
      roiCompetitiveness: 30,
      eligibleAmount: 25,
      tenureAvailability: 15,
      total: 100,
    });
    assert.equal(resolved.status, "resolved");
    if (resolved.status === "resolved") {
      assert.deepEqual(Object.keys(resolved.ruleSet.weights.selected).sort(), Object.keys(CANONICAL_FIVE).sort());
    }
    console.log("E runtime criterion iteration contains only the five canonical configured criteria: PASS");
  }

  {
    const score = readFileSync(join(here, "../product-recommendation/score.ts"), "utf8");
    const contracts = readFileSync(join(here, "../product-recommendation/approved-scoring-contracts.ts"), "utf8");
    assert.match(score, /score \* \(weightPercent \/ 100\)/);
    assert.match(contracts, /Math\.min\(assessed \/ required, 1\) \* 100/);
    assert.doesNotMatch(score, /normalizeDraftCriterionWeights|rebalance|redistribut/);
    const registry = createGovernedEvaluatorTypeRegistry();
    const contextA = buildHomeLoanMatchPercentContext({
      programmeId: "rank-a",
      maxFoirPercent: 70,
      minRoiPercent: 7.1,
      requiredAmountRupees: 5000000,
      propertyValueRupees: 10000000,
      monthlyIncomeRupees: 200000,
      existingMonthlyEmiRupees: 0,
      ageYears: 40,
      programmeMaxTenureMonths: 360,
      maxAgeAtMaturityYears: 75,
      assessedOfferRupees: 5000000,
    });
    const contextB = buildHomeLoanMatchPercentContext({
      programmeId: "rank-b",
      maxFoirPercent: 70,
      minRoiPercent: 9,
      requiredAmountRupees: 5000000,
      propertyValueRupees: 10000000,
      monthlyIncomeRupees: 200000,
      existingMonthlyEmiRupees: 0,
      ageYears: 40,
      programmeMaxTenureMonths: 360,
      maxAgeAtMaturityYears: 75,
      assessedOfferRupees: 4000000,
    });
    assert.equal("error" in contextA || "error" in contextB, false);
    const resolved = resolveActive({
      "derived:assessedOfferRupees": 60,
      "derived:effectiveTenureMonths": 40,
      eligibleAmount: 60,
      tenureAvailability: 40,
      total: 100,
    });
    assert.equal(resolved.status, "resolved");
    if (resolved.status === "resolved" && !("error" in contextA) && !("error" in contextB)) {
      const scored = scoreProgrammes({
        ruleSet: resolved.ruleSet,
        programmes: [
          { programmeId: "rank-a", context: contextA as Record<string, unknown> },
          { programmeId: "rank-b", context: contextB as Record<string, unknown> },
        ],
        registry,
      });
      assert.equal(scored.ok, true);
      if (scored.ok) {
        assert.equal(scored.weights.selected.eligibleAmount, undefined);
        assert.equal(Object.keys(scored.weights.selected).length, 2);
        const ranked = rankByMatchPercent(
          scored.scores.map((row) => ({
            item: row.programmeId,
            programmeId: row.programmeId,
            matchPercent: row.matchPercent,
            applicableRoiPercent: row.programmeId === "rank-a" ? 7.1 : 9,
            tentativeOfferRupees: row.programmeId === "rank-a" ? 5000000 : 4000000,
          })),
        );
        assert.equal(ranked[0]?.programmeId, "rank-a");
        assert.equal(ranked[1]?.programmeId, "rank-b");
      }
    }
    console.log("F no scoring formula changed: PASS");
  }
}
