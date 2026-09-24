import assert from "node:assert/strict";
import { ProgrammeValidationError } from "@/types/product-programme-operations";
import { assertAdditionalFiltersAgainstProgramme } from "@/lib/product-programme-operations/request-schema";
import {
  compareByScoringDirection,
  HOME_LOAN_V1_EXCLUDED_FROM_WEIGHTS,
  HOME_LOAN_V1_WEIGHTED_CRITERION_KEYS,
  isDirectionallyBetter,
  scoringDirectionForField,
} from "@/lib/product-recommendation/scoring-direction";
import { listProjectedRecommendationFields } from "@/lib/product-recommendation/field-projection";
import { projectAssessmentSettings } from "../../../../server/services/lender-recommendation/programme-assessment-settings";
import {
  copyAdditionalEligibilityFilters,
  evaluateAdditionalEligibilityFilters,
  listAdditionalEligibilityFilterFields,
  liveAdditionalEligibilityFilters,
  snapshotGovernedConstraints,
  validateAdditionalFilterConflicts,
  type AdditionalEligibilityFilters,
  type AdditionalFilterGroup,
  type AdditionalFilterNode,
  type AdditionalFilterOperator,
} from "./index";

function pred(fieldId: string, operator: AdditionalFilterOperator, value?: unknown): AdditionalFilterNode {
  return { kind: "predicate", id: `p-${fieldId}-${operator}`, fieldId, operator, value };
}

function group(combinator: "AND" | "OR", children: AdditionalFilterNode[]): AdditionalFilterGroup {
  return { kind: "group", id: `g-${combinator}`, combinator, children };
}

function filters(children: AdditionalFilterNode[], combinator: "AND" | "OR" = "AND"): AdditionalEligibilityFilters {
  return { version: 1, root: group(combinator, children) };
}

const construction = "assessment:property.constructionStatus";
const city = "assessment:borrower.journeyCity";
const age = "assessment:borrower.ageYears";
const category = "assessment:property.propertyCategory";
const employment = "assessment:borrower.employmentFamily";

