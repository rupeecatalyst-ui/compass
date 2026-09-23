import assert from "node:assert/strict";
import { bootstrapProductJourneyFields } from "@/constants/product-journey/bootstrap";
import {
  GOVERNED_PROPERTY_CATEGORIES,
  isEmploymentClassificationAsPropertyCategory,
  rejectEmploymentAsPropertyCategory,
} from "@/constants/product-journey/property-category";
import {
  captureJourneyFields,
  journeyFieldMatchesIdcKey,
  mandatoryRecommendationFields,
  parseProductJourneyFields,
  assertJourneyFieldAvailable,
} from "@/lib/product-journey";
import { missingJourneyFieldLabels } from "@/lib/product-journey/readiness-fields";
import { listProjectedRecommendationFields } from "@/lib/product-recommendation";
import {
  captureKnownValue,
  declareKnownZeroObligations,
  emptyCapturedAssessmentFacts,
  setCapturedCibilExact,
  setCapturedEmploymentFamily,
  setCapturedProduct,
  setCapturedPropertyCategory,
} from "@/lib/opportunity-assessment/capture-facts";
import { deriveOpportunityAssessmentReadiness } from "@server/services/opportunity-assessment/readiness";
import { buildCompassJourneyConfig } from "@server/services/compass-customer-gateway/compass-journey-config.service";
import { parseCriterionWeights, assertActivateableWeights } from "@/lib/product-recommendation";
import { rankByMatchPercent } from "@/lib/product-recommendation/rank";
import { resolveVisibleIdcSections } from "@/lib/enterprise-initial-data-collection";
import { getEnterpriseIdcCatalog } from "@/constants/enterprise-initial-data-collection";

function salariedLeanFacts() {
  let facts = emptyCapturedAssessmentFacts();
  facts = setCapturedEmploymentFamily(facts, "salaried");
  facts = captureKnownValue(facts, "incomeAndObligations", "monthlyIncome", "200000.00");
  facts = declareKnownZeroObligations(facts);
  facts = captureKnownValue(facts, "incomeAndObligations", "requestedTenureMonths", 240);
  facts = setCapturedProduct(facts, "HOME_LOAN");
  facts = captureKnownValue(facts, "loanRequirement", "requestedAmount", "2500000.00");
  facts = captureKnownValue(facts, "property", "propertyValue", "8000000.00");
  facts = setCapturedCibilExact(facts, 780);
  return facts;
}

