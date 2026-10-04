import assert from "node:assert/strict";
import { cloneAssessmentFact, emptyOpportunityAssessmentFacts } from "@/lib/opportunity-assessment";
import { buildOpportunityAssessmentSourceFingerprint } from "@/lib/opportunity-assessment/fingerprint";
import { FakeOpportunityAssessmentPrisma } from "@server/repositories/opportunity-assessment/fake-prisma";
import { PrismaOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/prisma-repository";
import {
  hashOpportunityAssessmentCommand,
  OpportunityAssessmentError,
  OpportunityAssessmentService,
} from "@server/services/opportunity-assessment";
import type { AssessmentFact, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { OpportunityAssessmentActorContext } from "@server/services/opportunity-assessment/types";

const CAPTURED_AT = "2026-09-22T15:00:00.000Z";
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

function harness() {
  const prisma = new FakeOpportunityAssessmentPrisma(
    () => crypto.randomUUID(),
    () => new Date(CAPTURED_AT),
  );
  const repo = new PrismaOpportunityAssessmentRepository(prisma, () => crypto.randomUUID(), () => CAPTURED_AT);
  const service = new OpportunityAssessmentService(repo);
  return { prisma, repo, service };
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
    assert.equal(String((error as Error).message).includes("postgres"), false);
  }
}

export async function runStage5c3Proof() {
  const fingerprint = buildOpportunityAssessmentSourceFingerprint({ opportunityRowVersion: 4 });

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const read = await service.readCurrentAssessment(ACTOR, { assessmentId: created.id, opportunityId: "opp-1" });
    assert.equal(read.assessment.organizationId, "org-1");
    assert.equal(read.currentRevision, null);
    assert.equal(created.draftFactsJson.borrower.residency.state, "missing");
    console.log("1-2 TENANT_GET_OR_CREATE: PASS");
  }

  {
    const prisma = new FakeOpportunityAssessmentPrisma();
    const left = new OpportunityAssessmentService(new PrismaOpportunityAssessmentRepository(prisma));
    const right = new OpportunityAssessmentService(new PrismaOpportunityAssessmentRepository(prisma));
    const [a, b] = await Promise.all([left.getOrCreateAssessment(ACTOR, "opp-race"), right.getOrCreateAssessment(ACTOR, "opp-race")]);
    assert.equal(a.id, b.id);
    assert.equal(prisma.assessments.size, 1);
    console.log("3 CONCURRENT_GET_OR_CREATE: PASS");
  }

  {
    const { service, repo, prisma } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    const saved = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-1",
      commandHash: hashOpportunityAssessmentCommand(1),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    assert.equal(saved.revisionNumber, 1);
    assert.equal(saved.revisionKind, "SAVED");
    assert.equal(saved.finalizedAt, null);
    assert.equal(saved.finalizedChannel, null);
    assert.equal(saved.contentHash.length, 64);
    const current = await service.readCurrentAssessment(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      currentSourceFingerprint: fingerprint,
    });
    assert.equal(current.currentRevision?.id, saved.id);
    assert.equal(current.rowVersion, 2);
    assert.equal(current.stale, false);
    assert.deepEqual(current.sourceFingerprint, fingerprint);
    console.log("4-5 REVISION_INSERT_AND_CAS: PASS");
    console.log("11 SAVED_NULL_FINALIZATION: PASS");
    console.log("21 SOURCE_FINGERPRINT: PASS");

    await expectCode("ASSESSMENT_CONFLICT", () =>
      service.saveRevision(ACTOR, {
        assessmentId: created.id,
        opportunityId: "opp-1",
        expectedRowVersion: 1,
        commandId: "cmd-stale",
        commandHash: hashOpportunityAssessmentCommand("stale"),
        facts: emptyOpportunityAssessmentFacts(),
        sourceFingerprint: fingerprint,
        kind: "SAVED",
      }),
    );
    console.log("6 STALE_CAS: PASS");

    await assert.rejects(() =>
      repo.transaction(async (tx) => {
        await tx.insertRevision({
          ...saved,
          id: "rev-orphan",
          commandId: "cmd-orphan",
          commandHash: hashOpportunityAssessmentCommand("orphan"),
          revisionNumber: 9,
        });
        await tx.advanceAssessmentCursor({
          organizationId: ACTOR.organizationId,
          assessmentId: created.id,
          expectedRowVersion: 99,
          currentRevisionId: "rev-orphan",
          draftFactsJson: saved.factsJson,
          sourceFingerprintJson: fingerprint,
          readinessStatus: "incomplete",
          unsupportedReasonCode: null,
          selectedContributorParticipantRef: null,
          updatedByUserId: ACTOR.actorUserId,
          updatedChannel: ACTOR.channel,
        });
      }),
    );
    assert.equal(prisma.revisions.has("rev-orphan"), false);
    assert.equal(prisma.revisions.size, 1);
    console.log("7 FAILED_CAS_ROLLBACK: PASS");

    const replay = await service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 1,
      commandId: "cmd-1",
      commandHash: hashOpportunityAssessmentCommand(1),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    });
    assert.equal(replay.id, saved.id);
    await expectCode("IDEMPOTENCY_CONFLICT", () =>
      service.saveRevision(ACTOR, {
        assessmentId: created.id,
        opportunityId: "opp-1",
        expectedRowVersion: 2,
        commandId: "cmd-1",
        commandHash: hashOpportunityAssessmentCommand("other"),
        facts: emptyOpportunityAssessmentFacts(),
        sourceFingerprint: fingerprint,
        kind: "SAVED",
      }),
    );
    console.log("9-10 COMMAND_IDEMPOTENCY: PASS");

    await assert.rejects(() =>
      repo.transaction((tx) =>
        tx.insertRevision({
          ...saved,
          id: "rev-dup-cmd",
          revisionNumber: 8,
        }),
      ),
    );
    assert.equal(prisma.revisions.size, 1);
    console.log("8 COMMAND_UNIQUENESS_RACE: PASS");

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
    assert.equal(finalized.revisionKind, "FINALIZED");
    assert.ok(finalized.finalizedAt);
    assert.equal(finalized.finalizedChannel, "C1");
    const history = await repo.listRevisions(ACTOR.organizationId, created.id);
    assert.equal(history.length, 2);
    assert.equal(history[0].id, saved.id);
    assert.equal(history[0].finalizedAt, null);
    console.log("12 FINALIZED_POPULATED: PASS");
    console.log("13 REVISION_HISTORY: PASS");

    const begun = await service.beginRecommendationRun(ACTOR, {
      requestId: "req-1",
      requestHash: "hash-1",
      assessmentId: created.id,
      opportunityId: "opp-1",
      revisionId: finalized.id,
      asOf: CAPTURED_AT,
      mapperVersion: "opportunity-assessment-mapper.v1",
      calculationVersion: "calc.v1",
      factsSchemaVersion: "opportunity-assessment-facts.v1",
    });
    assert.equal(begun.requestHash, "hash-1");
    assert.equal(begun.failureCode, null);
    const completed = await service.completeRecommendationRun(ACTOR, {
      requestId: "req-1",
      requestHash: "hash-1",
      resultStatus: "ready",
      acceptedProgrammeIdsJson: [{ programmeId: "p1", policyVersionId: "v1", lenderScore: 99 as never }],
    });
    assert.equal(completed.acceptedProgrammeIdsJson[0]?.lenderScore, null);
    await expectCode("RUN_ALREADY_TERMINAL", () =>
      service.completeRecommendationRun(ACTOR, {
        requestId: "req-1",
        requestHash: "hash-1",
        resultStatus: "failed",
        failureCode: "RUN_FAILED",
      }),
    );
    const failedBegin = await service.beginRecommendationRun(ACTOR, {
      requestId: "req-fail",
      requestHash: "hash-fail",
      assessmentId: created.id,
      opportunityId: "opp-1",
      revisionId: finalized.id,
      asOf: CAPTURED_AT,
      mapperVersion: "opportunity-assessment-mapper.v1",
      calculationVersion: "calc.v1",
      factsSchemaVersion: "opportunity-assessment-facts.v1",
    });
    const failed = await service.completeRecommendationRun(ACTOR, {
      requestId: failedBegin.id,
      requestHash: "hash-fail",
      resultStatus: "failed",
      failureCode: "password authentication failed DATABASE_URL" as never,
    });
    assert.equal(failed.failureCode, "RUN_FAILED");
    assert.equal(JSON.stringify(failed).includes("password"), false);
    console.log("14-18 RUN_CONTRACT: PASS");
    console.log("22 LENDER_SCORE_NULL: PASS");
  }

  {
    const { prisma, service } = harness();
    prisma.failNextCreate = "password authentication failed for user postgres host=db DATABASE_URL=secret";
    await expectCode("ASSESSMENT_PERSISTENCE_FAILURE", () => service.getOrCreateAssessment(ACTOR, "opp-raw"));
    assert.match(String((prisma.lastThrown as Error).message), /password/);
    console.log("19 RAW_DB_ERROR_SUPPRESSED: PASS");
  }

  {
    const { service } = harness();
    const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
    await expectCode("CROSS_ORGANIZATION_ACCESS", () =>
      service.readCurrentAssessment({ ...ACTOR, organizationId: "org-other" }, { assessmentId: created.id, opportunityId: "opp-1" }),
    );
    console.log("20 CROSS_TENANT: PASS");
  }
}
