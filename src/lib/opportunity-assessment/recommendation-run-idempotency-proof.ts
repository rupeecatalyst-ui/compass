/**
 * Repeated recommendation loads reuse a run only when the finalized revision
 * and the authoritative programme/rule-set identity are unchanged.
 * No database. Historical runs are not rewritten.
 */
import assert from "node:assert/strict";
import { MemoryOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/memory-repository";
import { executeFinalizedAssessmentRecommendation } from "@server/services/opportunity-assessment/execute-recommendation";
import { persistCanonicalAssessmentSnapshot } from "@server/services/opportunity-assessment/persist-canonical-snapshot";
import type { CanonicalAssessmentSources } from "@server/services/opportunity-assessment/canonical-snapshot";
import { createOpportunityAssessmentService } from "@server/services/opportunity-assessment/runtime";
import type { OpportunityAssessmentActorContext } from "@server/services/opportunity-assessment/types";
import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";
import type { ActiveRecommendationRuleSet } from "@/lib/product-recommendation/types";

const ACTOR: OpportunityAssessmentActorContext = {
  organizationId: "org-1",
  actorUserId: "user-1",
  channel: "C1",
};

function sources(): CanonicalAssessmentSources {
  return {
    opportunityId: "opp-idem",
    productCode: "HOME_LOAN",
    transactionType: "fresh",
    employmentTypeCode: "salaried",
    requestedAmount: 10000000,
    requestedTenureMonths: 240,
    monthlyIncomeRupees: 250000,
    existingMonthlyObligationsRupees: 15000,
    propertyValueRupees: 15000000,
    propertyCategory: "residential",
    constructionStatus: "ready",
    residency: "resident",
    cityLabel: "Mumbai",
    stateLabel: "MH",
    borrowerAgeYears: 35,
    borrowerLegalConstitution: "individual",
    dateOfBirth: "1990-01-15",
    contactId: "contact-1",
    approxCibilScore: "750_799",
    rowVersion: 1,
  };
}

function programme(versionNumber: number) {
  return {
    id: "hl-prog",
    versionNumber,
    policyVersionId: "policy-version-1",
    policyVersion: { versionNumber: 1 },
    suspendedByOverride: false,
    lenderId: "lender-1",
  };
}

function ruleSet(versionNumber: number): ActiveRecommendationRuleSet {
  return {
    id: "rule-1",
    organizationId: "org-1",
    productCode: "HOME_LOAN",
    lineageId: "lineage-1",
    versionNumber,
    labelledUnapproved: false,
    simulationOnly: false,
    lifecycleStatus: "active",
    weights: { selected: { proofEqual: 100 }, total: 100 },
  };
}

function readyResult(): CanonicalLenderRecommendationResult {
  return {
    status: "ready",
    product: "HOME_LOAN",
    readOnly: true,
    recommendations: [],
    rejectedProgrammes: [],
    retrievedProgrammeCount: 1,
    evaluatedProgrammeCount: 1,
    versions: { lenderScoreVersion: null } as CanonicalLenderRecommendationResult["versions"],
    analyzedAt: "2026-10-01T10:00:00.000Z",
  };
}

export async function runRecommendationRunIdempotencyProof() {
  const repository = new MemoryOpportunityAssessmentRepository();
  const service = createOpportunityAssessmentService({ repository });
  const persisted = await persistCanonicalAssessmentSnapshot(service, ACTOR, sources());
  assert.equal(persisted.evaluation.panel, "complete");

  let clock = new Date("2026-10-01T10:00:00.000Z");
  let programmeVersion = 1;
  let ruleVersion = 1;
  const dependencies = {
    now: () => clock,
    loadInventory: async () => ({
      programmes: [programme(programmeVersion)],
      lenderCategories: new Map([["lender-1", "A" as const]]),
    }),
    resolveActiveRuleSet: async () => ruleSet(ruleVersion),
    recommend: async () => readyResult(),
  };

  const first = await executeFinalizedAssessmentRecommendation(
    service,
    ACTOR,
    { opportunityId: "opp-idem", assessmentId: persisted.assessmentId },
    dependencies,
  );
  assert.equal(first.recommendationRunCreated, true);
  assert.equal(first.resultStatus, "ready");
  const firstRun = await repository.getRun(ACTOR.organizationId, first.runId!);
  const firstHash = firstRun.requestHash;
  const firstAssessedAt = firstRun.assessedAt;

  clock = new Date("2026-10-01T10:00:00.500Z");
  const repeat = await executeFinalizedAssessmentRecommendation(
    service,
    ACTOR,
    { opportunityId: "opp-idem", assessmentId: persisted.assessmentId },
    dependencies,
  );
  assert.equal(repeat.recommendationRunCreated, false);
  assert.equal(repeat.runId, first.runId);
  assert.equal((await repository.listRuns(ACTOR.organizationId, persisted.assessmentId)).length, 1);

  clock = new Date("2026-10-02T10:00:00.000Z");
  const nextDay = await executeFinalizedAssessmentRecommendation(
    service,
    ACTOR,
    { opportunityId: "opp-idem", assessmentId: persisted.assessmentId },
    dependencies,
  );
  assert.equal(nextDay.recommendationRunCreated, true);
  assert.notEqual(nextDay.runId, first.runId);

  programmeVersion = 2;
  const changedProgramme = await executeFinalizedAssessmentRecommendation(
    service,
    ACTOR,
    { opportunityId: "opp-idem", assessmentId: persisted.assessmentId },
    dependencies,
  );
  assert.equal(changedProgramme.recommendationRunCreated, true);
  assert.notEqual(changedProgramme.runId, nextDay.runId);

  ruleVersion = 2;
  const changedRule = await executeFinalizedAssessmentRecommendation(
    service,
    ACTOR,
    { opportunityId: "opp-idem", assessmentId: persisted.assessmentId },
    dependencies,
  );
  assert.equal(changedRule.recommendationRunCreated, true);
  assert.notEqual(changedRule.runId, changedProgramme.runId);
  assert.equal((await repository.listRuns(ACTOR.organizationId, persisted.assessmentId)).length, 4);

  const preserved = await repository.getRun(ACTOR.organizationId, first.runId!);
  assert.equal(preserved.id, first.runId);
  assert.equal(preserved.requestHash, firstHash);
  assert.equal(preserved.assessedAt, firstAssessedAt);
  assert.equal(preserved.resultStatus, "ready");

  const isolated = new MemoryOpportunityAssessmentRepository();
  const isolatedService = createOpportunityAssessmentService({ repository: isolated });
  const isolatedPersisted = await persistCanonicalAssessmentSnapshot(
    isolatedService,
    ACTOR,
    { ...sources(), opportunityId: "opp-idem-unavailable" },
  );
  const unavailable = {
    now: () => new Date("2026-10-01T11:00:00.000Z"),
    loadInventory: async () => {
      throw new Error("inventory unavailable");
    },
    recommend: async () => readyResult(),
  };
  const missed = await executeFinalizedAssessmentRecommendation(
    isolatedService,
    ACTOR,
    { opportunityId: "opp-idem-unavailable", assessmentId: isolatedPersisted.assessmentId },
    unavailable,
  );
  clock = new Date("2026-10-01T11:00:01.000Z");
  const missedAgain = await executeFinalizedAssessmentRecommendation(
    isolatedService,
    ACTOR,
    { opportunityId: "opp-idem-unavailable", assessmentId: isolatedPersisted.assessmentId },
    { ...unavailable, now: () => new Date("2026-10-01T11:00:01.000Z") },
  );
  assert.equal(missed.recommendationRunCreated, true);
  assert.equal(missedAgain.recommendationRunCreated, true);
  assert.notEqual(missedAgain.runId, missed.runId);
}
