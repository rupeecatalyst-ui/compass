import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cloneAssessmentFact, emptyOpportunityAssessmentFacts } from "@/lib/opportunity-assessment";
import { buildOpportunityAssessmentSourceFingerprint } from "@/lib/opportunity-assessment/fingerprint";
import {
  AssessmentCommandUniquenessCollision,
  MemoryOpportunityAssessmentRepository,
} from "@server/repositories/opportunity-assessment/memory-repository";
import {
  hashOpportunityAssessmentCommand,
  OpportunityAssessmentError,
  OpportunityAssessmentService,
} from "@server/services/opportunity-assessment";
import type { AssessmentFact, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { OpportunityAssessmentActorContext } from "@server/services/opportunity-assessment/types";

const CAPTURED_AT = "2026-09-22T13:30:00.000Z";
const ACTOR: OpportunityAssessmentActorContext = {
  organizationId: "org-1",
  actorUserId: "user-1",
  channel: "C1",
};

function harness() {
  const repo = new MemoryOpportunityAssessmentRepository(
    undefined,
    () => crypto.randomUUID(),
    () => CAPTURED_AT,
  );
  const service = new OpportunityAssessmentService(repo);
  return { repo, service };
}

async function expectCode(code: string, work: () => Promise<unknown>) {
  try {
    await work();
    throw new assert.AssertionError({ message: `expected ${code}` });
  } catch (error) {
    assert.equal(error instanceof OpportunityAssessmentError, true, String(error));
    assert.equal((error as OpportunityAssessmentError).code, code);
  }
}

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

function reviewMigration(sql: string, forbiddenUpdate = true) {
  for (const forbidden of [/\bDROP TABLE\b/i, /\bDROP COLUMN\b/i, /\bTRUNCATE\b/i, /\bDELETE FROM\b/i, /\bINSERT INTO\b/i]) {
    assert.equal(forbidden.test(sql), false, `migration must not contain ${forbidden}`);
  }
  if (forbiddenUpdate) {
    assert.equal(/\bUPDATE\s+"/i.test(sql), false, "migration must not rewrite existing rows");
  }
}

export async function runStage5c2aProof() {
  const frozen5c1 = readFileSync(
    new URL("../../../prisma/migrations/20260922120000_co_chanakya_opportunity_assessment_5c1/migration.sql", import.meta.url),
    "utf8",
  );
  const additive5c2a = readFileSync(
    new URL("../../../prisma/migrations/20260922133000_co_chanakya_opportunity_assessment_5c2a/migration.sql", import.meta.url),
    "utf8",
  );
  reviewMigration(frozen5c1);
  reviewMigration(additive5c2a);
  assert.match(frozen5c1, /"finalized_at" TIMESTAMP\(3\) NOT NULL/);
  assert.match(frozen5c1, /"finalized_channel" TEXT NOT NULL/);
  assert.doesNotMatch(frozen5c1, /command_id/);
  assert.match(additive5c2a, /ALTER COLUMN "finalized_at" DROP NOT NULL/);
  assert.match(additive5c2a, /ALTER COLUMN "finalized_channel" DROP NOT NULL/);
  assert.match(additive5c2a, /ADD COLUMN "command_id" TEXT/);
  assert.match(additive5c2a, /ADD COLUMN "command_hash" TEXT/);
  assert.match(additive5c2a, /ADD COLUMN "content_hash" TEXT/);
  assert.match(additive5c2a, /ADD COLUMN "revision_kind" TEXT/);
  assert.match(additive5c2a, /ADD COLUMN "request_hash" TEXT/);
  assert.match(additive5c2a, /ADD COLUMN "failure_code" TEXT/);
  assert.match(additive5c2a, /CREATE UNIQUE INDEX "eoar_org_command_id_key"/);
  assert.doesNotMatch(additive5c2a, /DEFAULT 'SAVED'/);
  assert.doesNotMatch(additive5c2a, /cmd-/);
  console.log("MIGRATION_STATIC_ADDITIVE_ONLY: PASS");

  const fingerprint = buildOpportunityAssessmentSourceFingerprint({ opportunityRowVersion: 3 });
  const { service, repo } = harness();
  const created = await service.getOrCreateAssessment(ACTOR, "opp-1");
  const saved = await service.saveRevision(ACTOR, {
    assessmentId: created.id,
    opportunityId: "opp-1",
    expectedRowVersion: 1,
    commandId: "cmd-persist",
    commandHash: hashOpportunityAssessmentCommand("persist"),
    facts: emptyOpportunityAssessmentFacts(),
    sourceFingerprint: fingerprint,
    kind: "SAVED",
  });

  assert.equal(saved.commandId, "cmd-persist");
  assert.equal(saved.commandHash, hashOpportunityAssessmentCommand("persist"));
  assert.equal(typeof saved.contentHash, "string");
  assert.equal(saved.contentHash.length, 64);
  assert.equal("commandId" in saved.normalizedInputJson, false);
  assert.equal("contentHash" in saved.normalizedInputJson, false);
  assert.equal(saved.revisionKind, "SAVED");
  assert.equal(saved.finalizedAt, null);
  assert.equal(saved.finalizedChannel, null);
  console.log("1 COMMAND_IDENTITY_PERSISTED: PASS");
  console.log("6-7 SAVED_FINALIZED_NULLS: PASS");
  console.log("10 CONTENT_HASH_PERSISTED: PASS");

  await assert.rejects(
    () =>
      repo.transaction((tx) =>
        tx.insertRevision({
          ...saved,
          id: "rev-dup",
          revisionNumber: 99,
        }),
      ),
    (error: unknown) => error instanceof AssessmentCommandUniquenessCollision,
  );
  console.log("2 DUPLICATE_COMMAND_UNIQUENESS_COLLISION: PASS");

  const replay = await service.saveRevision(ACTOR, {
    assessmentId: created.id,
    opportunityId: "opp-1",
    expectedRowVersion: 1,
    commandId: "cmd-persist",
    commandHash: hashOpportunityAssessmentCommand("persist"),
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
      commandId: "cmd-persist",
      commandHash: hashOpportunityAssessmentCommand("other"),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    }),
  );
  console.log("3-4 IDEMPOTENT_REPLAY_AND_HASH_CONFLICT: PASS");

  const createdTwo = await service.getOrCreateAssessment(ACTOR, "opp-2");
  const [left, right] = await Promise.allSettled([
    service.saveRevision(ACTOR, {
      assessmentId: createdTwo.id,
      opportunityId: "opp-2",
      expectedRowVersion: 1,
      commandId: "cmd-race",
      commandHash: hashOpportunityAssessmentCommand("race"),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    }),
    service.saveRevision(ACTOR, {
      assessmentId: createdTwo.id,
      opportunityId: "opp-2",
      expectedRowVersion: 1,
      commandId: "cmd-race",
      commandHash: hashOpportunityAssessmentCommand("race"),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    }),
  ]);
  const wins = [left, right].filter((row) => row.status === "fulfilled") as PromiseFulfilledResult<{ id: string }>[];
  assert.equal(wins.length, 2);
  assert.equal(wins[0].value.id, wins[1].value.id);
  const racedRevisions = await repo.listRevisions(ACTOR.organizationId, createdTwo.id);
  assert.equal(racedRevisions.length, 1);
  console.log("5 CONCURRENT_COMMAND_NO_DUPLICATE: PASS");

  await expectCode("INVALID_FINALIZATION", () =>
    repo.transaction((tx) =>
      tx.insertRevision({
        ...saved,
        id: "rev-final-missing",
        commandId: "cmd-final-missing",
        revisionNumber: 50,
        revisionKind: "FINALIZED",
        finalizedAt: null,
        finalizedChannel: null,
      }),
    ),
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
  assert.equal(finalized.revisionKind, "FINALIZED");
  assert.equal(finalized.finalizedAt, CAPTURED_AT);
  assert.equal(finalized.finalizedChannel, "C1");
  const prior = await repo.getRevision(ACTOR.organizationId, saved.id);
  assert.equal(prior.finalizedAt, null);
  assert.equal(prior.revisionKind, "SAVED");
  assert.equal(prior.factsJson.borrower.residency.state, "missing");
  console.log("8-9 FINALIZED_REQUIRES_STAMP: PASS");
  console.log("15 PRIOR_REVISION_UNCHANGED: PASS");

  const begun = await service.beginRecommendationRun(ACTOR, {
    requestId: "req-5c2a",
    requestHash: "hash-5c2a",
    assessmentId: created.id,
    opportunityId: "opp-1",
    revisionId: finalized.id,
    asOf: CAPTURED_AT,
    mapperVersion: "opportunity-assessment-mapper.v1",
    calculationVersion: "calc.v1",
    factsSchemaVersion: "opportunity-assessment-facts.v1",
  });
  assert.equal(begun.requestHash, "hash-5c2a");
  assert.equal(begun.failureCode, null);
  const success = await service.completeRecommendationRun(ACTOR, {
    requestId: "req-5c2a",
    requestHash: "hash-5c2a",
    resultStatus: "ready",
  });
  assert.equal(success.failureCode, null);
  console.log("11 REQUEST_HASH_PERSISTED: PASS");
  console.log("13 SUCCESS_RUN_NO_FAILURE_CODE: PASS");

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
    failureCode: "password authentication failed for user postgres" as never,
  });
  assert.equal(failed.failureCode, "RUN_FAILED");
  assert.equal(JSON.stringify(failed).includes("password"), false);
  assert.equal(JSON.stringify(failed).includes("postgres"), false);
  console.log("12 SANITIZED_FAILURE_CODE: PASS");
  console.log("14 RAW_FAILURE_TEXT_REJECTED: PASS");

  repo.failNextTransactionAfter = "revision-insert";
  await assert.rejects(() =>
    service.saveRevision(ACTOR, {
      assessmentId: created.id,
      opportunityId: "opp-1",
      expectedRowVersion: 3,
      commandId: "cmd-rollback",
      commandHash: hashOpportunityAssessmentCommand("rollback"),
      facts: emptyOpportunityAssessmentFacts(),
      sourceFingerprint: fingerprint,
      kind: "SAVED",
    }),
  );
  const afterFail = await service.readCurrentAssessment(ACTOR, { assessmentId: created.id, opportunityId: "opp-1" });
  assert.equal(afterFail.currentRevision?.id, finalized.id);
  assert.equal(afterFail.rowVersion, 3);
  console.log("16 TRANSACTION_ROLLBACK_ATOMIC: PASS");

  await expectCode("CROSS_ORGANIZATION_ACCESS", () =>
    service.readCurrentAssessment(
      { ...ACTOR, organizationId: "org-other" },
      { assessmentId: created.id, opportunityId: "opp-1" },
    ),
  );
  console.log("17 TENANT_ISOLATION: PASS");
}
