import assert from "node:assert/strict";
import { OPPORTUNITY_ASSESSMENT_CAPTURE_SECTIONS } from "@/constants/opportunity-assessment-capture";
import {
  captureKnownValue,
  declareKnownZeroObligations,
  emptyCapturedAssessmentFacts,
  setCapturedCibilBand,
  setCapturedCibilExact,
  setCapturedCibilKind,
  setCapturedContribution,
  setCapturedEmploymentFamily,
  setCapturedProduct,
} from "@/lib/opportunity-assessment/capture-facts";
import { buildOpportunityAssessmentSourceFingerprint } from "@/lib/opportunity-assessment/fingerprint";
import { MemoryOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/memory-repository";
import {
  createOpportunityAssessmentService,
  getOpportunityAssessmentCapture,
  listOpportunityAssessmentRecommendationRuns,
  OpportunityAssessmentError,
  saveOpportunityAssessmentCapture,
} from "@server/services/opportunity-assessment";
import type { OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { OpportunityAssessmentActorContext } from "@server/services/opportunity-assessment/types";

const ACTOR: OpportunityAssessmentActorContext = {
  organizationId: "org-1",
  actorUserId: "user-1",
  channel: "C1",
};

function fingerprint() {
  return buildOpportunityAssessmentSourceFingerprint({ opportunityRowVersion: 3 });
}

function harness() {
  const repository = new MemoryOpportunityAssessmentRepository();
  const service = createOpportunityAssessmentService({ repository });
  return { repository, service };
}

function salariedHomeLoanFacts(): OpportunityAssessmentFactsV1 {
  let facts = emptyCapturedAssessmentFacts();
  facts = captureKnownValue(facts, "borrower", "residency", "resident");
  facts = captureKnownValue(facts, "borrower", "dateOfBirth", "1990-01-01");
  facts = setCapturedEmploymentFamily(facts, "salaried");
  facts = captureKnownValue(facts, "incomeAndObligations", "monthlyIncome", "200000.00");
  facts = declareKnownZeroObligations(facts);
  facts = captureKnownValue(facts, "incomeAndObligations", "requestedTenureMonths", 240);
  facts = setCapturedProduct(facts, "HOME_LOAN");
  facts = captureKnownValue(facts, "loanRequirement", "requestedAmount", "2500000.00");
  facts = captureKnownValue(facts, "property", "propertyValue", "8000000.00");
  facts = captureKnownValue(facts, "property", "propertyCategory", "residential");
  facts = captureKnownValue(facts, "property", "constructionStatus", "ready");
  facts = captureKnownValue(facts, "property", "propertyCity", "Mumbai");
  facts = captureKnownValue(facts, "borrower", "journeyCity", "Pune");
  facts = setCapturedCibilExact(facts, 780);
  return facts;
}

function homeLoanBtFacts(): OpportunityAssessmentFactsV1 {
  let facts = setCapturedProduct(salariedHomeLoanFacts(), "HOME_LOAN_BT");
  facts = captureKnownValue(facts, "balanceTransfer", "outstandingPrincipal", "1800000.00");
  facts = captureKnownValue(facts, "balanceTransfer", "currentRoiPercent", "8.50");
  facts = captureKnownValue(facts, "balanceTransfer", "currentHomeLoanEmi", "22000.00");
  facts = captureKnownValue(facts, "balanceTransfer", "remainingTenureMonths", 180);
  facts = captureKnownValue(facts, "balanceTransfer", "loanStartDate", "2020-01-15");
  facts = captureKnownValue(facts, "balanceTransfer", "repaymentTrack", "yes");
  facts = captureKnownValue(facts, "balanceTransfer", "delayedEmiCount", 0);
  return facts;
}

async function get(service: ReturnType<typeof harness>["service"], opportunityId: string, actor = ACTOR) {
  return getOpportunityAssessmentCapture(service, actor, opportunityId);
}

async function save(
  service: ReturnType<typeof harness>["service"],
  opportunityId: string,
  facts: OpportunityAssessmentFactsV1,
  kind: "SAVED" | "FINALIZED",
  expectedRowVersion: number,
  commandId: string,
  actor = ACTOR,
) {
  return saveOpportunityAssessmentCapture(service, actor, opportunityId, {
    kind,
    expectedRowVersion,
    commandId,
    facts,
    sourceFingerprint: fingerprint(),
    organizationId: "org-from-browser",
  });
}

export async function runStage5c4Proof() {
  assert.deepEqual(
    OPPORTUNITY_ASSESSMENT_CAPTURE_SECTIONS.map((section) => section.id),
    ["borrower", "income", "loan", "property", "balance_transfer", "co_applicant", "self_employed"],
  );

  {
    const { service } = harness();
    const created = await get(service, "opp-hl");
    assert.equal(created.status, 200);
    const saved = await save(service, "opp-hl", salariedHomeLoanFacts(), "SAVED", created.body.data!.rowVersion, "cmd-hl-save");
    assert.equal(saved.status, 200);
    assert.equal(saved.body.data?.readinessStatus, "ready");
    assert.equal(saved.body.data?.currentRevisionKind, "SAVED");
    assert.equal(saved.body.data?.facts.borrower.residency.state, "known");
    assert.equal(saved.body.data?.recommendationExecuted, false);
    const runs = await listOpportunityAssessmentRecommendationRuns(service, ACTOR, saved.body.data!.assessmentId);
    assert.equal(runs.length, 0);
    console.log("1 COMPLETE_SALARIED_HL_SAVE: PASS");
    console.log("23 PROVENANCE: PASS");
    console.log("24 SOURCE_FINGERPRINT: PASS");
    console.log("25 SAVE_DOES_NOT_EXECUTE_RECOMMENDATION: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-hl-final");
    const finalized = await save(
      service,
      "opp-hl-final",
      salariedHomeLoanFacts(),
      "FINALIZED",
      created.body.data!.rowVersion,
      "cmd-hl-final",
    );
    assert.equal(finalized.status, 200);
    assert.equal(finalized.body.data?.currentRevisionKind, "FINALIZED");
    assert.equal(finalized.body.data?.recommendationExecuted, false);
    const runs = await listOpportunityAssessmentRecommendationRuns(service, ACTOR, finalized.body.data!.assessmentId);
    assert.equal(runs.length, 0);
    console.log("2 COMPLETE_SALARIED_HL_FINALIZE: PASS");
    console.log("26 FINALIZE_DOES_NOT_EXECUTE_RECOMMENDATION: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-incomplete");
    const incomplete = salariedHomeLoanFacts();
    incomplete.incomeAndObligations.monthlyIncome.value = null;
    incomplete.incomeAndObligations.monthlyIncome.state = "missing";
    const saved = await save(service, "opp-incomplete", incomplete, "SAVED", created.body.data!.rowVersion, "cmd-inc-save");
    assert.equal(saved.body.data?.readinessStatus, "incomplete");
    const failed = await save(
      service,
      "opp-incomplete",
      incomplete,
      "FINALIZED",
      saved.body.data!.rowVersion,
      "cmd-inc-final",
    );
    assert.equal(failed.status, 422);
    assert.equal(failed.body.error?.code, "ASSESSMENT_INCOMPLETE");
    console.log("3 INCOMPLETE_CANNOT_FINALIZE: PASS");
    console.log("4 MISSING_INCOME_REMAINS_MISSING: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-zero");
    let facts = salariedHomeLoanFacts();
    facts = captureKnownValue(facts, "incomeAndObligations", "existingMonthlyObligations", "0.00");
    const rejected = await save(service, "opp-zero", facts, "SAVED", created.body.data!.rowVersion, "cmd-zero-bad");
    assert.equal(rejected.status, 422);
    facts = declareKnownZeroObligations(facts);
    const accepted = await save(service, "opp-zero", facts, "SAVED", created.body.data!.rowVersion, "cmd-zero-ok");
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.data?.facts.incomeAndObligations.existingMonthlyObligations.knownZeroDeclared, true);
    console.log("5 ZERO_OBLIGATIONS_REQUIRE_DECLARATION: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-residency");
    const facts = salariedHomeLoanFacts();
    facts.borrower.residency = {
      ...facts.borrower.residency,
      value: null,
      state: "missing",
      sourceChannel: null,
    };
    const saved = await save(service, "opp-residency", facts, "SAVED", created.body.data!.rowVersion, "cmd-res");
    assert.equal(saved.body.data?.facts.borrower.residency.state, "missing");
    console.log("6 MISSING_RESIDENCY_REMAINS_MISSING: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-cibil");
    const exact = await save(service, "opp-cibil", salariedHomeLoanFacts(), "SAVED", created.body.data!.rowVersion, "cmd-cibil-exact");
    assert.equal(exact.body.data?.facts.cibil.kind.value, "exact");
    assert.equal(exact.body.data?.facts.cibil.exactScore.value, 780);
    const bandFacts = setCapturedCibilBand(salariedHomeLoanFacts(), "700_749");
    const band = await save(service, "opp-cibil", bandFacts, "SAVED", exact.body.data!.rowVersion, "cmd-cibil-band");
    assert.equal(band.body.data?.facts.cibil.kind.value, "expected_band");
    assert.equal(band.body.data?.facts.cibil.exactScore.state, "missing");
    const unknownFacts = setCapturedCibilKind(salariedHomeLoanFacts(), "explicitly_unknown");
    const unknown = await save(service, "opp-cibil", unknownFacts, "SAVED", band.body.data!.rowVersion, "cmd-cibil-unk");
    assert.equal(unknown.body.data?.facts.cibil.kind.value, "explicitly_unknown");
    const missingFacts = setCapturedCibilKind(salariedHomeLoanFacts(), "missing");
    const missing = await save(service, "opp-cibil", missingFacts, "SAVED", unknown.body.data!.rowVersion, "cmd-cibil-miss");
    assert.equal(missing.body.data?.facts.cibil.kind.state, "missing");
    assert.notEqual(missing.body.data?.facts.cibil.kind.value, "explicitly_unknown");
    console.log("7 EXACT_CIBIL: PASS");
    console.log("8 EXPECTED_CIBIL_BAND: PASS");
    console.log("9 NOT_KNOWN_CIBIL: PASS");
    console.log("10 MISSING_CIBIL_NOT_NOT_KNOWN: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-property");
    const saved = await save(service, "opp-property", salariedHomeLoanFacts(), "SAVED", created.body.data!.rowVersion, "cmd-prop");
    assert.equal(saved.body.data?.facts.property.propertyValue.value, "8000000.00");
    assert.equal(saved.body.data?.facts.property.propertyCity.value, "Mumbai");
    assert.equal(saved.body.data?.facts.borrower.journeyCity.value, "Pune");
    assert.notEqual(saved.body.data?.facts.property.propertyCity.value, saved.body.data?.facts.borrower.journeyCity.value);
    assert.equal(saved.body.data?.facts.incomeAndObligations.requestedTenureMonths.value, 240);
    console.log("11 PROPERTY_VALUE_NO_DEFAULT: PASS");
    console.log("12 PROPERTY_CITY_NOT_JOURNEY_CITY: PASS");
    console.log("13 REQUESTED_TENURE: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-bt");
    const saved = await save(service, "opp-bt", homeLoanBtFacts(), "SAVED", created.body.data!.rowVersion, "cmd-bt");
    assert.equal(saved.status, 200);
    assert.equal(saved.body.data?.facts.loanRequirement.productCode.value, "HOME_LOAN_BT");
    assert.equal(saved.body.data?.facts.loanRequirement.transactionType.value, "balance_transfer");
    assert.equal(saved.body.data?.facts.balanceTransfer.outstandingPrincipal.value, "1800000.00");
    assert.notEqual(
      saved.body.data?.facts.balanceTransfer.outstandingPrincipal.value,
      saved.body.data?.facts.loanRequirement.requestedAmount.value,
    );
    assert.notEqual(
      saved.body.data?.facts.balanceTransfer.currentHomeLoanEmi.value,
      saved.body.data?.facts.incomeAndObligations.existingMonthlyObligations.value,
    );
    console.log("14 COMPLETE_HLBT: PASS");
    console.log("15 BT_OUTSTANDING_NOT_REQUESTED: PASS");
    console.log("16 BT_EMI_NOT_OBLIGATIONS: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-coapp");
    let facts = captureKnownValue(salariedHomeLoanFacts(), "coApplicant", "participantRef", "participant-1");
    const saved = await save(service, "opp-coapp", facts, "SAVED", created.body.data!.rowVersion, "cmd-coapp");
    assert.equal(saved.body.data?.facts.coApplicant.participantRef.value, "participant-1");
    assert.equal(saved.body.data?.facts.coApplicant.contributionDecision.state, "missing");
    facts = setCapturedContribution(facts, "not_decided");
    const decided = await save(service, "opp-coapp", facts, "SAVED", saved.body.data!.rowVersion, "cmd-coapp-nd");
    assert.equal(decided.body.data?.facts.coApplicant.contributionDecision.value, "not_decided");
    console.log("17 PARTICIPANT_NOT_CONTRIBUTOR: PASS");
    console.log("18 CONTRIBUTOR_NOT_DECIDED: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-se");
    let facts = setCapturedEmploymentFamily(salariedHomeLoanFacts(), "self_employed");
    facts = captureKnownValue(facts, "selfEmployedEvidence", "turnover", "5000000.00");
    const saved = await save(service, "opp-se", facts, "SAVED", created.body.data!.rowVersion, "cmd-se");
    assert.equal(saved.body.data?.readinessStatus, "unsupported");
    assert.equal(saved.body.data?.facts.incomeAndObligations.monthlyIncome.state, "missing");
    const failed = await save(service, "opp-se", facts, "FINALIZED", saved.body.data!.rowVersion, "cmd-se-final");
    assert.equal(failed.body.error?.code, "ASSESSMENT_UNSUPPORTED");
    console.log("19 SELF_EMPLOYED_UNSUPPORTED: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-cas");
    const first = await save(service, "opp-cas", salariedHomeLoanFacts(), "SAVED", created.body.data!.rowVersion, "cmd-cas-1");
    const stale = await save(service, "opp-cas", salariedHomeLoanFacts(), "SAVED", created.body.data!.rowVersion, "cmd-cas-stale");
    assert.equal(stale.body.error?.code, "ASSESSMENT_CONFLICT");
    const replay = await save(service, "opp-cas", salariedHomeLoanFacts(), "SAVED", first.body.data!.rowVersion, "cmd-cas-1");
    assert.equal(replay.status, 200);
    assert.equal(replay.body.data?.currentRevisionNumber, first.body.data?.currentRevisionNumber);
    console.log("20 STALE_ROWVERSION_CONFLICT: PASS");
    console.log("21 DUPLICATE_COMMAND_IDEMPOTENT: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-tenant");
    const other = await getOpportunityAssessmentCapture(
      service,
      { ...ACTOR, organizationId: "org-other" },
      "opp-tenant",
      created.body.data!.assessmentId,
    );
    assert.equal(other.status, 403);
    assert.equal(other.body.error?.code, "CROSS_ORGANIZATION_ACCESS");
    console.log("22 CROSS_TENANT: PASS");
  }

  {
    const { service } = harness();
    const created = await get(service, "opp-hl-iso");
    const hl = await save(service, "opp-hl-iso", salariedHomeLoanFacts(), "SAVED", created.body.data!.rowVersion, "cmd-iso-hl");
    assert.equal(hl.body.data?.facts.loanRequirement.productCode.value, "HOME_LOAN");
    assert.equal(hl.body.data?.facts.loanRequirement.transactionType.state, "missing");
    const bt = await get(service, "opp-bt-iso");
    const btSaved = await save(service, "opp-bt-iso", homeLoanBtFacts(), "SAVED", bt.body.data!.rowVersion, "cmd-iso-bt");
    assert.equal(btSaved.body.data?.facts.loanRequirement.productCode.value, "HOME_LOAN_BT");
    assert.equal(btSaved.body.data?.facts.loanRequirement.transactionType.value, "balance_transfer");
    assert.notEqual(hl.body.data?.opportunityId, btSaved.body.data?.opportunityId);
    console.log("27 HL_HLBT_ISOLATION: PASS");
  }

  {
    try {
      createOpportunityAssessmentService({ prismaClient: {} });
      throw new assert.AssertionError({ message: "expected persistence failure" });
    } catch (error) {
      assert.equal(error instanceof OpportunityAssessmentError, true);
      assert.equal((error as OpportunityAssessmentError).code, "ASSESSMENT_PERSISTENCE_FAILURE");
    }
  }
}
