/**
 * Local proof that persisted assessment inspection is a SELECT-only path.
 * No database. No recommendation engine. No Opportunity or programme writes.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { missingAssessmentFact } from "@/lib/opportunity-assessment/empty-facts";
import { emptyOpportunityAssessmentFacts } from "@/lib/opportunity-assessment/empty-facts";
import type { AssessmentFact, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import {
  MemoryOpportunityAssessmentRepository,
  createEmptyOpportunityAssessmentStore,
  type OpportunityAssessmentStore,
} from "@server/repositories/opportunity-assessment/memory-repository";
import { PrismaOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/prisma-repository";
import type { OpportunityAssessmentPrismaSurface } from "@server/repositories/opportunity-assessment/prisma-surface";
import { OpportunityAssessmentError } from "@server/services/opportunity-assessment/errors";
import { createOpportunityAssessmentService } from "@server/services/opportunity-assessment/runtime";
import { ASSESSMENT_REVISION_ENVELOPE_VERSION } from "@server/services/opportunity-assessment/types";
import type {
  OpportunityAssessmentRecommendationRunRecord,
  OpportunityAssessmentRecord,
  OpportunityAssessmentRevisionRecord,
} from "@server/services/opportunity-assessment/types";

const ORG = "org-read-proof";
const OPPORTUNITY_ID = "opp-read-proof";
const ACTOR = { organizationId: ORG, actorUserId: "user-read-proof", channel: "C1" as const };

function known<T>(value: T): AssessmentFact<T> {
  return { ...missingAssessmentFact<T>(), value, state: "known" };
}

function factsWith(input: { productCode: "HOME_LOAN"; requestedAmount: string }): OpportunityAssessmentFactsV1 {
  const facts = emptyOpportunityAssessmentFacts();
  facts.loanRequirement.productCode = known(input.productCode);
  facts.loanRequirement.requestedAmount = known(input.requestedAmount);
  facts.incomeAndObligations.requestedTenureMonths = known(300);
  facts.borrower.employmentFamily = known("salaried");
  facts.borrower.employmentTypeCode = known("salaried");
  facts.incomeAndObligations.monthlyIncome = known("200000.00");
  facts.incomeAndObligations.existingMonthlyObligations = known("25000.00");
  facts.borrower.ageYears = known(40);
  facts.borrower.constitution = known("individual");
  facts.borrower.residency = known("resident");
  facts.cibil.kind = known("expected_band");
  facts.cibil.expectedBand = known("750_799");
  facts.property.propertyValue = known("15000000.00");
  facts.property.propertyCategory = known("residential");
  facts.property.constructionStatus = known("ready");
  facts.property.propertyCity = known("mumbai");
  facts.property.propertyState = known("MH");
  facts.borrower.journeyCity = known("mumbai");
  facts.borrower.journeyState = known("MH");
  return facts;
}

const fingerprint = {
  opportunityRowVersion: 10,
  contactUpdatedAt: null,
  companyUpdatedAt: null,
  compassAssessmentUpdatedAt: null,
};

function revision(input: {
  id: string;
  number: number;
  facts: OpportunityAssessmentFactsV1;
  hash: string;
  kind: "SAVED" | "FINALIZED";
  finalizedAt: string | null;
}): OpportunityAssessmentRevisionRecord {
  return {
    id: input.id,
    organizationId: ORG,
    opportunityId: OPPORTUNITY_ID,
    assessmentId: "assessment-1",
    revisionNumber: input.number,
    factsJson: input.facts,
    normalizedInputJson: {
      schemaVersion: ASSESSMENT_REVISION_ENVELOPE_VERSION,
      normalizedInputVersion: null,
      normalizedInput: null,
    },
    sourceFingerprintJson: fingerprint,
    factsSchemaVersion: input.facts.schemaVersion,
    mapperVersion: "opportunity-assessment-mapper.v1",
    readinessStatus: "ready",
    revisionKind: input.kind,
    commandId: `command-${input.id}`,
    commandHash: `command-hash-${input.id}`,
    contentHash: input.hash,
    finalizedAt: input.finalizedAt,
    finalizedByUserId: input.finalizedAt ? "user-read-proof" : null,
    finalizedChannel: input.finalizedAt ? "C1" : null,
    supersededAt: null,
  };
}

function run(input: {
  id: string;
  revisionId: string;
  assessedAt: string;
}): OpportunityAssessmentRecommendationRunRecord {
  return {
    id: input.id,
    organizationId: ORG,
    opportunityId: OPPORTUNITY_ID,
    assessmentId: "assessment-1",
    revisionId: input.revisionId,
    requestHash: `request-${input.id}`,
    assessedAt: input.assessedAt,
    asOf: input.assessedAt,
    mapperVersion: "opportunity-assessment-mapper.v1",
    calculationVersion: "calc-v1",
    factsSchemaVersion: "opportunity-assessment-facts.v1",
    resultStatus: "no_eligible_programmes",
    missingInputCodes: [],
    rejectedProgrammeCodesJson: [{ programmeId: "programme-stored", reason: "ELIGIBILITY_NOT_MET" }],
    acceptedProgrammeIdsJson: [],
    cibilNotKnownDisclaimer: false,
    failureCode: null,
  };
}

function assessment(facts: OpportunityAssessmentFactsV1): OpportunityAssessmentRecord {
  return {
    id: "assessment-1",
    organizationId: ORG,
    opportunityId: OPPORTUNITY_ID,
    currentRevisionId: "revision-2",
    draftFactsJson: facts,
    sourceFingerprintJson: fingerprint,
    readinessStatus: "ready",
    unsupportedReasonCode: null,
    selectedContributorParticipantRef: null,
    rowVersion: 3,
    createdByUserId: "user-read-proof",
    updatedByUserId: "user-read-proof",
    updatedChannel: "C1",
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-01T08:36:43.213Z",
  };
}

function snapshotStore(store: OpportunityAssessmentStore) {
  return JSON.stringify({
    assessments: [...store.assessments.entries()],
    links: [...store.assessmentsByOpportunity.entries()],
    revisions: [...store.revisions.entries()],
    commands: [...store.revisionsByCommand.entries()],
    runs: [...store.runs.entries()],
  });
}

function seed(store: OpportunityAssessmentStore) {
  const firstFacts = factsWith({ productCode: "HOME_LOAN", requestedAmount: "10000000.00" });
  const secondFacts = factsWith({ productCode: "HOME_LOAN", requestedAmount: "999.00" });
  const row = assessment(secondFacts);
  const later = revision({
    id: "revision-2",
    number: 2,
    facts: secondFacts,
    hash: "hash-revision-2",
    kind: "FINALIZED",
    finalizedAt: "2026-10-01T08:30:00.000Z",
  });
  const earlier = revision({
    id: "revision-1",
    number: 1,
    facts: firstFacts,
    hash: "hash-revision-1",
    kind: "SAVED",
    finalizedAt: null,
  });
  const laterRun = run({
    id: "run-later",
    revisionId: "revision-2",
    assessedAt: "2026-10-01T08:40:00.000Z",
  });
  const earlierRun = run({
    id: "run-earlier",
    revisionId: "revision-1",
    assessedAt: "2026-10-01T08:10:00.000Z",
  });
  store.assessments.set(row.id, row);
  store.assessmentsByOpportunity.set(`${ORG}:${OPPORTUNITY_ID}`, row.id);
  store.revisions.set(later.id, later);
  store.revisions.set(earlier.id, earlier);
  store.runs.set(laterRun.id, laterRun);
  store.runs.set(earlierRun.id, earlierRun);
  return { firstFacts, secondFacts, laterRun };
}

function guardedMemory(store: OpportunityAssessmentStore, writes: Record<string, number>) {
  const base = new MemoryOpportunityAssessmentRepository(store);
  return new Proxy(base, {
    get(target, prop, receiver) {
      if (
        prop === "getOrCreateAssessment" ||
        prop === "insertRevision" ||
        prop === "insertRun" ||
        prop === "advanceAssessmentCursor" ||
        prop === "completeRun" ||
        prop === "transaction"
      ) {
        return async () => {
          writes[String(prop)] = (writes[String(prop)] ?? 0) + 1;
          throw new Error(`WRITE_FORBIDDEN:${String(prop)}`);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function methodBody(file: string, name: string) {
  const text = source(file);
  const start = text.indexOf(`async ${name}(`);
  assert.ok(start >= 0, name);
  const next = text.indexOf("\n  async ", start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

async function expectClosed(work: () => Promise<unknown>) {
  try {
    await work();
    assert.fail("organization boundary returned a value");
  } catch (error) {
    assert.equal(error instanceof OpportunityAssessmentError, true);
    assert.equal((error as OpportunityAssessmentError).code, "CROSS_ORGANIZATION_ACCESS");
    assert.equal(error instanceof Error ? error.message : "", "CROSS_ORGANIZATION_ACCESS");
  }
}

function visibleRows<T extends { organizationId: string; assessmentId: string }>(
  rows: readonly T[],
  where: { organizationId?: string; assessmentId?: string },
) {
  return rows.filter((row) => {
    if (where.organizationId !== undefined && row.organizationId !== where.organizationId) return false;
    if (where.assessmentId !== undefined && row.assessmentId !== where.assessmentId) return false;
    return true;
  });
}

export async function runPersistedAssessmentReadProof() {
  const writes = {
    getOrCreateAssessment: 0,
    insertRevision: 0,
    insertRun: 0,
    advanceAssessmentCursor: 0,
    completeRun: 0,
    transaction: 0,
  };
  const store = createEmptyOpportunityAssessmentStore();
  const seeded = seed(store);
  const before = snapshotStore(store);
  const service = createOpportunityAssessmentService({ repository: guardedMemory(store, writes) });

  const found = await service.inspectPersistedAssessment(ACTOR, OPPORTUNITY_ID);
  assert.ok(found);
  assert.equal(found.opportunityId, OPPORTUNITY_ID);
  assert.equal(found.assessment.assessmentId, "assessment-1");
  assert.equal(found.assessment.currentRevisionId, "revision-2");
  assert.deepEqual(
    found.revisions.map((row) => row.revisionNumber),
    [1, 2],
  );
  assert.deepEqual(
    found.revisions.map((row) => row.revisionId),
    ["revision-1", "revision-2"],
  );
  assert.equal(found.revisionOrder, "revisionNumber asc, id asc");
  assert.equal(found.revisions[0]?.finalizedAt, null);
  assert.equal(found.revisions[1]?.finalizedAt, "2026-10-01T08:30:00.000Z");
  assert.equal(found.revisions[0]?.contentHash, "hash-revision-1");
  assert.equal(found.revisions[1]?.contentHash, "hash-revision-2");
  assert.equal(found.revisions[0]?.readinessStatus, "ready");
  assert.deepEqual(found.revisions[0]?.factsJson, seeded.firstFacts);
  assert.equal(found.revisions[0]?.facts.requestedAmount.value, "10000000.00");
  assert.equal(found.revisions[0]?.facts.productCode.value, "HOME_LOAN");
  assert.equal(found.revisions[0]?.facts.requestedTenureMonths.value, 300);
  assert.equal(found.revisions[0]?.facts.employmentFamily.value, "salaried");
  assert.equal(found.revisions[0]?.facts.monthlyIncome.value, "200000.00");
  assert.equal(found.revisions[0]?.facts.existingMonthlyObligations.value, "25000.00");
  assert.equal(found.revisions[0]?.facts.borrowerAge.value, 40);
  assert.equal(found.revisions[0]?.facts.legalConstitution.value, "individual");
  assert.equal(found.revisions[0]?.facts.residency.value, "resident");
  assert.equal(found.revisions[0]?.facts.cibilExpectedBand.value, "750_799");
  assert.equal(found.revisions[0]?.facts.propertyValue.value, "15000000.00");
  assert.equal(found.revisions[0]?.facts.propertyCategory.value, "residential");
  assert.equal(found.revisions[0]?.facts.constructionStatus.value, "ready");
  assert.equal(found.revisions[0]?.facts.propertyCity.value, "mumbai");
  assert.equal(found.revisions[0]?.facts.propertyState.value, "MH");
  assert.deepEqual(found.revisions[1]?.factsJson, seeded.secondFacts);
  assert.equal(found.revisions[1]?.facts.requestedAmount.value, "999.00");
  assert.deepEqual(
    found.recommendationRuns.map((row) => row.runId),
    ["run-earlier", "run-later"],
  );
  assert.equal(found.runOrder, "assessedAt asc, id asc");
  assert.equal(found.recommendationRuns[1]?.revisionId, "revision-2");
  assert.equal(found.recommendationRuns[0]?.revisionId, "revision-1");
  assert.equal(found.recommendationRuns[1]?.resultStatus, "no_eligible_programmes");
  assert.deepEqual(found.recommendationRuns[1]?.rejectedProgrammeCodesJson, seeded.laterRun.rejectedProgrammeCodesJson);
  assert.equal(Object.hasOwn(found.revisions[0] ?? {}, "createdAt"), false);
  assert.equal(Object.hasOwn(found.revisions[1] ?? {}, "createdAt"), false);
  assert.equal(Object.hasOwn(found, "latestRun"), false);
  assert.equal(Object.hasOwn(found, "responsibleRun"), false);
  assert.deepEqual([...store.runs.keys()], ["run-later", "run-earlier"]);
  assert.equal(snapshotStore(store), before);
  assert.deepEqual(writes, {
    getOrCreateAssessment: 0,
    insertRevision: 0,
    insertRun: 0,
    advanceAssessmentCursor: 0,
    completeRun: 0,
    transaction: 0,
  });

  const empty = createEmptyOpportunityAssessmentStore();
  const emptyBefore = snapshotStore(empty);
  const emptyWrites = { ...writes };
  const emptyService = createOpportunityAssessmentService({ repository: guardedMemory(empty, emptyWrites) });
  const missing = await emptyService.inspectPersistedAssessment(ACTOR, "opp-absent");
  assert.equal(missing, null);
  assert.equal(snapshotStore(empty), emptyBefore);
  assert.equal(empty.assessments.size, 0);
  assert.equal(empty.revisions.size, 0);
  assert.equal(empty.runs.size, 0);
  assert.equal(emptyWrites.getOrCreateAssessment, 0);
  assert.equal(emptyWrites.insertRevision, 0);
  assert.equal(emptyWrites.insertRun, 0);

  const afterRead = snapshotStore(store);
  const wrongOrganization = await service.inspectPersistedAssessment(
    { ...ACTOR, organizationId: "org-other" },
    OPPORTUNITY_ID,
  );
  assert.equal(wrongOrganization, null);
  assert.equal(snapshotStore(store), afterRead);
  const blankCalls: string[] = [];
  const blankBase = new MemoryOpportunityAssessmentRepository(store);
  const blankRepository = new Proxy(blankBase, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof prop !== "string" || typeof value !== "function") return value;
      return (...args: unknown[]) => {
        blankCalls.push(prop);
        return value.apply(target, args);
      };
    },
  });
  await expectClosed(() =>
    createOpportunityAssessmentService({ repository: blankRepository }).inspectPersistedAssessment(
      { ...ACTOR, organizationId: "" },
      OPPORTUNITY_ID,
    ),
  );
  assert.deepEqual(blankCalls, []);
  assert.equal(snapshotStore(store), afterRead);

  const mixed = createEmptyOpportunityAssessmentStore();
  seed(mixed);
  const foreignRevision = revision({
    id: "revision-foreign",
    number: 9,
    facts: factsWith({ productCode: "HOME_LOAN", requestedAmount: "777.00" }),
    hash: "hash-foreign",
    kind: "SAVED",
    finalizedAt: null,
  });
  foreignRevision.organizationId = "org-other";
  mixed.revisions.set(foreignRevision.id, foreignRevision);
  await expectClosed(() =>
    createOpportunityAssessmentService({
      repository: new MemoryOpportunityAssessmentRepository(mixed),
    }).inspectPersistedAssessment(ACTOR, OPPORTUNITY_ID),
  );

  const prismaWrites = { create: 0, updateMany: 0, transaction: 0, findMany: 0 };
  const revisionOrder: unknown[] = [];
  const prismaRows = {
    assessment: {
      ...assessment(seeded.secondFacts),
      draftFactsJson: seeded.secondFacts,
      sourceFingerprintJson: fingerprint,
    },
    revisions: [
      { ...revision({ id: "revision-2", number: 2, facts: seeded.secondFacts, hash: "hash-revision-2", kind: "FINALIZED", finalizedAt: "2026-10-01T08:30:00.000Z" }) },
      { ...revision({ id: "revision-1", number: 1, facts: seeded.firstFacts, hash: "hash-revision-1", kind: "SAVED", finalizedAt: null }) },
    ],
    runs: [
      { ...run({ id: "run-later", revisionId: "revision-2", assessedAt: "2026-10-01T08:40:00.000Z" }) },
      { ...run({ id: "run-earlier", revisionId: "revision-1", assessedAt: "2026-10-01T08:10:00.000Z" }) },
      {
        ...run({ id: "run-foreign", revisionId: "revision-foreign", assessedAt: "2026-10-01T08:50:00.000Z" }),
        organizationId: "org-other",
      },
    ],
  };
  prismaRows.revisions.push({
    ...revision({
      id: "revision-foreign",
      number: 9,
      facts: factsWith({ productCode: "HOME_LOAN", requestedAmount: "777.00" }),
      hash: "hash-foreign",
      kind: "SAVED",
      finalizedAt: null,
    }),
    organizationId: "org-other",
  });
  const forbid = (kind: "create" | "updateMany" | "transaction") => async () => {
    prismaWrites[kind] += 1;
    throw new Error(`WRITE_FORBIDDEN:${kind}`);
  };
  const surface: OpportunityAssessmentPrismaSurface = {
    $transaction: forbid("transaction"),
    enterpriseOpportunityAssessment: {
      findUnique: async (args) => {
        const where = args.where as { opportunityId?: string; id?: string };
        if (where.opportunityId === OPPORTUNITY_ID || where.id === "assessment-1") return prismaRows.assessment;
        return null;
      },
      findFirst: async () => null,
      findMany: async () => [],
      create: forbid("create"),
      updateMany: forbid("updateMany"),
    },
    enterpriseOpportunityAssessmentRevision: {
      findUnique: async () => null,
      findFirst: async () => null,
      findMany: async (args) => {
        prismaWrites.findMany += 1;
        revisionOrder.push(args.orderBy);
        const where = args.where as { organizationId?: string; assessmentId?: string };
        const rows = visibleRows(prismaRows.revisions, where);
        const order = args.orderBy as { revisionNumber?: string } | undefined;
        if (order?.revisionNumber === "asc") {
          return [...rows].sort((left, right) => left.revisionNumber - right.revisionNumber);
        }
        return rows;
      },
      create: forbid("create"),
      updateMany: forbid("updateMany"),
    },
    enterpriseOpportunityAssessmentRecommendationRun: {
      findUnique: async () => null,
      findFirst: async () => null,
      findMany: async (args) => {
        const where = args.where as { organizationId?: string; assessmentId?: string };
        return visibleRows(prismaRows.runs, where);
      },
      create: forbid("create"),
      updateMany: forbid("updateMany"),
    },
  };
  const prismaService = createOpportunityAssessmentService({
    repository: new PrismaOpportunityAssessmentRepository(surface),
  });
  const prismaFound = await prismaService.inspectPersistedAssessment(ACTOR, OPPORTUNITY_ID);
  assert.ok(prismaFound);
  assert.deepEqual(
    prismaFound.revisions.map((row) => row.revisionId),
    ["revision-1", "revision-2"],
  );
  assert.deepEqual(revisionOrder, [{ revisionNumber: "asc" }]);
  assert.equal(prismaFound.revisions[0]?.facts.requestedAmount.value, "10000000.00");
  assert.deepEqual(prismaFound.recommendationRuns.map((row) => [row.runId, row.revisionId]), [
    ["run-earlier", "revision-1"],
    ["run-later", "revision-2"],
  ]);
  assert.equal(prismaFound.revisions.some((row) => row.revisionId === "revision-foreign"), false);
  assert.equal(prismaFound.recommendationRuns.some((row) => row.runId === "run-foreign"), false);
  assert.equal(JSON.stringify(prismaFound).includes("777.00"), false);
  assert.deepEqual(prismaWrites, { create: 0, updateMany: 0, transaction: 0, findMany: 1 });
  await expectClosed(() =>
    prismaService.inspectPersistedAssessment({ ...ACTOR, organizationId: "org-other" }, OPPORTUNITY_ID),
  );
  assert.equal(prismaWrites.findMany, 1);
  assert.equal(prismaWrites.create, 0);

  const absentSurface: OpportunityAssessmentPrismaSurface = {
    ...surface,
    enterpriseOpportunityAssessment: {
      ...surface.enterpriseOpportunityAssessment,
      findUnique: async () => null,
    },
  };
  const absentService = createOpportunityAssessmentService({
    repository: new PrismaOpportunityAssessmentRepository(absentSurface),
  });
  assert.equal(await absentService.inspectPersistedAssessment(ACTOR, "opp-absent"), null);
  assert.equal(prismaWrites.create, 0);
  assert.equal(prismaWrites.updateMany, 0);
  assert.equal(prismaWrites.transaction, 0);
  assert.equal(prismaWrites.findMany, 1);

  const inspection = source("server/services/opportunity-assessment/persisted-assessment-inspection.ts");
  const inspectBody = methodBody(
    "server/services/opportunity-assessment/opportunity-assessment.service.ts",
    "inspectPersistedAssessment",
  );
  const findBody = methodBody(
    "server/repositories/opportunity-assessment/prisma-repository.ts",
    "findPersistedAssessmentByOpportunity",
  );
  for (const text of [inspection, inspectBody, findBody]) {
    assert.equal(text.includes("getOrCreateAssessment"), false);
    assert.equal(text.includes("recommendLendersCanonical"), false);
    assert.equal(text.includes("evaluateCanonicalEligibility"), false);
    assert.equal(text.includes(".create("), false);
    assert.equal(text.includes("updateMany"), false);
    assert.equal(text.includes("enterpriseLenderProgram"), false);
    assert.equal(text.includes("updateOpportunity"), false);
  }
  const capture = source("server/services/opportunity-assessment/http.ts");
  const recommendationRoute = source(
    "src/app/api/enterprise-opportunities/[opportunityId]/opportunity-assessment/recommendation/route.ts",
  );
  const assessmentRoute = source(
    "src/app/api/enterprise-opportunities/[opportunityId]/opportunity-assessment/route.ts",
  );
  assert.equal(capture.includes("getOrCreateAssessment"), true);
  assert.equal(assessmentRoute.includes("inspectPersistedAssessment"), false);
  assert.equal(recommendationRoute.includes("inspectPersistedAssessment"), false);
}