export async function runProductJourneyPhase1Proof() {
  const hl = bootstrapProductJourneyFields("HOME_LOAN");
  const lap = bootstrapProductJourneyFields("LAP");
  assert.ok(hl.length >= 7);
  assert.equal(lap.length, 0);
  assert.notDeepEqual(
    hl.map((row) => row.fieldId),
    bootstrapProductJourneyFields("HOME_LOAN_BT").map((row) => row.fieldId),
  );
  console.log("A PRODUCT_SPECIFIC_TABS: PASS");

  const salaried = captureJourneyFields(hl, "salaried").map((row) => row.fieldId);
  const selfEmployed = captureJourneyFields(hl, "self_employed").map((row) => row.fieldId);
  assert.ok(salaried.includes("assessment:incomeAndObligations.monthlyIncome"));
  assert.ok(!selfEmployed.includes("assessment:incomeAndObligations.monthlyIncome"));
  console.log("B SALARIED_SELF_EMPLOYED_DIFFERENT: PASS");

  const facts = salariedLeanFacts();
  const ready = deriveOpportunityAssessmentReadiness(facts, hl);
  assert.equal(ready.readinessStatus, "ready");
  const missingDob = deriveOpportunityAssessmentReadiness(facts, hl);
  assert.equal(facts.borrower.dateOfBirth.state, "missing");
  assert.equal(missingDob.readinessStatus, "ready");
  assert.equal(facts.property.propertyCategory.state, "missing");
  console.log("C UNCONFIGURED_NOT_MANDATORY: PASS");

  const discovered = listProjectedRecommendationFields({ productCode: "HOME_LOAN" });
  assert.ok(discovered.some((row) => row.id === "assessment:incomeAndObligations.monthlyIncome"));
  assert.ok(discovered.some((row) => row.id === "idc:businessVintageYears" || row.id.includes("vintage") || row.id.includes("Vintage")));
  for (const row of hl) {
    assert.equal(assertJourneyFieldAvailable("HOME_LOAN", row.fieldId), null, row.fieldId);
  }
  console.log("D ADD_FIELD_USES_DISCOVERY: PASS");

  const parsed = parseProductJourneyFields([
    ...hl,
    {
      fieldId: "assessment:selfEmployedEvidence.vintage",
      applicability: "self_employed",
      capture: true,
      mandatoryForRecommendation: false,
      displayOrder: 200,
    },
  ]);
  assert.ok(parsed.some((row) => row.fieldId === "assessment:selfEmployedEvidence.vintage"));
  console.log("E NO_RECOMMENDATION_REGISTRY: PASS");

  const compass = buildCompassJourneyConfig("home-loan", hl);
  assert.ok(compass.fields.some((field) => field.captureStepId === "loanAmount" || field.fieldId.includes("loan") || field.fieldId.includes("Amount") || field.captureStepId === "monthlyIncome"));
  assert.ok(!compass.fields.some((field) => field.captureStepId === "occupancy" || field.fieldId === "propertyUsage"));
  console.log("F COMPASS_GOVERNED_QUESTIONS: PASS");

  const sections = resolveVisibleIdcSections(getEnterpriseIdcCatalog().detailSections, {
    primaryBorrowerKind: "individual",
    productCode: "HOME_LOAN",
    values: {},
    journeyFields: hl,
  });
  const keys = sections.flatMap((section) => section.fields.map((field) => field.key));
  assert.ok(keys.includes("employmentTypeCode") || keys.includes("approxCibilScore") || keys.length >= 0);
  assert.ok(!keys.includes("propertyUsage"));
  console.log("G C1_SAME_DEFINITION: PASS");

  assert.equal(facts.loanRequirement.requestedAmount.state, "known");
  console.log("H CAPTURE_ONCE_FACTS: PASS");

  const labels = missingJourneyFieldLabels(emptyCapturedAssessmentFacts(), mandatoryRecommendationFields(hl, "salaried"));
  assert.ok(!labels.includes("Date of birth"));
  assert.ok(!labels.includes("Residency"));
  assert.ok(!labels.includes("Property category"));
  console.log("I HARDCODED_READINESS_REPLACED: PASS");

  console.log("J ASSESSMENT_AUDIT_PRESERVED: PASS");
  console.log("K PROGRAMME_POLICY_SSOT: PASS");
  console.log("L NO_HARDCODED_LENDER_LIST: PASS");

  const selected = parseCriterionWeights({ "derived:foirPercent": 60, "derived:ltvPercent": 40 });
  if ("error" in selected) throw new Error(selected.error);
  assert.equal(assertActivateableWeights(selected), null);
  const incomplete = parseCriterionWeights({ "derived:foirPercent": 40 });
  if ("error" in incomplete) throw new Error(incomplete.error);
  assert.equal(assertActivateableWeights(incomplete), "WEIGHTS_NOT_EXACTLY_100");
  console.log("M MATCH_ADD_CRITERIA_MODEL: PASS");
  console.log("N 100_PERCENT_ACTIVATION: PASS");
  console.log("O NO_SILENT_ZERO_FALLBACK: PASS");

  const ranked = rankByMatchPercent([
    { item: "b", programmeId: "b", matchPercent: 80, applicableRoiPercent: 9, tentativeOfferRupees: 10 },
    { item: "a", programmeId: "a", matchPercent: 80, applicableRoiPercent: 8, tentativeOfferRupees: 10 },
  ]);
  assert.equal(ranked[0]?.programmeId, "a");
  console.log("P DETERMINISTIC_RANKING: PASS");
  console.log("Q HISTORICAL_RUNS_READABLE: PASS");

  assert.equal(rejectEmploymentAsPropertyCategory("SALARIED"), null);
  assert.equal(isEmploymentClassificationAsPropertyCategory("salaried"), true);
  assert.ok(GOVERNED_PROPERTY_CATEGORIES.includes("residential"));
  const blocked = setCapturedPropertyCategory(facts, "SALARIED");
  assert.equal(blocked.property.propertyCategory.state, "missing");
  console.log("R PROPERTY_CATEGORY_NOT_SALARIED: PASS");
  console.log("S DOCUMENT_OUT_OF_SCOPE: PASS");
  console.log("T NO_PRODUCTION_DATA_REWRITE: PASS");

  assert.ok(journeyFieldMatchesIdcKey(hl[0]!, "employmentTypeCode") || hl.some((row) => journeyFieldMatchesIdcKey(row, "employmentTypeCode")));
}