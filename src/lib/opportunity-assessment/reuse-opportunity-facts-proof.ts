import assert from "node:assert/strict";
import { formatAssessmentIncompleteGuidance } from "@/constants/opportunity-assessment-recommendation";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { ROUTES } from "@/constants/routes";
import {
  captureKnownValue,
  declareKnownZeroObligations,
  emptyCapturedAssessmentFacts,
  setCapturedCibilKind,
  setCapturedProduct,
} from "@/lib/opportunity-assessment/capture-facts";
import { applyMissingOnlyOpportunityReuse } from "@/lib/opportunity-assessment/reuse-opportunity-facts";
import { MemoryOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/memory-repository";
import {
  collectOpportunityAssessmentMissingLabels,
  createOpportunityAssessmentService,
  getOpportunityAssessmentCapture,
  getOpportunityAssessmentRecommendation,
  saveOpportunityAssessmentCapture,
} from "@server/services/opportunity-assessment";
import type { OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { OpportunityAssessmentActorContext } from "@server/services/opportunity-assessment/types";

const ACTOR: OpportunityAssessmentActorContext = {
  organizationId: "org-1",
  actorUserId: "user-1",
  channel: "C1",
};

const OPP_125_SOURCES = {
  opportunityId: "cmue2rn1a000f54e4obt5hk0f",
  productCode: "HOME-LOAN",
  requestedAmount: 5000000,
  employmentTypeCode: "salaried",
  approxCibilScore: "750_799",
  cityLabel: "Mumbai",
  stateLabel: "Maharashtra",
  btAmount: 1800000,
  contactId: "cmue2r8s9000d54e447leitsx",
  dateOfBirth: null as string | null,
  statedIncomeMonthly: "180000",
  statedObligations: "25000",
  statedPropertyValue: "9000000",
  statedPropertyType: "apartment",
  statedPropertyLocation: "Andheri",
};

function harness() {
  const repository = new MemoryOpportunityAssessmentRepository();
  const service = createOpportunityAssessmentService({ repository });
  return { repository, service };
}

function completeSalariedFacts(): OpportunityAssessmentFactsV1 {
  let facts = emptyCapturedAssessmentFacts();
  facts = captureKnownValue(facts, "borrower", "residency", "resident");
  facts = captureKnownValue(facts, "borrower", "dateOfBirth", "1990-01-01");
  facts = captureKnownValue(facts, "borrower", "employmentFamily", "salaried");
  facts = captureKnownValue(facts, "incomeAndObligations", "monthlyIncome", "200000.00");
  facts = declareKnownZeroObligations(facts);
  facts = captureKnownValue(facts, "incomeAndObligations", "requestedTenureMonths", 240);
  facts = setCapturedProduct(facts, "HOME_LOAN");
  facts = captureKnownValue(facts, "loanRequirement", "requestedAmount", "2500000.00");
  facts = captureKnownValue(facts, "property", "propertyValue", "8000000.00");
  facts = captureKnownValue(facts, "property", "propertyCategory", "residential");
  facts = captureKnownValue(facts, "property", "constructionStatus", "ready");
  facts = captureKnownValue(facts, "property", "propertyCity", "Pune");
  facts = setCapturedCibilKind(facts, "explicitly_unknown");
  return facts;
}

export async function runOpportunityAssessmentReuseProof() {
  const empty = emptyCapturedAssessmentFacts();
  const overlaid = applyMissingOnlyOpportunityReuse(empty, OPP_125_SOURCES);

  assert.equal(overlaid.loanRequirement.productCode.value, "HOME_LOAN");
  assert.equal(overlaid.loanRequirement.requestedAmount.value, "5000000.00");
  assert.equal(overlaid.borrower.employmentFamily.value, "salaried");
  assert.equal(overlaid.borrower.employmentTypeCode.value, "salaried");
  assert.equal(overlaid.cibil.kind.value, "expected_band");
  assert.equal(overlaid.cibil.expectedBand.value, "750_799");
  assert.equal(overlaid.cibil.exactScore.state, "missing");
  assert.equal(overlaid.cibil.exactScore.value, null);
  assert.equal(overlaid.borrower.dateOfBirth.state, "missing");
  assert.equal(overlaid.borrower.journeyCity.value, "Mumbai");
  assert.equal(overlaid.borrower.journeyState.value, "Maharashtra");
  assert.equal(overlaid.property.propertyCity.state, "missing");
  assert.equal(overlaid.property.propertyState.state, "missing");
  assert.equal(overlaid.balanceTransfer.outstandingPrincipal.state, "missing");
  assert.equal(overlaid.incomeAndObligations.monthlyIncome.state, "missing");
  assert.equal(overlaid.incomeAndObligations.existingMonthlyObligations.state, "missing");
  assert.equal(overlaid.property.propertyValue.state, "missing");
  assert.equal(overlaid.loanRequirement.transactionType.state, "missing");
  console.log("SAFE_REUSE: PASS");
  console.log("BROWSER_LOCAL_VALUES_IGNORED: PASS");

  const missing = collectOpportunityAssessmentMissingLabels(overlaid);
  assert.deepEqual(missing.sort(), [
    "Existing Monthly Obligations",
    "Monthly Income",
    "Property Value",
    "Requested Tenure",
  ].sort());
  assert.equal(missing.includes("Date of birth"), false);
  assert.equal(missing.includes("Residency"), false);
  assert.equal(missing.includes("Property category"), false);
  assert.equal(formatAssessmentIncompleteGuidance(missing.length), "Assessment incomplete — 4 required details missing");
  console.log("MISSING_COUNT: PASS");

  const knownProduct = setCapturedProduct(emptyCapturedAssessmentFacts(), "HOME_LOAN");
  const notOverwritten = applyMissingOnlyOpportunityReuse(knownProduct, {
    ...OPP_125_SOURCES,
    productCode: "HOME_LOAN_BT",
  });
  assert.equal(notOverwritten.loanRequirement.productCode.value, "HOME_LOAN");

  const knownAmount = captureKnownValue(emptyCapturedAssessmentFacts(), "loanRequirement", "requestedAmount", "2500000.00");
  const amountKept = applyMissingOnlyOpportunityReuse(knownAmount, OPP_125_SOURCES);
  assert.equal(amountKept.loanRequirement.requestedAmount.value, "2500000.00");

  const unknownCibil = setCapturedCibilKind(emptyCapturedAssessmentFacts(), "explicitly_unknown");
  const unknownKept = applyMissingOnlyOpportunityReuse(unknownCibil, OPP_125_SOURCES);
  assert.equal(unknownKept.cibil.kind.value, "explicitly_unknown");
  assert.equal(unknownKept.cibil.expectedBand.state, "missing");

  let unconfirmed = emptyCapturedAssessmentFacts();
  unconfirmed.loanRequirement.requestedAmount.state = "unconfirmed";
  unconfirmed.loanRequirement.requestedAmount.value = "100.00";
  const unconfirmedKept = applyMissingOnlyOpportunityReuse(unconfirmed, OPP_125_SOURCES);
  assert.equal(unconfirmedKept.loanRequirement.requestedAmount.state, "unconfirmed");
  assert.equal(unconfirmedKept.loanRequirement.requestedAmount.value, "100.00");

  let conflicting = emptyCapturedAssessmentFacts();
  conflicting.loanRequirement.productCode.state = "conflicting";
  conflicting.loanRequirement.productCode.value = "HOME_LOAN";
  const conflictingKept = applyMissingOnlyOpportunityReuse(conflicting, OPP_125_SOURCES);
  assert.equal(conflictingKept.loanRequirement.productCode.state, "conflicting");
  console.log("MISSING_ONLY_NO_OVERWRITE: PASS");

  const withDob = applyMissingOnlyOpportunityReuse(emptyCapturedAssessmentFacts(), {
    ...OPP_125_SOURCES,
    dateOfBirth: "1988-04-12T00:00:00.000Z",
  });
  assert.equal(withDob.borrower.dateOfBirth.value, "1988-04-12");
  assert.equal(withDob.borrower.dateOfBirth.sourceChannel, "CONTACT");

  const bt = applyMissingOnlyOpportunityReuse(emptyCapturedAssessmentFacts(), {
    ...OPP_125_SOURCES,
    productCode: "home-loan-balance-transfer",
    btAmount: 1800000,
  });
  assert.equal(bt.loanRequirement.productCode.value, "HOME_LOAN_BT");
  assert.equal(bt.loanRequirement.transactionType.value, "balance_transfer");
  assert.equal(bt.balanceTransfer.outstandingPrincipal.value, "1800000.00");

  const invalidCibil = applyMissingOnlyOpportunityReuse(emptyCapturedAssessmentFacts(), {
    ...OPP_125_SOURCES,
    approxCibilScore: "about_780",
  });
  assert.equal(invalidCibil.cibil.kind.state, "missing");
  assert.equal(invalidCibil.cibil.exactScore.state, "missing");

  const unknownEmployment = applyMissingOnlyOpportunityReuse(emptyCapturedAssessmentFacts(), {
    ...OPP_125_SOURCES,
    employmentTypeCode: "other",
  });
  assert.equal(unknownEmployment.borrower.employmentFamily.state, "missing");

  const finalized = applyMissingOnlyOpportunityReuse(completeSalariedFacts(), OPP_125_SOURCES, {
    revisionKind: "FINALIZED",
  });
  assert.equal(finalized.loanRequirement.productCode.value, "HOME_LOAN");
  assert.equal(finalized.loanRequirement.requestedAmount.value, "2500000.00");
  assert.equal(finalized.cibil.kind.value, "explicitly_unknown");
  assert.equal(finalized.property.propertyCity.value, "Pune");
  console.log("FINALIZED_IMMUTABILITY: PASS");

  {
    const { service } = harness();
    const overlayGet = await getOpportunityAssessmentCapture(
      service,
      ACTOR,
      "opp-125",
      undefined,
      OPP_125_SOURCES,
    );
    assert.equal(overlayGet.body.data?.facts.loanRequirement.productCode.value, "HOME_LOAN");
    assert.equal(overlayGet.body.data?.currentRevisionKind, null);
    const stored = await getOpportunityAssessmentCapture(service, ACTOR, "opp-125");
    assert.equal(stored.body.data?.facts.loanRequirement.productCode.state, "missing");
    assert.equal(stored.body.data?.facts.loanRequirement.requestedAmount.state, "missing");
    const recommendation = await getOpportunityAssessmentRecommendation(
      service,
      ACTOR,
      "opp-125",
      {},
      {},
      OPP_125_SOURCES,
    );
    assert.equal(recommendation.body.data?.executionAllowed, false);
    assert.equal(recommendation.body.data?.recommendationExecuted, false);
    assert.equal(recommendation.body.data?.recommendationRunCreated, false);
    assert.equal(recommendation.body.data?.missingLabels?.length, 4);
    assert.equal(
      recommendation.body.data?.guidance,
      "Assessment incomplete — 4 required details missing",
    );
    console.log("GET_OVERLAY_NOT_PERSISTED: PASS");
    console.log("AUTO_FINALIZE: NO");
    console.log("NEW_RECOMMENDATION_RUN: NO");
  }

  {
    const { service } = harness();
    const created = await getOpportunityAssessmentCapture(service, ACTOR, "opp-final");
    const saved = await saveOpportunityAssessmentCapture(service, ACTOR, "opp-final", {
      kind: "FINALIZED",
      expectedRowVersion: created.body.data!.rowVersion,
      commandId: "cmd-final-reuse",
      facts: completeSalariedFacts(),
    });
    assert.equal(saved.body.data?.currentRevisionKind, "FINALIZED");
    const overlaidFinal = await getOpportunityAssessmentCapture(
      service,
      ACTOR,
      "opp-final",
      undefined,
      OPP_125_SOURCES,
    );
    assert.equal(overlaidFinal.body.data?.facts.loanRequirement.requestedAmount.value, "2500000.00");
    assert.equal(overlaidFinal.body.data?.facts.cibil.kind.value, "explicitly_unknown");
    assert.equal(overlaidFinal.body.data?.currentRevisionKind, "FINALIZED");
  }

  const href = buildJourneyHref(ROUTES.OPPORTUNITY_WORKSPACE, {
    opportunityId: "cmue2rn1a000f54e4obt5hk0f",
    tab: "opportunity_assessment",
  });
  assert.match(href, /\/opportunities/);
  assert.match(href, /opportunityId=cmue2rn1a000f54e4obt5hk0f/);
  assert.match(href, /tab=opportunity_assessment/);
  console.log("COMPLETE_ASSESSMENT_CTA: PASS");
  console.log("ASSESSMENT_DEEP_LINK: PASS");
}
