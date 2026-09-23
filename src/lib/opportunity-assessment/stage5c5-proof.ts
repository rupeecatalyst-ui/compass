import assert from "node:assert/strict";
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
import {
  projectChanakyaLifeRecommendationColumn,
  projectChanakyaOpportunityRecommendationPanel,
} from "@/lib/opportunity-assessment/recommendation-presentation";
import { MemoryOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/memory-repository";
import { isCanonicalProgrammeAvailable } from "@server/services/lender-recommendation/programme-availability";
import { createCriterionEvaluatorRegistry } from "@/lib/product-recommendation";
import {
  createOpportunityAssessmentService,
  executeOpportunityAssessmentRecommendation,
  getOpportunityAssessmentCapture,
  getOpportunityAssessmentRecommendation,
  mapFinalizedAssessmentFactsToCanonical,
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
const AS_OF = "2026-09-22T16:30:00.000Z";
const FINGERPRINT = buildOpportunityAssessmentSourceFingerprint({ opportunityRowVersion: 3 });

function programme(id = "base", product = "HOME_LOAN", patch: Record<string, unknown> = {}) {
  return {
    id, organizationId: "org-1", lenderId: `lender-${id}`, productCode: product, code: id, label: id,
    versionNumber: 1, transactionTypes: product === "HOME_LOAN" ? null : ["balance_transfer"],
    policyVersionId: `version-${id}`, policyVersion: {
      id: `version-${id}`, organizationId: "org-1", policyId: `policy-${id}`, versionNumber: 1,
      status: "published", eligibilityRules: {}, creditRules: {}, effectiveFrom: null, effectiveUntil: null,
      policy: { id: `policy-${id}`, organizationId: "org-1", lenderId: `lender-${id}`, productCode: product,
        status: "published", currentPublishedVersionId: `version-${id}`, isDeleted: false },
    },
    lender: { displayName: `Configured ${id}`, label: id, code: id, organizationId: "org-1", enabled: true,
      isDeleted: false, lifecycleStatus: "active", operationalStatus: "active", effectiveFrom: null, effectiveUntil: null },
    isDeleted: false, enabled: true, isLivePublished: true, publicationState: "published", completenessState: "complete",
    lifecycleStatus: "active", status: "active", approvalStatus: "approved", effectiveFrom: null, effectiveUntil: null,
    residencyEligibility: ["resident"], minIncomeExact: "30000", maxIncomeExact: null,
    minLoanAmountExact: "100000", maxLoanAmountExact: "10000000", minFoirExact: null, maxFoirExact: "60",
    minDbrExact: null as string | null, maxDbrExact: null as string | null, minRoiExact: "8.5", maxRoiExact: "9",
    minLtvExact: null, maxLtvExact: "80",
    minCibil: 750, maxCibil: 900, minAge: 21, maxAge: 65, minTenureMonths: 60, maxTenureMonths: 240,
    requiredDocumentTypeIds: null as string[] | null,
    requiredSeasoningMonths: product === "HOME_LOAN_BT" ? 12 : null,
    repaymentCleanRequired: product === "HOME_LOAN_BT" ? true : null,
    maxDelayedEmis: product === "HOME_LOAN_BT" ? 2 : null,
    ...patch,
  };
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
  facts = captureKnownValue(facts, "loanRequirement", "requestedAmount", "1500000.00");
  facts = captureKnownValue(facts, "balanceTransfer", "outstandingPrincipal", "1800000.00");
  facts = captureKnownValue(facts, "balanceTransfer", "outstandingCertainty", "exact");
  facts = captureKnownValue(facts, "balanceTransfer", "currentRoiPercent", "8.50");
  facts = captureKnownValue(facts, "balanceTransfer", "currentRoiCertainty", "exact");
  facts = captureKnownValue(facts, "balanceTransfer", "currentHomeLoanEmi", "22000.00");
  facts = captureKnownValue(facts, "balanceTransfer", "currentHomeLoanEmiCertainty", "exact");
  facts = captureKnownValue(facts, "balanceTransfer", "remainingTenureMonths", 180);
  facts = captureKnownValue(facts, "balanceTransfer", "remainingTenureCertainty", "exact");
  facts = captureKnownValue(facts, "balanceTransfer", "loanStartDate", "2020-01-15");
  facts = captureKnownValue(facts, "balanceTransfer", "loanStartDateCertainty", "exact");
  facts = captureKnownValue(facts, "balanceTransfer", "repaymentTrack", "yes");
  facts = captureKnownValue(facts, "balanceTransfer", "delayedEmiCount", 0);
  return facts;
}

function proofScoring(organizationId = "org-1", productCode = "HOME_LOAN") {
  return {
    resolveActiveRuleSet: async () => ({
      id: "proof-rule",
      organizationId,
      productCode,
      lineageId: "proof-lineage",
      versionNumber: 1,
      labelledUnapproved: false,
      simulationOnly: false,
      lifecycleStatus: "active",
      weights: { selected: { proofEqual: 100 }, total: 100 },
    }),
    criterionRegistry: createCriterionEvaluatorRegistry({
      proofEqual: ({ weightPercent }) => ({
        criterionKey: "proofEqual",
        status: "scored" as const,
        criterionScore: 100,
        weightPercent,
        weightedContribution: 100,
      }),
    }),
  };
}

function harness(rows: ReturnType<typeof programme>[] = [programme("z-first"), programme("a-second")]) {
  const repository = new MemoryOpportunityAssessmentRepository();
  const service = createOpportunityAssessmentService({ repository });
  const asOf = new Date(AS_OF);
  const dependencies = {
    loadInventory: async (query: { organizationId: string; product: "HOME_LOAN" | "HOME_LOAN_BT"; asOf: Date }) => ({
      programmes: rows.filter((row) => isCanonicalProgrammeAvailable({
        programme: row,
        organizationId: query.organizationId,
        product: query.product,
        asOf: query.asOf,
      })),
      lenderCategories: new Map(rows.map((row) => [row.lenderId, "A" as const])),
    }),
    now: () => asOf,
    ...proofScoring(),
  };
  return { repository, service, dependencies, rows };
}

async function capture(
  service: ReturnType<typeof harness>["service"],
  opportunityId: string,
  facts: OpportunityAssessmentFactsV1,
  kind: "SAVED" | "FINALIZED",
  commandId: string,
) {
  const created = await getOpportunityAssessmentCapture(service, ACTOR, opportunityId);
  return saveOpportunityAssessmentCapture(service, ACTOR, opportunityId, {
    kind,
    expectedRowVersion: created.body.data!.rowVersion,
    commandId,
    facts,
    sourceFingerprint: FINGERPRINT,
    organizationId: "org-from-browser",
  });
}

async function execute(
  service: ReturnType<typeof harness>["service"],
  dependencies: ReturnType<typeof harness>["dependencies"],
  opportunityId: string,
  body: Record<string, unknown> = {},
  actor = ACTOR,
) {
  return executeOpportunityAssessmentRecommendation(service, actor, opportunityId, {
    asOf: AS_OF,
    ...body,
  }, dependencies);
}

function assertNoFabrication(dto: { result?: { recommendations?: Array<{ lenderScore: null | number; programmeId: string }> } | null }) {
  const cards = dto.result?.recommendations ?? [];
  assert.ok(cards.every((card) => card.lenderScore === null));
  assert.doesNotMatch(JSON.stringify(dto), /"stars"|confidence %|"score":\s*88/);
}

export async function runStage5c5Proof() {
  {
    const { service, dependencies } = harness();
    const saved = await capture(service, "opp-hl", salariedHomeLoanFacts(), "FINALIZED", "cmd-hl-final");
    assert.equal(saved.body.data?.currentRevisionKind, "FINALIZED");
    const before = saved.body.data!.facts;
    const ran = await execute(service, dependencies, "opp-hl", { requestId: "req-hl-1" });
    assert.equal(ran.status, 200);
    assert.equal(ran.body.data?.executionAllowed, true);
    assert.equal(ran.body.data?.recommendationExecuted, true);
    assert.equal(ran.body.data?.recommendationRunCreated, true);
    assert.equal(ran.body.data?.resultStatus, "ready");
    assert.equal(ran.body.data?.revisionId, saved.body.data && (await getOpportunityAssessmentRecommendation(service, ACTOR, "opp-hl", {}, dependencies)).body.data?.revisionId);
    assert.ok((ran.body.data?.result?.recommendations.length ?? 0) >= 2);
    assert.deepEqual(ran.body.data?.result?.recommendations.map((row) => row.programmeId), ["a-second", "z-first"]);
    assert.equal(ran.body.data?.runId, "req-hl-1");
    const mapped = mapFinalizedAssessmentFactsToCanonical(before);
    assert.equal(mapped.product, "HOME_LOAN");
    assert.equal(mapped.customer.journeyKind, "home_loan");
    assert.equal(mapped.customer.residency, "resident");
    assert.equal(mapped.customer.cibilBand, 780);
    assert.equal(mapped.customer.monthlyIncomeRupees, 200000);
    assert.equal(mapped.customer.existingMonthlyEmiRupees, 0);
    assert.equal(mapped.customer.customerSelectedTenureMonths, 240);
    assert.equal(mapped.customer.propertyValueRupees, 8000000);
    assert.equal(mapped.customer.city, "Mumbai");
    assert.notEqual(mapped.customer.city, before.borrower.journeyCity.value);
    assert.equal(mapped.customer.currentOutstandingRupees, null);
    assert.equal(mapped.customer.coApplicant, null);
    const opportunityView = projectChanakyaOpportunityRecommendationPanel(ran.body.data!);
    const lifeView = projectChanakyaLifeRecommendationColumn(ran.body.data!);
    assert.equal(opportunityView.ready, true);
    assert.equal(opportunityView.assessmentNotReady, false);
    assert.deepEqual(opportunityView.programmeIds, lifeView.programmeIds);
    assert.ok(opportunityView.lenderScores.every((score) => score === null));
    assertNoFabrication(ran.body.data!);
    console.log("1 COMPLETE_FINALIZED_SALARIED_HL: PASS");
    console.log("2 RUN_PERSISTED: PASS");
    console.log("3 OPPORTUNITY_PANEL_CONTRACT: PASS");
    console.log("4 LIFE_PANEL_CONTRACT: PASS");
    console.log("13 EXACT_CIBIL: PASS");
    console.log("17 REQUESTED_TENURE: PASS");
    console.log("18 PROPERTY_VALUE: PASS");
    console.log("19 PROPERTY_CITY_NOT_JOURNEY_CITY: PASS");
    console.log("31 CANONICAL_ORDERING: PASS");
    console.log("32 LENDER_SCORE_NULL: PASS");
    console.log("33 NO_SCORE_CONFIDENCE_STARS: PASS");
    console.log("34 RUN_REFERENCES_REVISION: PASS");
  }

  {
    const { service, dependencies } = harness();
    await capture(service, "opp-saved", salariedHomeLoanFacts(), "SAVED", "cmd-saved");
    const ran = await execute(service, dependencies, "opp-saved");
    assert.equal(ran.body.data?.executionAllowed, false);
    assert.equal(ran.body.data?.failureCode, "ASSESSMENT_NOT_FINALIZED");
    assert.equal(ran.body.data?.recommendationRunCreated, false);
    console.log("5 SAVED_CANNOT_EXECUTE: PASS");
  }

  {
    const { service, dependencies } = harness();
    const incomplete = salariedHomeLoanFacts();
    incomplete.incomeAndObligations.monthlyIncome.value = null;
    incomplete.incomeAndObligations.monthlyIncome.state = "missing";
    await capture(service, "opp-inc", incomplete, "SAVED", "cmd-inc");
    const mapped = mapFinalizedAssessmentFactsToCanonical(incomplete);
    assert.equal(mapped.customer.monthlyIncomeRupees, null);
    const ran = await execute(service, dependencies, "opp-inc");
    assert.equal(ran.body.data?.failureCode, "ASSESSMENT_INCOMPLETE");
    console.log("6 INCOMPLETE_CANNOT_EXECUTE: PASS");
    console.log("11 MISSING_INCOME_NOT_ZERO: PASS");
  }

  {
    const { service, dependencies } = harness();
    const facts = salariedHomeLoanFacts();
    facts.borrower.residency.state = "conflicting";
    facts.borrower.residency.conflictCandidates = [{ value: "resident", sourceChannel: "C1" }, { value: "nri", sourceChannel: "COMPASS" }];
    await capture(service, "opp-conf", facts, "SAVED", "cmd-conf");
    const ran = await execute(service, dependencies, "opp-conf");
    assert.equal(ran.body.data?.failureCode, "ASSESSMENT_CONFLICTING");
    console.log("7 CONFLICTED_CANNOT_EXECUTE: PASS");
  }

  {
    const { service, dependencies } = harness();
    let facts = setCapturedEmploymentFamily(salariedHomeLoanFacts(), "self_employed");
    facts = captureKnownValue(facts, "selfEmployedEvidence", "turnover", "5000000.00");
    await capture(service, "opp-unsup", facts, "SAVED", "cmd-unsup");
    const ran = await execute(service, dependencies, "opp-unsup");
    assert.equal(ran.body.data?.failureCode, "ASSESSMENT_UNSUPPORTED");
    console.log("8 UNSUPPORTED_CANNOT_EXECUTE: PASS");
    console.log("9 SELF_EMPLOYED_FAIL_CLOSED: PASS");
  }

  {
    const { service, dependencies } = harness();
    const facts = salariedHomeLoanFacts();
    facts.borrower.residency = { ...facts.borrower.residency, value: null, state: "missing", sourceChannel: null };
    await capture(service, "opp-res", facts, "SAVED", "cmd-res");
    const ran = await execute(service, dependencies, "opp-res");
    assert.equal(ran.body.data?.failureCode, "ASSESSMENT_INCOMPLETE");
    console.log("10 MISSING_RESIDENCY_CANNOT_EXECUTE: PASS");
  }

  {
    const mapped = mapFinalizedAssessmentFactsToCanonical(salariedHomeLoanFacts());
    assert.equal(mapped.customer.existingMonthlyEmiRupees, 0);
    console.log("12 ZERO_OBLIGATIONS_PRESERVED: PASS");
  }

  {
    const band = mapFinalizedAssessmentFactsToCanonical(setCapturedCibilBand(salariedHomeLoanFacts(), "700_749"));
    assert.equal(band.customer.cibilBand, "700_749");
    const unknown = mapFinalizedAssessmentFactsToCanonical(setCapturedCibilKind(salariedHomeLoanFacts(), "explicitly_unknown"));
    assert.equal(unknown.customer.cibilBand, "not_known");
    const missing = mapFinalizedAssessmentFactsToCanonical(setCapturedCibilKind(salariedHomeLoanFacts(), "missing"));
    assert.equal(missing.customer.cibilBand, null);
    assert.notEqual(missing.customer.cibilBand, "not_known");
    console.log("14 EXPECTED_CIBIL_BAND: PASS");
    console.log("15 NOT_KNOWN_CIBIL: PASS");
  }

  {
    const { service, dependencies } = harness();
    await capture(service, "opp-low-cibil", setCapturedCibilExact(salariedHomeLoanFacts(), 740), "FINALIZED", "cmd-low-cibil");
    const ran = await execute(service, dependencies, "opp-low-cibil");
    assert.equal(ran.body.data?.resultStatus, "no_eligible_programmes");
    assert.equal(projectChanakyaOpportunityRecommendationPanel(ran.body.data!).noEligibleLender, true);
    console.log("16 BELOW_THRESHOLD_CIBIL: PASS");
  }

  {
    const rows = [programme("hl-only"), programme("bt-only", "HOME_LOAN_BT")];
    const { service, dependencies } = harness(rows);
    await capture(service, "opp-bt", homeLoanBtFacts(), "FINALIZED", "cmd-bt");
    const ran = await execute(service, dependencies, "opp-bt", { requestId: "req-bt" });
    const mapped = mapFinalizedAssessmentFactsToCanonical(homeLoanBtFacts());
    assert.equal(mapped.product, "HOME_LOAN_BT");
    assert.equal(mapped.customer.journeyKind, "home_loan_balance_transfer");
    assert.equal(mapped.customer.currentOutstandingRupees, 1800000);
    assert.equal(mapped.customer.requiredAmountRupees, 1500000);
    assert.notEqual(mapped.customer.currentOutstandingRupees, mapped.customer.requiredAmountRupees);
    assert.equal(mapped.customer.currentHomeLoanEmiRupees, 22000);
    assert.equal(mapped.customer.existingMonthlyEmiRupees, 0);
    assert.notEqual(mapped.customer.currentHomeLoanEmiRupees, mapped.customer.existingMonthlyEmiRupees);
    assert.equal(mapped.customer.loanStartDate, "2020-01-15");
    assert.equal(mapped.customer.repaymentTrack, "yes");
    assert.equal(mapped.customer.delayedEmiCount, 0);
    assert.deepEqual(ran.body.data?.result?.recommendations.map((row) => row.programmeId), ["bt-only"]);
    assert.equal(ran.body.data?.result?.product, "HOME_LOAN_BT");
    console.log("20 HLBT_EXECUTES_CORRECT_PRODUCT: PASS");
    console.log("21 BT_OUTSTANDING_NOT_REQUESTED: PASS");
    console.log("22 BT_EMI_NOT_OBLIGATIONS: PASS");
    console.log("23 BT_SEASONING_REPAYMENT_DELAYED: PASS");
  }

  {
    const facts = captureKnownValue(salariedHomeLoanFacts(), "coApplicant", "participantRef", "participant-1");
    const mapped = mapFinalizedAssessmentFactsToCanonical(facts);
    assert.equal(mapped.customer.coApplicant, null);
    assert.notEqual(mapped.customer.coApplicantDecision, "yes");
    const decided = mapFinalizedAssessmentFactsToCanonical(setCapturedContribution(facts, "not_decided"));
    assert.equal(decided.customer.coApplicantDecision, "not_decided");
    assert.equal(decided.customer.coApplicant, null);
    console.log("24 PARTICIPANT_NOT_CONTRIBUTOR: PASS");
    console.log("25 CO_APPLICANT_CONTRIBUTION: PASS");
  }

  {
    const leftover = captureKnownValue(salariedHomeLoanFacts(), "balanceTransfer", "outstandingPrincipal", "1800000.00");
    leftover.loanRequirement.transactionType.value = "fresh";
    leftover.loanRequirement.transactionType.state = "known";
    leftover.loanRequirement.transactionType.sourceChannel = "C1";
    leftover.loanRequirement.transactionType.sourceEntityType = "t";
    leftover.loanRequirement.transactionType.sourceEntityId = "t";
    leftover.loanRequirement.transactionType.sourceFieldKey = "loanRequirement.transactionType";
    assert.throws(() => mapFinalizedAssessmentFactsToCanonical(leftover), (error: unknown) => {
      assert.equal(error instanceof OpportunityAssessmentError, true);
      return true;
    });
    const hl = mapFinalizedAssessmentFactsToCanonical(salariedHomeLoanFacts());
    assert.equal(hl.product, "HOME_LOAN");
    assert.equal(hl.customer.currentOutstandingRupees, null);
    assert.notEqual(hl.customer.journeyKind, "home_loan_balance_transfer_topup");
    console.log("26 HL_HLBT_ISOLATION: PASS");
    console.log("27 NO_FRESH_BT_TOPUP: PASS");
  }

  {
    const rows = [programme("z-first"), programme("a-second"), ...Array.from({ length: 12 }, (_, i) => programme(`configured-${i}`))];
    const { service, dependencies } = harness(rows);
    await capture(service, "opp-many", salariedHomeLoanFacts(), "FINALIZED", "cmd-many");
    const ran = await execute(service, dependencies, "opp-many");
    assert.equal(ran.body.data?.result?.recommendations.length, 14);
    console.log("28 ADDITIONAL_CONFIGURED_LENDERS: PASS");
  }

  {
    const expired = programme("expired", "HOME_LOAN", { effectiveUntil: new Date("2020-01-01T00:00:00.000Z"), isLivePublished: true });
    const unpublished = programme("draft", "HOME_LOAN", { publicationState: "draft", isLivePublished: false });
    const { service, dependencies } = harness([expired, unpublished]);
    await capture(service, "opp-dead", salariedHomeLoanFacts(), "FINALIZED", "cmd-dead");
    const ran = await execute(service, dependencies, "opp-dead");
    assert.equal(ran.body.data?.resultStatus, "no_eligible_programmes");
    console.log("29 INACTIVE_UNPUBLISHED_EXPIRED: PASS");
  }

  {
    const overridden = programme("override", "HOME_LOAN", { suspendedByOverride: true });
    const { service, dependencies } = harness([overridden]);
    await capture(service, "opp-ov", salariedHomeLoanFacts(), "FINALIZED", "cmd-ov");
    const ran = await execute(service, dependencies, "opp-ov");
    assert.equal(ran.body.data?.result?.recommendations.length ?? 0, 0);
    console.log("30 LENDER_AVAILABILITY_OVERRIDE: PASS");
  }

  {
    const { service, dependencies, repository } = harness();
    await capture(service, "opp-term", salariedHomeLoanFacts(), "FINALIZED", "cmd-term");
    const first = await execute(service, dependencies, "opp-term", { requestId: "req-term" });
    await assert.rejects(
      () => service.completeRecommendationRun(ACTOR, {
        requestId: "req-term",
        requestHash: first.body.data!.requestHash!,
        resultStatus: "failed",
        failureCode: "RUN_FAILED",
      }),
      (error: unknown) => {
        assert.equal((error as OpportunityAssessmentError).code, "RUN_ALREADY_TERMINAL");
        return true;
      },
    );
    const retry = await execute(service, dependencies, "opp-term", { requestId: "req-term-2" });
    assert.notEqual(retry.body.data?.runId, first.body.data?.runId);
    assert.equal(retry.body.data?.requestHash, first.body.data?.requestHash);
    const replay = await execute(service, dependencies, "opp-term", { requestId: "req-term" });
    assert.equal(replay.body.data?.runId, "req-term");
    assert.equal(replay.body.data?.recommendationRunCreated, false);
    const otherFacts = setCapturedCibilExact(salariedHomeLoanFacts(), 800);
    const current = await getOpportunityAssessmentCapture(service, ACTOR, "opp-term");
    await saveOpportunityAssessmentCapture(service, ACTOR, "opp-term", {
      kind: "FINALIZED",
      expectedRowVersion: current.body.data!.rowVersion,
      commandId: "cmd-term-2",
      facts: otherFacts,
      sourceFingerprint: FINGERPRINT,
    });
    const next = await execute(service, dependencies, "opp-term", { requestId: "req-term-3" });
    assert.notEqual(next.body.data?.requestHash, first.body.data?.requestHash);
    assert.notEqual(next.body.data?.revisionId, first.body.data?.revisionId);
    const stored = await repository.getRevision(ACTOR.organizationId, first.body.data!.revisionId!);
    assert.equal(stored.factsJson.cibil.exactScore.value, 780);
    console.log("35 TERMINAL_RUN_IMMUTABLE: PASS");
    console.log("36 RETRY_NEW_RUN: PASS");
    console.log("37 REQUEST_HASH_DETERMINISTIC: PASS");
    console.log("38 DIFFERENT_REVISION_NOT_REUSED: PASS");
  }

  {
    const { service } = harness();
    await capture(service, "opp-err", salariedHomeLoanFacts(), "FINALIZED", "cmd-err");
    const ran = await executeOpportunityAssessmentRecommendation(service, ACTOR, "opp-err", {
      asOf: AS_OF,
      requestId: "req-err",
    }, {
      recommend: async () => {
        throw new Error("ECONN prisma password DATABASE_URL token");
      },
    });
    assert.equal(ran.body.data?.resultStatus, "failed");
    assert.equal(ran.body.data?.failureCode, "RUN_FAILED");
    assert.doesNotMatch(JSON.stringify(ran.body), /ECONN|password|DATABASE_URL|prisma/);
    console.log("39 RAW_ERROR_NOT_EXPOSED: PASS");
  }

  {
    const { service, dependencies } = harness();
    const created = await capture(service, "opp-tenant", salariedHomeLoanFacts(), "FINALIZED", "cmd-tenant");
    const other = await executeOpportunityAssessmentRecommendation(
      service,
      { ...ACTOR, organizationId: "org-other" },
      "opp-tenant",
      { assessmentId: created.body.data!.assessmentId, asOf: AS_OF },
      dependencies,
    );
    assert.equal(other.status, 403);
    assert.equal(other.body.error?.code, "CROSS_ORGANIZATION_ACCESS");
    console.log("40 CROSS_TENANT_REJECTED: PASS");
  }

  {
    const { service, dependencies, repository } = harness();
    const finalized = await capture(service, "opp-stale", salariedHomeLoanFacts(), "FINALIZED", "cmd-stale");
    const revisionId = (await repository.listRevisions(ACTOR.organizationId, finalized.body.data!.assessmentId)).at(-1)!.id;
    const contentHash = (await repository.getRevision(ACTOR.organizationId, revisionId)).contentHash;
    const stale = await execute(service, dependencies, "opp-stale", {
      currentSourceFingerprint: buildOpportunityAssessmentSourceFingerprint({ opportunityRowVersion: 9 }),
    });
    assert.equal(stale.body.data?.failureCode, "ASSESSMENT_STALE");
    assert.equal(stale.body.data?.recommendationRunCreated, false);
    const after = await repository.getRevision(ACTOR.organizationId, revisionId);
    assert.equal(after.contentHash, contentHash);
    assert.equal(after.revisionKind, "FINALIZED");
    const ok = await execute(service, dependencies, "opp-stale", { requestId: "req-stale-ok" });
    assert.equal(ok.body.data?.recommendationExecuted, true);
    const unchanged = await repository.getRevision(ACTOR.organizationId, revisionId);
    assert.equal(unchanged.contentHash, contentHash);
    console.log("41 STALE_FAIL_CLOSED: PASS");
    console.log("42 EXECUTION_DOES_NOT_MUTATE_REVISION: PASS");
  }

  {
    const hyphen = programme("alias-home-loan");
    hyphen.policyVersion.policy.productCode = "HOME-LOAN";
    hyphen.maxDbrExact = "65";
    hyphen.requiredDocumentTypeIds = ["doc:pan"];
    const { service, dependencies } = harness([hyphen]);
    await capture(service, "opp-alias", salariedHomeLoanFacts(), "FINALIZED", "cmd-alias");
    const ran = await execute(service, dependencies, "opp-alias", { requestId: "req-alias" });
    assert.equal(ran.status, 200);
    assert.equal(ran.body.data?.resultStatus, "ready");
    assert.ok((ran.body.data?.result?.recommendations.length ?? 0) >= 1);
    assert.notEqual(ran.body.data?.result?.rejectedProgrammes[0]?.reason, "POLICY_PRODUCT_MISMATCH");
    assert.notEqual(ran.body.data?.result?.rejectedProgrammes[0]?.reason, "UNSUPPORTED_GOVERNED_RULE");
    assert.notEqual(ran.body.data?.result?.rejectedProgrammes[0]?.reason, "PROGRAMME_CONFIGURATION_INVALID");
    assert.ok(ran.body.data?.result?.recommendations.every((card) => card.lenderScore === null));
    assertNoFabrication(ran.body.data!);
    const lap = programme("genuine-mismatch");
    lap.policyVersion.policy.productCode = "LAP";
    const mismatchHarness = harness([lap]);
    await capture(mismatchHarness.service, "opp-mismatch", salariedHomeLoanFacts(), "FINALIZED", "cmd-mismatch");
    const mismatched = await execute(mismatchHarness.service, mismatchHarness.dependencies, "opp-mismatch", { requestId: "req-mismatch" });
    assert.equal(mismatched.body.data?.result?.rejectedProgrammes[0]?.reason, "POLICY_PRODUCT_MISMATCH");
    console.log("43 PRODUCT_ALIAS_WITH_DBR_AND_LOD_REACHES_EVALUATION: PASS");
    console.log("44 GENUINE_PRODUCT_MISMATCH_PRESERVED: PASS");
  }

  {
    try {
      createOpportunityAssessmentService({ prismaClient: {} });
      throw new assert.AssertionError({ message: "expected persistence failure" });
    } catch (error) {
      assert.equal((error as OpportunityAssessmentError).code, "ASSESSMENT_PERSISTENCE_FAILURE");
    }
  }
}
