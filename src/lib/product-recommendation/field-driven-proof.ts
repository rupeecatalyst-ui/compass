import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  CANONICAL_RECOMMENDATION_FIELD_PROJECTION,
  SUPPORTED_RECOMMENDATION_CRITERIA,
  assertActivateableWeights,
  canonicalFieldIdForKey,
  createCriterionEvaluatorRegistry,
  createGovernedEvaluatorTypeRegistry,
  deselectFieldKeys,
  fieldIsSelected,
  listProjectedRecommendationFields,
  parseCriterionWeights,
  resolveHomeLoanCibilCategoryUniverse,
  resolveProjectedField,
  scoreProgrammes,
  validateWeightPublish,
} from "@/lib/product-recommendation";
import { RECOMMENDATION_EVALUATOR_TYPES } from "@/lib/product-recommendation/evaluator-types";
import type { ActiveRecommendationRuleSet, ProjectedRecommendationField } from "@/lib/product-recommendation/types";
import { emptyOpportunityAssessmentFacts, missingAssessmentFact } from "@/lib/opportunity-assessment/empty-facts";
import type { OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";

const here = dirname(fileURLToPath(import.meta.url));

function ruleSet(selected: Record<string, number>, patch: Partial<ActiveRecommendationRuleSet> = {}): ActiveRecommendationRuleSet {
  const parsed = parseCriterionWeights(selected);
  if ("error" in parsed) throw new Error(parsed.error);
  return {
    id: "proof-rule",
    organizationId: "org-1",
    productCode: "HOME_LOAN",
    lineageId: "lineage",
    versionNumber: 1,
    weights: parsed,
    labelledUnapproved: false,
    simulationOnly: false,
    lifecycleStatus: "active",
    ...patch,
  };
}

const vintageField: ProjectedRecommendationField = {
  id: "assessment:businessVintage",
  label: "Business vintage",
  productCodes: ["HOME_LOAN"],
  sourceKind: "raw",
  fieldKind: "assessment_fact",
  valueType: "integer",
  customerFactRef: "assessment:businessVintage",
  programmeFactRef: null,
  evaluatorType: "proof_equal",
  selectable: true,
  scoreability: "fully_scorable",
  aliases: [],
};

const unknownTypeField: ProjectedRecommendationField = {
  ...vintageField,
  id: "assessment:unknownTypeField",
  label: "Unknown type field",
  evaluatorType: "not_a_real_evaluator_type",
  scoreability: "fully_scorable",
};

const pendingField: ProjectedRecommendationField = {
  ...vintageField,
  id: "assessment:pendingField",
  label: "Pending field",
  evaluatorType: RECOMMENDATION_EVALUATOR_TYPES.PENDING_CONTRACT,
  scoreability: "inputs_wired_scoring_contract_pending",
};

export async function runFieldDrivenRecommendationProof() {
  const typeRegistry = createGovernedEvaluatorTypeRegistry();
  const scoredTypeRegistry = createCriterionEvaluatorRegistry({
    proof_equal: ({ criterionKey, weightPercent }) => ({
      criterionKey,
      status: "scored",
      criterionScore: 100,
      weightPercent,
      weightedContribution: 100,
    }),
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
  });

  {
    const engine = readFileSync(join(here, "score.ts"), "utf8");
    assert.doesNotMatch(engine, /HOME_LOAN_BT|maxFoirPercent|cibilBand/);
    console.log("A scorer remains product-agnostic: PASS");
  }

  {
    const pickerSource = readFileSync(join(here, "field-projection.ts"), "utf8");
    const discoverSource = readFileSync(join(here, "discover-canonical-fields.ts"), "utf8");
    const workspace = readFileSync(
      join(here, "../../components/catalyst-one/admin/home-loan-recommendation-masters-workspace.tsx"),
      "utf8",
    );
    assert.match(pickerSource, /discoverCanonicalRecommendationFields/);
    assert.match(discoverSource, /emptyOpportunityAssessmentFacts|walkAssessmentFactLeaves/);
    assert.match(workspace, /listProjectedRecommendationFields/);
    assert.match(workspace, /Product Journey & Recommendation Master/);
    assert.match(workspace, /\+ Add Field/);
    assert.match(workspace, /\+ Add Criteria/);
    assert.match(workspace, /TOTAL WEIGHTAGE/);
    assert.match(workspace, /Home Loan Balance Transfer/);
    assert.match(workspace, /Save Draft/);
    assert.match(workspace, /Not Known/);
    assert.match(workspace, /Lender Categories/);
    assert.match(workspace, /Regulatory LTV/);
    assert.match(workspace, /Version History \/ Audit Details/);
    assert.doesNotMatch(workspace, /Create labelled unapproved drafts/);
    assert.doesNotMatch(workspace, /supportedCriteria/);
    assert.doesNotMatch(workspace, /Fields used for Match %/);
    assert.doesNotMatch(pickerSource, /assessment:selfEmployedEvidence\.vintage/);
    console.log("B field picker discovers from canonical sources, not a recommendation appearance catalog: PASS");
  }

  const income = resolveProjectedField("assessment:incomeAndObligations.monthlyIncome");
  const foir = resolveProjectedField("derived:foirPercent");
  assert.ok(income);
  assert.equal(income?.sourceKind, "raw");
  assert.equal(income?.customerFactRef, "incomeAndObligations.monthlyIncome");
  console.log("C raw governed field can appear in projection: PASS");
  assert.ok(foir);
  assert.equal(foir?.sourceKind, "derived");
  assert.equal(foir?.fieldKind, "derived_fact");
  console.log("D derived governed field can appear in same projection: PASS");
  assert.notEqual(income?.id, foir?.id);
  console.log("E raw and derived fields have stable distinct IDs: PASS");
  assert.notEqual(income?.id, income?.label);
  assert.notEqual(foir?.id, "FOIR");
  console.log("F field display label is not used as identity: PASS");

  const homeLoan = listProjectedRecommendationFields({ productCode: "HOME_LOAN" });
  const hlbt = listProjectedRecommendationFields({ productCode: "HOME_LOAN_BT" });
  const synthetic = listProjectedRecommendationFields({ productCode: "SYNTHETIC_UNRELATED" });
  assert.ok(homeLoan.some((row) => row.id === "assessment:property.propertyValue"));
  assert.ok(hlbt.some((row) => row.id === "derived:btSavingsRupees"));
  assert.equal(
    homeLoan.some((row) => row.id === "derived:btSavingsRupees"),
    false,
  );
  console.log("G product filtering works: PASS");
  assert.equal(
    synthetic.some((row) => row.id === "assessment:property.propertyValue"),
    false,
  );
  assert.equal(synthetic.some((row) => row.id === "derived:foirPercent"), false);
  assert.equal(synthetic.some((row) => row.id === "ppo:maxFoirExact"), false);
  console.log("H Home Loan field does not automatically appear for unrelated product: PASS");

  const many: Record<string, number> = {};
  homeLoan.slice(0, 8).forEach((row, index) => {
    many[row.id] = index === 0 ? 30 : 10;
  });
  const parsedMany = parseCriterionWeights(many);
  assert.equal("error" in parsedMany, false);
  if (!("error" in parsedMany)) assert.equal(Object.keys(parsedMany.selected).length, 8);
  console.log("I arbitrary number of fields may be selected: PASS");

  const manual = parseCriterionWeights({ "derived:foirPercent": 17, "derived:ltvPercent": 83 });
  assert.equal("error" in manual, false);
  if (!("error" in manual)) {
    assert.equal(manual.selected["derived:foirPercent"], 17);
    assert.equal(manual.selected["derived:ltvPercent"], 83);
  }
  console.log("J manual weights are preserved exactly: PASS");

  const draft = parseCriterionWeights({ "derived:foirPercent": 40 });
  assert.equal("error" in draft, false);
  if (!("error" in draft)) assert.equal(assertActivateableWeights(draft), "WEIGHTS_NOT_EXACTLY_100");
  console.log("K draft can save when total !=100: PASS");

  assert.equal(validateWeightPublish({ "derived:foirPercent": 40 }), "WEIGHTS_NOT_EXACTLY_100");
  console.log("L activate rejects total !=100: PASS");

  const catalogWithVintage = [...CANONICAL_RECOMMENDATION_FIELD_PROJECTION, vintageField];
  assert.equal(
    validateWeightPublish({ "assessment:businessVintage": 100 }, scoredTypeRegistry, catalogWithVintage),
    null,
  );
  console.log("M activate accepts exactly 100 only when all selected fields are scoreable: PASS");

  const pendingDraft = parseCriterionWeights({ "assessment:pendingField": 100 });
  assert.equal("error" in pendingDraft, false);
  console.log("N selectable-but-pending field can exist in draft: PASS");

  assert.equal(
    validateWeightPublish({ "assessment:pendingField": 100 }, typeRegistry, [...CANONICAL_RECOMMENDATION_FIELD_PROJECTION, pendingField]),
    "SCORING_CONTRACT_PENDING",
  );
  console.log("O pending field blocks activation: PASS");

  assert.equal(canonicalFieldIdForKey("foirFit"), "derived:foirPercent");
  assert.equal(resolveProjectedField("foirFit")?.id, "derived:foirPercent");
  const oldJson = { foirFit: 40, ltvFit: 30, roiCompetitiveness: 30 };
  const snapshot = JSON.stringify(oldJson);
  assert.equal(fieldIsSelected(oldJson, foir!), true);
  assert.equal(JSON.stringify(oldJson), snapshot);
  console.log("P old recommendation criterion key remains readable: PASS");

  assert.equal(resolveProjectedField("derived:foirPercent")?.id, "derived:foirPercent");
  console.log("Q new version can use canonical field ID: PASS");
  assert.equal(JSON.stringify(oldJson), snapshot);
  console.log("R no stored historical weightsJson rewrite occurs: PASS");

  const vintageAlreadyInAssessment = listProjectedRecommendationFields({ productCode: "HOME_LOAN" });
  assert.ok(vintageAlreadyInAssessment.some((row) => row.id === "assessment:selfEmployedEvidence.vintage"));
  assert.equal(
    SUPPORTED_RECOMMENDATION_CRITERIA.some(
      (row) => row.key === "assessment:selfEmployedEvidence.vintage" || row.key === "vintage",
    ),
    false,
  );

  const facts = emptyOpportunityAssessmentFacts() as OpportunityAssessmentFactsV1 & {
    borrower: OpportunityAssessmentFactsV1["borrower"] & { newGovernedField?: ReturnType<typeof missingAssessmentFact> };
  };
  facts.borrower = { ...facts.borrower, newGovernedField: missingAssessmentFact() };
  const withNew = listProjectedRecommendationFields({
    productCode: "HOME_LOAN",
    assessmentFacts: facts,
  });
  assert.ok(withNew.some((row) => row.id === "assessment:borrower.newGovernedField"));
  assert.equal(
    SUPPORTED_RECOMMENDATION_CRITERIA.some(
      (row) => row.key === "assessment:borrower.newGovernedField" || row.key === "newGovernedField",
    ),
    false,
  );
  assert.equal(
    homeLoan.some((row) => row.id === "ppo:requiredDocumentTypeIds" || row.id === "ppo:requiredDocuments"),
    false,
  );
  console.log("S new canonical source field becomes available without recommendation-specific registration: PASS");

  const typeKeys = [
    "pending_contract",
    "not_implemented",
    "capped_requirement_ratio",
    "relative_to_eligible_max",
    "within_norm_or_pending",
    "lowest_among_eligible_or_pending",
  ];
  typeKeys.forEach((key) => assert.ok(typeRegistry.get(key)));
  assert.equal(typeRegistry.get("foirFit"), undefined);
  assert.equal(typeRegistry.get("derived:foirPercent"), undefined);
  console.log("T evaluator registry is keyed by evaluator TYPE rather than one evaluator per field: PASS");

  const unknownType = scoreProgrammes({
    ruleSet: ruleSet({ "assessment:unknownTypeField": 100 }),
    programmes: [{ programmeId: "p1", context: {} }],
    registry: typeRegistry,
    catalog: [...CANONICAL_RECOMMENDATION_FIELD_PROJECTION, unknownTypeField],
  });
  assert.equal(unknownType.ok, false);
  if (!unknownType.ok) assert.equal(unknownType.code, "UNKNOWN_EVALUATOR_TYPE");
  console.log("U unknown evaluator type fails closed: PASS");

  const pendingLive = scoreProgrammes({
    ruleSet: ruleSet({ "derived:foirPercent": 100 }),
    programmes: [{ programmeId: "p1", context: {} }],
    registry: typeRegistry,
  });
  assert.equal(pendingLive.ok, false);
  if (!pendingLive.ok) {
    assert.ok(pendingLive.code === "SCORING_INPUT_REQUIRED" || pendingLive.code === "SCORING_CONTRACT_PENDING");
  }
  console.log("V no scoring contract produces no fabricated score: PASS");

  const onlyAlpha = scoreProgrammes({
    ruleSet: ruleSet({ proofAlpha: 100 }),
    programmes: [{ programmeId: "p1", context: { proofAlpha: 80, proofBeta: 10 } }],
    registry: scoredTypeRegistry,
  });
  assert.equal(onlyAlpha.ok, true);
  if (onlyAlpha.ok) {
    assert.equal(onlyAlpha.scores[0]?.matchPercent, 80);
    assert.equal(onlyAlpha.scores[0]?.contributions.some((row) => row.criterionKey === "proofBeta"), false);
  }
  console.log("W unselected field has no weighted contribution: PASS");

  const eligibility = readFileSync(
    join(here, "../../../server/services/lender-recommendation/canonical-governed-eligibility.ts"),
    "utf8",
  );
  assert.doesNotMatch(eligibility, /weightsJson|listProjectedRecommendationFields|foirFit/);
  const afterDeselect = deselectFieldKeys({ "derived:foirPercent": 40, "derived:ltvPercent": 60 }, foir!);
  assert.equal(Object.prototype.hasOwnProperty.call(afterDeselect, "derived:foirPercent"), false);
  assert.equal(afterDeselect["derived:ltvPercent"], 60);
  console.log("X hard eligibility remains independent of field selection: PASS");

  assert.equal(foir?.sourceKind, "derived");
  assert.doesNotMatch(readFileSync(join(here, "../opportunity-assessment/facts-schema.ts"), "utf8"), /foirPercent/);
  console.log("Y FOIR is represented as derived, not fabricated raw customer truth: PASS");

  const notKnown = resolveHomeLoanCibilCategoryUniverse("not_known");
  assert.equal(notKnown.numericScore, null);
  assert.deepEqual(notKnown.permittedCategories, ["A"]);
  assert.deepEqual(resolveHomeLoanCibilCategoryUniverse(699).permittedCategories, ["C"]);
  assert.deepEqual(resolveHomeLoanCibilCategoryUniverse(700).permittedCategories, ["A", "B", "C"]);
  assert.equal(
    homeLoan.some((row) => row.id === "derived:cibilCategory" || /cibilCategory/i.test(row.id)),
    false,
  );
  console.log("Z CIBIL category remains universe logic, not Match % weight: PASS");

  console.log("FIELD_DRIVEN_RECOMMENDATION: PASS");
}
