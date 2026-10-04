import assert from "node:assert/strict";
import { cloneAssessmentFact, emptyOpportunityAssessmentFacts } from "@/lib/opportunity-assessment";
import { buildOpportunityAssessmentSourceFingerprint } from "@/lib/opportunity-assessment/fingerprint";
import { MemoryOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/memory-repository";
import {
  hashOpportunityAssessmentCommand,
  hashOpportunityAssessmentRevisionContent,
  OpportunityAssessmentError,
  OpportunityAssessmentService,
} from "@server/services/opportunity-assessment";
import type { AssessmentFact, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { OpportunityAssessmentActorContext } from "@server/services/opportunity-assessment/types";

const CAPTURED_AT = "2026-09-22T13:00:00.000Z";
const ACTOR: OpportunityAssessmentActorContext = {
  organizationId: "org-1",
  actorUserId: "user-1",
  channel: "C1",
};

function knownFact<T>(value: T, field: string, extra: Partial<AssessmentFact<T>> = {}): AssessmentFact<T> {
  return {
    value,
    state: "known",
    sourceChannel: "C1",
    sourceEntityType: "EnterpriseOpportunityAssessment",
    sourceEntityId: "assessment-fixture",
    sourceFieldKey: field,
    sourceUpdatedAt: CAPTURED_AT,
    capturedByUserId: "untrusted-client",
    capturedAt: CAPTURED_AT,
    effectiveAt: CAPTURED_AT,
    confirmedByUserId: null,
    confirmedAt: null,
    certainty: "exact",
    ...extra,
  };
}

function setFact<
  Section extends keyof OpportunityAssessmentFactsV1,
  Key extends keyof OpportunityAssessmentFactsV1[Section],
>(facts: OpportunityAssessmentFactsV1, section: Section, key: Key, patch: Partial<OpportunityAssessmentFactsV1[Section][Key]>) {
  const next = structuredClone(facts);
  const current = next[section][key] as AssessmentFact<unknown>;
  (next[section] as Record<string, unknown>)[key as string] = cloneAssessmentFact(current, patch);
  return next;
}

function readyFacts(): OpportunityAssessmentFactsV1 {
  let facts = emptyOpportunityAssessmentFacts();
  facts = setFact(facts, "borrower", "residency", knownFact("resident", "borrower.residency"));
  facts = setFact(facts, "borrower", "dateOfBirth", knownFact("1990-01-01", "borrower.dateOfBirth"));
  facts = setFact(facts, "borrower", "employmentFamily", knownFact("salaried", "borrower.employmentFamily"));
  facts = setFact(facts, "incomeAndObligations", "monthlyIncome", knownFact("200000.00", "incomeAndObligations.monthlyIncome"));
  facts = setFact(
    facts,
    "incomeAndObligations",
    "existingMonthlyObligations",
    knownFact("0.00", "incomeAndObligations.existingMonthlyObligations", { knownZeroDeclared: true }),
  );
  facts = setFact(facts, "incomeAndObligations", "requestedTenureMonths", knownFact(240, "incomeAndObligations.requestedTenureMonths"));
  facts = setFact(facts, "loanRequirement", "productCode", knownFact("HOME_LOAN", "loanRequirement.productCode"));
  facts = setFact(facts, "loanRequirement", "requestedAmount", knownFact("2500000.00", "loanRequirement.requestedAmount"));
  facts = setFact(facts, "property", "propertyValue", knownFact("8000000.00", "property.propertyValue"));
  facts = setFact(facts, "property", "propertyCategory", knownFact("residential", "property.propertyCategory"));
  facts = setFact(facts, "property", "constructionStatus", knownFact("ready", "property.constructionStatus"));
  facts = setFact(facts, "property", "propertyCity", knownFact("Mumbai", "property.propertyCity"));
  facts = setFact(facts, "cibil", "kind", knownFact("exact", "cibil.kind"));
  facts = setFact(facts, "cibil", "exactScore", knownFact(780, "cibil.exactScore"));
  return facts;
}

async function expectCode(code: string, work: () => Promise<unknown>) {
  try {
    await work();
    throw new assert.AssertionError({ message: `expected ${code}` });
  } catch (error) {
    assert.equal(error instanceof OpportunityAssessmentError, true, String(error));
    assert.equal((error as OpportunityAssessmentError).code, code);
    assert.equal(String((error as Error).message).includes("password"), false);
    assert.equal(String((error as Error).message).includes("ECONN"), false);
  }
}

function harness() {
  const repo = new MemoryOpportunityAssessmentRepository();
  const service = new OpportunityAssessmentService(repo);
  return { repo, service };
}

export async function runStage5c2Proof() {
  const fingerprint = buildOpportunityAssessmentSourceFingerprint({ opportunityRowVersion: 3 });

  {
    const { service } = harness();
    const first = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const second = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const other = await service.getOrCreateAssessment(ACTOR, "opp-2");
    assert.equal(first.id, second.id);
    assert.notEqual(first.id, other.id);
    assert.equal(first.currentRevisionId, null);
    assert.equal(first.rowVersion, 1);
    assert.equal(first.readinessStatus, "incomplete");
    assert.equal(first.draftFactsJson.borrower.residency.state, "missing");
    assert.equal(first.draftFactsJson.incomeAndObligations.monthlyIncome.value, null);
    console.log("1-3 GET_OR_CREATE_ONE_PER_OPPORTUNITY: PASS");
  }

  {
    const { service, repo } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const facts = setFact(emptyOpportunityAssessmentFacts(), "loanRequirement", "requestedAmount", knownFact("2500000.00", "loanRequirement.requestedAmount"));
    const rev1 = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-1",
      commandHash: hashOpportunityAssessmentCommand({ n: 1 }),
      facts,
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    const rev2 = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 2,
      commandId: "cmd-2",
      commandHash: hashOpportunityAssessmentCommand({ n: 2 }),
      facts: setFact(facts, "borrower", "journeyCity", knownFact("Pune", "borrower.journeyCity")),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    assert.equal(rev1.revisionNumber, 1);
    assert.equal(rev2.revisionNumber, 2);
    const original = await repo.getRevision(ACTOR.organizationId, rev1.id);
    assert.equal(original.factsJson.borrower.journeyCity.state, "missing");
    const current = await service.readCurrentAssessment(ACTOR, { assessmentId: created.id, opportunityId: "opp-1" });
    assert.equal(current.currentRevision?.id, rev2.id);
    assert.equal(current.rowVersion, 3);
    console.log("4-8 REVISION_SEQUENCE_AND_CURSOR: PASS");
  }

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    await expectCode("ASSESSMENT_CONFLICT", () =>
      service.saveRevision(ACTOR, {
        assessmentId: created.id,
        opportunityId: "opp-1",
        expectedRowVersion: 99,
        commandId: "cmd-stale",
        commandHash: hashOpportunityAssessmentCommand("stale"),
        facts: emptyOpportunityAssessmentFacts(),
        sourceFingerprint: fingerprint,
        kind: "SAVED",
      }),
    );
    const [left, right] = await Promise.allSettled([
      service.saveRevision(ACTOR, {
        assessmentId: created.id,
        opportunityId: "opp-1",
        expectedRowVersion: 1,
        commandId: "cmd-a",
        commandHash: hashOpportunityAssessmentCommand("a"),
        facts: emptyOpportunityAssessmentFacts(),
        sourceFingerprint: fingerprint,
        kind: "SAVED",
      }),
      service.saveRevision(ACTOR, {
        assessmentId: created.id,
        opportunityId: "opp-1",
        expectedRowVersion: 1,
        commandId: "cmd-b",
        commandHash: hashOpportunityAssessmentCommand("b"),
        facts: emptyOpportunityAssessmentFacts(),
        sourceFingerprint: fingerprint,
        kind: "SAVED",
      }),
    ]);
    const wins = [left, right].filter((row) => row.status === "fulfilled");
    const losses = [left, right].filter((row) => row.status === "rejected");
    assert.equal(wins.length, 1);
    assert.equal(losses.length, 1);
    assert.equal((losses[0] as PromiseRejectedResult).reason.code, "ASSESSMENT_CONFLICT");
    console.log("9-10 OPTIMISTIC_CONCURRENCY: PASS");
  }

  {
    const { service, repo } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const first = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-same",
      commandHash: hashOpportunityAssessmentCommand("same"),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    const replay = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-same",
      commandHash: hashOpportunityAssessmentCommand("same"),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    assert.equal(first.id, replay.id);
    await expectCode("IDEMPOTENCY_CONFLICT", () =>
      service.saveRevision(ACTOR, {
        assessmentId: created.id,
        opportunityId: "opp-1",
        expectedRowVersion: 2,
        commandId: "cmd-same",
        commandHash: hashOpportunityAssessmentCommand("other"),
        facts: emptyOpportunityAssessmentFacts(),
        sourceFingerprint: fingerprint,
        kind: "SAVED",
      }),
    );
    repo.failNextTransactionAfter = "revision-insert";
    await assert.rejects(() =>
      service.saveRevision(ACTOR, {
        assessmentId: created.id,
        opportunityId: "opp-1",
        expectedRowVersion: 2,
        commandId: "cmd-fail",
        commandHash: hashOpportunityAssessmentCommand("fail"),
        facts: emptyOpportunityAssessmentFacts(),
        sourceFingerprint: fingerprint,
        kind: "SAVED",
      }),
    );
    const afterFail = await service.readCurrentAssessment(ACTOR, { assessmentId: created.id, opportunityId: "opp-1" });
    assert.equal(afterFail.currentRevisionNumber, 1);
    assert.equal(afterFail.rowVersion, 2);
    console.log("11-14 IDEMPOTENCY_AND_ATOMICITY: PASS");
  }

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const saved = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-incomplete",
      commandHash: hashOpportunityAssessmentCommand("incomplete"),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    assert.equal(saved.revisionKind, "SAVED");
    assert.equal(saved.normalizedInputJson.normalizedInput, null);
    assert.equal(saved.finalizedAt, null);
    assert.equal(saved.finalizedChannel, null);
    await expectCode("ASSESSMENT_INCOMPLETE", () =>
      service.saveRevision(ACTOR, {
        assessmentId: created.id,
        opportunityId: "opp-1",
        expectedRowVersion: 2,
        commandId: "cmd-final-bad",
        commandHash: hashOpportunityAssessmentCommand("final-bad"),
        facts: emptyOpportunityAssessmentFacts(),
        sourceFingerprint: fingerprint,
        kind: "FINALIZED",
        normalizedInput: { ok: true },
        normalizedInputVersion: "opportunity-assessment-normalized-input.v1",
      }),
    );
    const finalized = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 2,
      commandId: "cmd-final",
      commandHash: hashOpportunityAssessmentCommand("final"),
      facts: readyFacts(),
      sourceFingerprint: fingerprint,
      kind: "FINALIZED",
      normalizedInput: { tenureMonths: 240 },
      normalizedInputVersion: "opportunity-assessment-normalized-input.v1",
    });
    assert.equal(finalized.revisionNumber, 2);
    assert.equal(finalized.revisionKind, "FINALIZED");
    assert.equal(saved.revisionKind, "SAVED");
    assert.ok(finalized.finalizedAt);
    assert.equal(finalized.finalizedChannel, "C1");
    console.log("15-17 SAVE_VS_FINALIZE: PASS");
  }

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-fp",
      commandHash: hashOpportunityAssessmentCommand("fp"),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    const staleRead = await service.readCurrentAssessment(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      currentSourceFingerprint: buildOpportunityAssessmentSourceFingerprint({ opportunityRowVersion: 9 }),
    });
    assert.equal(staleRead.stale, true);
    assert.deepEqual(staleRead.staleReasons, ["opportunityRowVersion"]);
    assert.equal(staleRead.currentRevision?.sourceFingerprintJson.opportunityRowVersion, 3);
    await expectCode("ASSESSMENT_STALE", () =>
      service.saveRevision(ACTOR, {
        assessmentId: created.id,
        opportunityId: "opp-1",
        expectedRowVersion: 2,
        commandId: "cmd-stale-final",
        commandHash: hashOpportunityAssessmentCommand("stale-final"),
        facts: readyFacts(),
        sourceFingerprint: fingerprint,
        currentSourceFingerprint: buildOpportunityAssessmentSourceFingerprint({ opportunityRowVersion: 9 }),
        kind: "FINALIZED",
        normalizedInput: { tenureMonths: 240 },
        normalizedInputVersion: "opportunity-assessment-normalized-input.v1",
      }),
    );
    const afterStale = await service.readCurrentAssessment(ACTOR, { assessmentId: created.id, opportunityId: "opp-1" });
    assert.equal(afterStale.currentRevisionNumber, 1);
    console.log("18-19 STALENESS_DOES_NOT_MUTATE: PASS");
  }

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const missingObligations = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-ob",
      commandHash: hashOpportunityAssessmentCommand("ob"),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    assert.equal(missingObligations.factsJson.incomeAndObligations.existingMonthlyObligations.state, "missing");
    await expectCode("INVALID_ASSESSMENT_FACTS", () =>
      service.saveRevision(ACTOR, {
        assessmentId: created.id,
        opportunityId: "opp-1",
        expectedRowVersion: 2,
        commandId: "cmd-zero",
        commandHash: hashOpportunityAssessmentCommand("zero"),
        facts: setFact(
          emptyOpportunityAssessmentFacts(),
          "incomeAndObligations",
          "existingMonthlyObligations",
          knownFact("0.00", "incomeAndObligations.existingMonthlyObligations"),
        ),
        sourceFingerprint: fingerprint,
        kind: "SAVED",
      }),
    );
    console.log("20-21 MISSING_VS_ZERO: PASS");
  }

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const band = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-cibil",
      commandHash: hashOpportunityAssessmentCommand("cibil"),
      facts: setFact(
        setFact(emptyOpportunityAssessmentFacts(), "cibil", "kind", knownFact("expected_band", "cibil.kind")),
        "cibil",
        "expectedBand",
        knownFact("750_799", "cibil.expectedBand"),
      ),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    assert.equal(band.factsJson.cibil.kind.value, "expected_band");
    assert.equal(band.factsJson.cibil.exactScore.value, null);
    const missing = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 2,
      commandId: "cmd-cibil-missing",
      commandHash: hashOpportunityAssessmentCommand("cibil-missing"),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    assert.equal(missing.factsJson.cibil.kind.state, "missing");
    assert.notEqual(missing.factsJson.cibil.kind.value, "explicitly_unknown");
    console.log("22-23 CIBIL_SEMANTICS: PASS");
  }

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    let facts = setFact(emptyOpportunityAssessmentFacts(), "loanRequirement", "requestedAmount", knownFact("2500000.00", "loanRequirement.requestedAmount"));
    facts = setFact(facts, "balanceTransfer", "currentHomeLoanEmi", knownFact("18500.00", "balanceTransfer.currentHomeLoanEmi"));
    const saved = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-bt",
      commandHash: hashOpportunityAssessmentCommand("bt"),
      facts,
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    assert.equal(saved.factsJson.loanRequirement.requestedAmount.value, "2500000.00");
    assert.equal(saved.factsJson.balanceTransfer.outstandingPrincipal.state, "missing");
    assert.equal(saved.factsJson.incomeAndObligations.existingMonthlyObligations.state, "missing");
    assert.notEqual(saved.factsJson.incomeAndObligations.existingMonthlyObligations.value, "18500.00");
    console.log("24-25 BT_OUTSTANDING_AND_EMI: PASS");
  }

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const saved = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-co",
      commandHash: hashOpportunityAssessmentCommand("co"),
      facts: setFact(emptyOpportunityAssessmentFacts(), "coApplicant", "participantRef", knownFact("participant-1", "coApplicant.participantRef")),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    assert.equal(saved.factsJson.coApplicant.contributionDecision.state, "missing");
    const current = await service.readCurrentAssessment(ACTOR, { assessmentId: created.id, opportunityId: "opp-1" });
    assert.equal(current.assessment.selectedContributorParticipantRef, null);
    console.log("26 PARTICIPANT_NOT_CONTRIBUTOR: PASS");
  }

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const saved = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-se",
      commandHash: hashOpportunityAssessmentCommand("se"),
      facts: setFact(
        setFact(emptyOpportunityAssessmentFacts(), "borrower", "employmentFamily", knownFact("self_employed", "borrower.employmentFamily")),
        "selfEmployedEvidence",
        "methodologyStatus",
        knownFact("unsupported", "selfEmployedEvidence.methodologyStatus"),
      ),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    assert.equal(saved.readinessStatus, "unsupported");
    await expectCode("ASSESSMENT_UNSUPPORTED", () =>
      service.saveRevision(ACTOR, {
        assessmentId: created.id,
        opportunityId: "opp-1",
        expectedRowVersion: 2,
        commandId: "cmd-se-final",
        commandHash: hashOpportunityAssessmentCommand("se-final"),
        facts: saved.factsJson,
        sourceFingerprint: fingerprint,
        kind: "FINALIZED",
        normalizedInput: { turnover: "12000000.00" },
        normalizedInputVersion: "opportunity-assessment-normalized-input.v1",
      }),
    );
    console.log("27 SELF_EMPLOYED_UNSUPPORTED: PASS");
  }

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    await expectCode("CROSS_ORGANIZATION_ACCESS", () =>
      service.readCurrentAssessment({ ...ACTOR, organizationId: "org-other" }, { assessmentId: created.id, opportunityId: "opp-1" }),
    );
    console.log("28 CROSS_ORGANIZATION_ACCESS: PASS");
  }

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const revision = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-run",
      commandHash: hashOpportunityAssessmentCommand("run"),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    const begun = await service.beginRecommendationRun(ACTOR, {
      requestId: "req-1",
      requestHash: "hash-1",
      assessmentId: created.id,
      opportunityId: "opp-1",
      revisionId: revision.id,
      asOf: CAPTURED_AT,
      mapperVersion: "opportunity-assessment-mapper.v1",
      calculationVersion: "calc.v1",
      factsSchemaVersion: "opportunity-assessment-facts.v1",
    });
    const replay = await service.beginRecommendationRun(ACTOR, {
      requestId: "req-1",
      requestHash: "hash-1",
      assessmentId: created.id,
      opportunityId: "opp-1",
      revisionId: revision.id,
      asOf: CAPTURED_AT,
      mapperVersion: "opportunity-assessment-mapper.v1",
      calculationVersion: "calc.v1",
      factsSchemaVersion: "opportunity-assessment-facts.v1",
    });
    assert.equal(begun.id, replay.id);
    await service.completeRecommendationRun(ACTOR, {
      requestId: "req-1",
      requestHash: "hash-1",
      resultStatus: "ready",
      acceptedProgrammeIdsJson: [{ programmeId: "p1", policyVersionId: "v1", lenderScore: null }],
    });
    await expectCode("RUN_ALREADY_TERMINAL", () =>
      service.completeRecommendationRun(ACTOR, {
        requestId: "req-1",
        requestHash: "hash-1",
        resultStatus: "failed",
        failureCode: "RUN_FAILED",
      }),
    );
    const retry = await service.beginRecommendationRun(ACTOR, {
      requestId: "req-2",
      requestHash: "hash-2",
      assessmentId: created.id,
      opportunityId: "opp-1",
      revisionId: revision.id,
      asOf: CAPTURED_AT,
      mapperVersion: "opportunity-assessment-mapper.v1",
      calculationVersion: "calc.v1",
      factsSchemaVersion: "opportunity-assessment-facts.v1",
    });
    assert.notEqual(retry.id, begun.id);
    const completed = await service.readRecommendationRun(ACTOR, "req-1");
    assert.equal(completed.acceptedProgrammeIdsJson[0]?.lenderScore, null);
    assert.equal("stars" in completed, false);
    assert.equal(JSON.stringify(completed).includes("password"), false);
    assert.equal(JSON.stringify(completed).includes("lender-list"), false);
    console.log("29-33 RECOMMENDATION_RUN_CONTRACT: PASS");
  }

  {
    const left = hashOpportunityAssessmentRevisionContent({
      kind: "SAVED",
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      readinessStatus: "incomplete",
      factsSchemaVersion: "opportunity-assessment-facts.v1",
      mapperVersion: "opportunity-assessment-mapper.v1",
      normalizedInputVersion: null,
      normalizedInput: null,
    });
    const right = hashOpportunityAssessmentRevisionContent({
      kind: "SAVED",
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      readinessStatus: "incomplete",
      factsSchemaVersion: "opportunity-assessment-facts.v1",
      mapperVersion: "opportunity-assessment-mapper.v1",
      normalizedInputVersion: null,
      normalizedInput: null,
    });
    assert.equal(left, right);
  }
}