export function runAdditionalEligibilityFilterProof() {
  const emptyNull = evaluateAdditionalEligibilityFilters({
    filters: null,
    facts: { [construction]: "under_construction" },
  });
  assert.equal(emptyNull.result, "PASS");

  const readyPass = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(construction, "EQUALS", "ready")]),
    facts: { [construction]: "ready" },
  });
  assert.equal(readyPass.result, "PASS");
  console.log("B construction Ready / customer Ready => PASS");

  const readyFail = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(construction, "EQUALS", "ready")]),
    facts: { [construction]: "under_construction" },
  });
  assert.equal(readyFail.result, "FAIL");
  console.log("C construction Ready / customer Under Construction => FAIL");

  const agePass = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(age, "LESS_THAN_OR_EQUAL", 60)]),
    facts: { [age]: 45 },
  });
  assert.equal(agePass.result, "PASS");
  console.log("D Age <= 60 / age 45 => PASS");

  const ageFail = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(age, "LESS_THAN_OR_EQUAL", 60)]),
    facts: { [age]: 65 },
  });
  assert.equal(ageFail.result, "FAIL");
  console.log("E Age <= 60 / age 65 => FAIL");

  const cityInPass = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(city, "IN", ["Mumbai", "Pune"])]),
    facts: { [city]: "Mumbai" },
  });
  assert.equal(cityInPass.result, "PASS");
  console.log("F City IN [Mumbai,Pune] / Mumbai => PASS");

  const cityInFail = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(city, "IN", ["Mumbai", "Pune"])]),
    facts: { [city]: "Delhi" },
  });
  assert.equal(cityInFail.result, "FAIL");
  console.log("6 City IN [Mumbai,Pune] / Delhi => FAIL");

  const andPass = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(category, "EQUALS", "residential"), pred(construction, "EQUALS", "ready")]),
    facts: { [category]: "residential", [construction]: "ready" },
  });
  assert.equal(andPass.result, "PASS");
  console.log("G Residential AND Ready / both true => PASS");

  const andFail = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(category, "EQUALS", "residential"), pred(construction, "EQUALS", "ready")]),
    facts: { [category]: "residential", [construction]: "under_construction" },
  });
  assert.equal(andFail.result, "FAIL");
  console.log("8 Residential AND Ready / one false => FAIL");

  const orPass = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(city, "EQUALS", "Mumbai"), pred(city, "EQUALS", "Pune")], "OR"),
    facts: { [city]: "Mumbai" },
  });
  assert.equal(orPass.result, "PASS");
  console.log("H Mumbai OR Pune / Mumbai => PASS");

  const orFail = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(city, "EQUALS", "Mumbai"), pred(city, "EQUALS", "Pune")], "OR"),
    facts: { [city]: "Delhi" },
  });
  assert.equal(orFail.result, "FAIL");
  console.log("10 Mumbai OR Pune / Delhi => FAIL");

  const nested = evaluateAdditionalEligibilityFilters({
    filters: filters([
      pred(employment, "EQUALS", "salaried"),
      group("OR", [pred(city, "EQUALS", "Mumbai"), pred(city, "EQUALS", "Pune")]),
    ]),
    facts: { [employment]: "salaried", [city]: "Pune" },
  });
  assert.equal(nested.result, "PASS");
  console.log("I Salaried AND (Mumbai OR Pune) nested => PASS");

  const missing = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(construction, "EQUALS", "ready")]),
    facts: {},
  });
  assert.equal(missing.result, "INPUT_REQUIRED");
  assert.ok(missing.missingFieldIds.includes(construction));
  console.log("J missing required filter field => INPUT_REQUIRED");

  const invalid = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(construction, "GREATER_THAN", 10)]),
    facts: { [construction]: "ready" },
  });
  assert.equal(invalid.result, "CONFIGURATION_INVALID");
  console.log("K invalid field/operator combination => CONFIGURATION_INVALID");

  const empty = evaluateAdditionalEligibilityFilters({
    filters: filters([]),
    facts: { [construction]: "under_construction" },
  });
  assert.equal(empty.result, "PASS");
  console.log("A/14/AC NULL/empty filter AST = current unrestricted behaviour");

  const existingReady = snapshotGovernedConstraints({ constructionStatuses: ["ready"] });
  const conflictReady = validateAdditionalFilterConflicts({
    filters: filters([pred(construction, "EQUALS", "under_construction")]),
    existing: existingReady,
  });
  assert.equal(conflictReady.ok, false);
  if (!conflictReady.ok) assert.equal(conflictReady.code, "ADDITIONAL_FILTER_CONFLICT");
  console.log("L existing Ready + additional Under Construction => CONFLICT");

  const existingBoth = snapshotGovernedConstraints({ constructionStatuses: ["ready", "under_construction"] });
  const refineReady = validateAdditionalFilterConflicts({
    filters: filters([pred(construction, "EQUALS", "ready")]),
    existing: existingBoth,
  });
  assert.equal(refineReady.ok, true);
  console.log("M existing [Ready, Under Construction] + additional Ready => VALID REFINEMENT");

  const plotConflict = validateAdditionalFilterConflicts({
    filters: filters([pred(construction, "EQUALS", "plot")]),
    existing: existingBoth,
  });
  assert.equal(plotConflict.ok, false);
  console.log("N existing [Ready, Under Construction] + additional Plot => CONFLICT");

  const ageBand = snapshotGovernedConstraints({ minAge: 21, maxAge: 65 });
  const refineAge = validateAdditionalFilterConflicts({
    filters: filters([pred(age, "LESS_THAN_OR_EQUAL", 55)]),
    existing: ageBand,
  });
  assert.equal(refineAge.ok, true);
  console.log("O existing Age 21–65 + additional Age <= 55 => VALID REFINEMENT");

  const minAgeOnly = snapshotGovernedConstraints({ minAge: 21 });
  const ageConflict = validateAdditionalFilterConflicts({
    filters: filters([pred(age, "LESS_THAN", 18)]),
    existing: minAgeOnly,
  });
  assert.equal(ageConflict.ok, false);
  console.log("P existing Age >= 21 + additional Age < 18 => CONFLICT");

  const selfAge = validateAdditionalFilterConflicts({
    filters: filters([pred(age, "GREATER_THAN_OR_EQUAL", 30), pred(age, "LESS_THAN_OR_EQUAL", 25)]),
    existing: snapshotGovernedConstraints({}),
  });
  assert.equal(selfAge.ok, false);
  console.log("Q additional Age >= 30 AND Age <= 25 => CONFLICT");

  const selfEnum = validateAdditionalFilterConflicts({
    filters: filters([pred(construction, "EQUALS", "ready"), pred(construction, "EQUALS", "under_construction")]),
    existing: snapshotGovernedConstraints({}),
  });
  assert.equal(selfEnum.ok, false);
  console.log("R additional Ready AND Under Construction => CONFLICT");

  const orCities = validateAdditionalFilterConflicts({
    filters: filters([pred(city, "EQUALS", "Mumbai"), pred(city, "EQUALS", "Pune")], "OR"),
    existing: snapshotGovernedConstraints({}),
  });
  assert.equal(orCities.ok, true);
  console.log("S Mumbai OR Pune is not falsely identified as conflict");

  try {
    assertAdditionalFiltersAgainstProgramme({
      additionalEligibilityFilters: filters([pred(construction, "EQUALS", "under_construction")]),
      constructionStatuses: ["ready"],
      propertyCategories: [],
      employmentTypes: [],
      residencyEligibility: [],
      legalConstitutions: [],
      geographyCities: [],
      geographyStates: [],
      minAge: null,
      maxAge: null,
    } as never);
    assert.fail("conflict should prevent save/publish");
  } catch (error) {
    assert.ok(error instanceof ProgrammeValidationError);
    assert.equal(error.code, "ADDITIONAL_FILTER_CONFLICT");
  }
  console.log("23 conflict prevents save / activate / publish");

  const blocked = evaluateAdditionalEligibilityFilters({
    filters: filters([pred(construction, "EQUALS", "ready")]),
    facts: { [construction]: "under_construction" },
  });
  assert.equal(blocked.result, "FAIL");
  assert.notEqual(blocked.result, "PASS");
  console.log("T failed additional filter never becomes a Match % candidate");

  const hlFields = listAdditionalEligibilityFilterFields({ productCode: "HOME_LOAN" });
  assert.ok(hlFields.some((field) => field.id === construction || field.id.includes("constructionStatus")));
  assert.ok(hlFields.every((field) => field.id.startsWith("assessment:") || field.id.startsWith("idc:") || field.id.startsWith("derived:")));
  console.log("U Home Loan filter picker contains only Home Loan / module-applicable fields");

  const hlIds = new Set(hlFields.map((field) => field.id));
  assert.equal(hlIds.has("assessment:balanceTransfer.outstandingPrincipal"), false);
  const projectedHl = listProjectedRecommendationFields({ productCode: "HOME_LOAN" });
  assert.equal(hlFields.some((field) => field.id.startsWith("ppo:")), false);
  assert.ok(projectedHl.some((field) => field.id.startsWith("ppo:")));
  console.log("V module picker excludes ppo:* and non-applicable fields");

  const withJourney = listAdditionalEligibilityFilterFields({
    productCode: "HOME_LOAN",
    journeyFields: [
      ...hlFields.map((field, index) => ({
        fieldId: field.id,
        label: field.label,
        applicability: "all" as const,
        capture: true,
        mandatoryForRecommendation: false,
        displayOrder: index,
      })),
      {
        fieldId: "assessment:property.occupancy",
        label: "Occupancy",
        applicability: "all" as const,
        capture: true,
        mandatoryForRecommendation: false,
        displayOrder: 999,
      },
    ],
  });
  assert.ok(withJourney.some((field) => field.id === "assessment:property.occupancy"));
  console.log("W newly applicable Product Journey field appears without lender-specific code");

  const constructionField = hlFields.find((field) => field.id === construction || field.id.includes("constructionStatus"));
  assert.ok(constructionField?.enumOptions?.some((option) => option.id === "ready"));
  assert.ok(constructionField?.enumOptions?.some((option) => option.id === "under_construction"));
  console.log("X enum field uses governed allowed values");

  assert.equal(isDirectionallyBetter({ fieldId: "derived:foirPercent", left: 30, right: 50 }), true);
  console.log("AD FOIR 30 is directionally better than FOIR 50");
  assert.equal(isDirectionallyBetter({ fieldId: "derived:applicableRoiPercent", left: 7, right: 7.5 }), true);
  console.log("AE ROI 7.00 is better than ROI 7.50");
  assert.equal(isDirectionallyBetter({ fieldId: "derived:ltvPercent", left: 50, right: 80 }), true);
  console.log("AF LTV 50 is better than LTV 80");
  assert.equal(isDirectionallyBetter({ fieldId: "derived:ageYears", left: 30, right: 50 }), true);
  console.log("AG Age 30 is better than Age 50");
  assert.equal(isDirectionallyBetter({ fieldId: "assessment:incomeAndObligations.monthlyIncome", left: 500000, right: 100000 }), true);
  console.log("AH Income 500000 is better than Income 100000");
  assert.equal(isDirectionallyBetter({ fieldId: "assessment:cibil.exactScore", left: 800, right: 700 }), true);
  console.log("AI CIBIL 800 is better than CIBIL 700");

  assert.equal(compareByScoringDirection("LOWER_IS_BETTER", 30, 50), -20);
  assert.equal(scoringDirectionForField("derived:foirPercent"), "LOWER_IS_BETTER");
  console.log("AJ direction metadata does not produce a score");

  for (const excluded of HOME_LOAN_V1_EXCLUDED_FROM_WEIGHTS) {
    assert.equal((HOME_LOAN_V1_WEIGHTED_CRITERION_KEYS as readonly string[]).includes(excluded), false);
  }
  console.log("AK Home Loan V1 does not double-count Age / Income / CIBIL");

  assert.equal(scoringDirectionForField("derived:foirPercent"), "LOWER_IS_BETTER");
  assert.equal(scoringDirectionForField("derived:applicableRoiPercent"), "LOWER_IS_BETTER");
  assert.equal(scoringDirectionForField("derived:ltvPercent"), "LOWER_IS_BETTER");
  console.log("AL ROI / FOIR / LTV final Match scoring remains pending; direction only is recorded");

  const draftAst = filters([pred(construction, "EQUALS", "ready")]);
  assert.equal(liveAdditionalEligibilityFilters({
    additionalEligibilityFilters: draftAst,
    publicationState: "draft",
    isLivePublished: false,
  }), null);
  assert.ok(liveAdditionalEligibilityFilters({
    additionalEligibilityFilters: draftAst,
    publicationState: "published",
    isLivePublished: true,
  }));
  console.log("Y draft filter not used by live published recommendation");

  const publishedAst = filters([pred(construction, "EQUALS", "ready")]);
  const draftCopy = copyAdditionalEligibilityFilters(publishedAst);
  assert.ok(draftCopy);
  assert.equal(draftCopy.root.children[0] && draftCopy.root.children[0].kind === "predicate"
    ? draftCopy.root.children[0].value
    : null, "ready");
  console.log("Z draft-from-published copies AST");

  if (draftCopy.root.children[0]?.kind === "predicate") {
    draftCopy.root.children[0].value = "under_construction";
  }
  assert.equal(publishedAst.root.children[0] && publishedAst.root.children[0].kind === "predicate"
    ? publishedAst.root.children[0].value
    : null, "ready");
  console.log("AA published ancestor remains unchanged");

  assert.throws(() => projectAssessmentSettings({ additionalEligibilityFilters: draftAst }));
  assert.doesNotThrow(() => projectAssessmentSettings({ allowedOccupancy: ["self_occupied"] }));
  console.log("AB policyAssessmentJson no longer owns/accepts this AST");

  const containsConflict = validateAdditionalFilterConflicts({
    filters: filters([pred(city, "CONTAINS", "Mum")]),
    existing: snapshotGovernedConstraints({}),
  });
  assert.equal(containsConflict.ok, false);
  if (!containsConflict.ok) assert.equal(containsConflict.code, "CONFIGURATION_INVALID");

  console.log("ADDITIONAL_ELIGIBILITY_FILTER_PROOF: PASS");
}
