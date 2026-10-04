/**
 * Local proof for the authenticated persisted-assessment inspection path.
 * No database. No recommendation engine. No Opportunity or programme writes.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { emptyOpportunityAssessmentFacts, missingAssessmentFact } from "@/lib/opportunity-assessment/empty-facts";
import type { AssessmentFact, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import {
  MemoryOpportunityAssessmentRepository,
  createEmptyOpportunityAssessmentStore,
  type OpportunityAssessmentStore,
} from "@server/repositories/opportunity-assessment/memory-repository";
import { createOpportunityAssessmentService } from "@server/services/opportunity-assessment/runtime";
import { inspectPersistedAssessmentForOpportunityNumber } from "@server/services/opportunity-assessment/persisted-assessment-inspection-http";
import { ASSESSMENT_REVISION_ENVELOPE_VERSION } from "@server/services/opportunity-assessment/types";
import type {
  OpportunityAssessmentRecommendationRunRecord,
  OpportunityAssessmentRecord,
  OpportunityAssessmentRevisionRecord,
} from "@server/services/opportunity-assessment/types";

const ORG = "org-inspection";
const OTHER_ORG = "org-other";
const OPPORTUNITY_ID = "opp-internal-137";
const OPPORTUNITY_NUMBER = "OPP-2026-000137";

function known<T>(value: T): AssessmentFact<T> {
  return { ...missingAssessmentFact<T>(), value, state: "known" };
}

function facts(): OpportunityAssessmentFactsV1 {
  const row = emptyOpportunityAssessmentFacts();
  row.loanRequirement.productCode = known("HOME_LOAN");
  row.loanRequirement.requestedAmount = known("10000000.00");
  return row;
}

const fingerprint = {
  opportunityRowVersion: 10,
  contactUpdatedAt: null,
  companyUpdatedAt: null,
  compassAssessmentUpdatedAt: null,
};

function seed(store: OpportunityAssessmentStore) {
  const storedFacts = facts();
  const assessment: OpportunityAssessmentRecord = {
    id: "assessment-137",
    organizationId: ORG,
    opportunityId: OPPORTUNITY_ID,
    currentRevisionId: "revision-137",
    draftFactsJson: storedFacts,
    sourceFingerprintJson: fingerprint,
    readinessStatus: "ready",
    unsupportedReasonCode: null,
    selectedContributorParticipantRef: null,
    rowVersion: 4,
    createdByUserId: "admin-1",
    updatedByUserId: "admin-1",
    updatedChannel: "C1",
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-01T08:36:43.213Z",
  };
  const revision: OpportunityAssessmentRevisionRecord = {
    id: "revision-137",
    organizationId: ORG,
    opportunityId: OPPORTUNITY_ID,
    assessmentId: assessment.id,
    revisionNumber: 2,
    factsJson: storedFacts,
    normalizedInputJson: {
      schemaVersion: ASSESSMENT_REVISION_ENVELOPE_VERSION,
      normalizedInputVersion: null,
      normalizedInput: null,
    },
    sourceFingerprintJson: fingerprint,
    factsSchemaVersion: storedFacts.schemaVersion,
    mapperVersion: "opportunity-assessment-mapper.v1",
    readinessStatus: "ready",
    revisionKind: "FINALIZED",
    commandId: "command-137",
    commandHash: "command-hash-137",
    contentHash: "hash-137",
    finalizedAt: "2026-10-01T08:30:00.000Z",
    finalizedByUserId: "admin-1",
    finalizedChannel: "C1",
    supersededAt: null,
  };
  const run: OpportunityAssessmentRecommendationRunRecord = {
    id: "run-137",
    organizationId: ORG,
    opportunityId: OPPORTUNITY_ID,
    assessmentId: assessment.id,
    revisionId: revision.id,
    requestHash: "request-137",
    assessedAt: "2026-10-01T08:40:00.000Z",
    asOf: "2026-10-01T08:40:00.000Z",
    mapperVersion: "opportunity-assessment-mapper.v1",
    calculationVersion: "calc-v1",
    factsSchemaVersion: storedFacts.schemaVersion,
    resultStatus: "no_eligible_programmes",
    missingInputCodes: [],
    rejectedProgrammeCodesJson: [{ programmeId: "programme-stored", reason: "ELIGIBILITY_NOT_MET" }],
    acceptedProgrammeIdsJson: [],
    cibilNotKnownDisclaimer: false,
    failureCode: null,
  };
  store.assessments.set(assessment.id, assessment);
  store.assessmentsByOpportunity.set(`${ORG}:${OPPORTUNITY_ID}`, assessment.id);
  store.revisions.set(revision.id, revision);
  store.runs.set(run.id, run);
  return { storedFacts, run };
}

function snapshot(store: OpportunityAssessmentStore) {
  return JSON.stringify({
    assessments: [...store.assessments.entries()],
    links: [...store.assessmentsByOpportunity.entries()],
    revisions: [...store.revisions.entries()],
    runs: [...store.runs.entries()],
  });
}

function guarded(store: OpportunityAssessmentStore, writes: Record<string, number>) {
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

function opportunityRow(organizationId: string) {
  return {
    id: OPPORTUNITY_ID,
    organizationId,
    opportunityNumber: OPPORTUNITY_NUMBER,
    productCode: "HOME_LOAN",
    productLabel: "Home Loan",
    requestedAmount: "10000000.00",
    rowVersion: 10,
    updatedAt: "2026-10-01T08:36:43.213Z",
  };
}

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

export async function runPersistedAssessmentInspectionRouteProof() {
  const writes = {
    getOrCreateAssessment: 0,
    insertRevision: 0,
    insertRun: 0,
    advanceAssessmentCursor: 0,
    completeRun: 0,
    transaction: 0,
    opportunityUpdate: 0,
    programmeWrite: 0,
  };
  const store = createEmptyOpportunityAssessmentStore();
  const seeded = seed(store);
  const before = snapshot(store);
  const service = createOpportunityAssessmentService({ repository: guarded(store, writes) });
  const lookups: string[] = [];
  const findOpportunityByNumber = async (organizationId: string, opportunityNumber: string) => {
    lookups.push(`${organizationId}:${opportunityNumber}`);
    if (organizationId === ORG && opportunityNumber === OPPORTUNITY_NUMBER) return opportunityRow(ORG);
    if (organizationId === OTHER_ORG && opportunityNumber === OPPORTUNITY_NUMBER) return opportunityRow(OTHER_ORG);
    return null;
  };

  const found = await inspectPersistedAssessmentForOpportunityNumber({
    role: "SUPER_ADMIN",
    organizationId: ORG,
    actorUserId: "admin-1",
    opportunityNumber: OPPORTUNITY_NUMBER,
    findOpportunityByNumber,
    service,
  });
  assert.equal(found.status, 200);
  if (found.status !== 200) return;
  assert.equal(found.body.data.status, "PERSISTED_ASSESSMENT");
  if (found.body.data.status !== "PERSISTED_ASSESSMENT") return;
  assert.equal(found.body.data.opportunity.id, OPPORTUNITY_ID);
  assert.equal(found.body.data.opportunity.opportunityNumber, OPPORTUNITY_NUMBER);
  assert.equal(found.body.data.opportunity.productCode, "HOME_LOAN");
  assert.equal(found.body.data.opportunity.productLabel, "Home Loan");
  assert.equal(found.body.data.opportunity.requestedAmount, "10000000.00");
  assert.equal(found.body.data.opportunity.rowVersion, 10);
  assert.equal(found.body.data.assessment.assessmentId, "assessment-137");
  assert.equal(found.body.data.assessment.currentRevisionId, "revision-137");
  assert.equal(found.body.data.assessment.rowVersion, 4);
  assert.equal(found.body.data.revisions[0]?.contentHash, "hash-137");
  assert.equal(found.body.data.revisions[0]?.finalizedAt, "2026-10-01T08:30:00.000Z");
  assert.deepEqual(found.body.data.revisions[0]?.factsJson, seeded.storedFacts);
  assert.equal(found.body.data.revisions[0]?.facts.requestedAmount.value, "10000000.00");
  assert.deepEqual(found.body.data.recommendationRuns, [
    {
      runId: "run-137",
      revisionId: "revision-137",
      assessedAt: "2026-10-01T08:40:00.000Z",
      resultStatus: "no_eligible_programmes",
      acceptedProgrammeIdsJson: [],
      rejectedProgrammeCodesJson: seeded.run.rejectedProgrammeCodesJson,
    },
  ]);
  assert.equal(snapshot(store), before);

  const repeated = await inspectPersistedAssessmentForOpportunityNumber({
    role: "ADMIN",
    organizationId: ORG,
    actorUserId: "admin-1",
    opportunityNumber: `  ${OPPORTUNITY_NUMBER}  `,
    findOpportunityByNumber,
    service,
  });
  assert.deepEqual(repeated, found);
  assert.equal(snapshot(store), before);
  assert.deepEqual(writes, {
    getOrCreateAssessment: 0,
    insertRevision: 0,
    insertRun: 0,
    advanceAssessmentCursor: 0,
    completeRun: 0,
    transaction: 0,
    opportunityUpdate: 0,
    programmeWrite: 0,
  });

  const emptyStore = createEmptyOpportunityAssessmentStore();
  const emptyBefore = snapshot(emptyStore);
  const emptyService = createOpportunityAssessmentService({ repository: guarded(emptyStore, writes) });
  const absentAssessment = await inspectPersistedAssessmentForOpportunityNumber({
    role: "ADMIN",
    organizationId: ORG,
    actorUserId: "admin-1",
    opportunityNumber: OPPORTUNITY_NUMBER,
    findOpportunityByNumber,
    service: emptyService,
  });
  assert.equal(absentAssessment.status, 200);
  if (absentAssessment.status === 200) {
    assert.equal(absentAssessment.body.data.status, "NO_PERSISTED_ASSESSMENT");
    assert.equal(absentAssessment.body.data.assessment, null);
    assert.deepEqual(absentAssessment.body.data.revisions, []);
    assert.deepEqual(absentAssessment.body.data.recommendationRuns, []);
  }
  assert.equal(snapshot(emptyStore), emptyBefore);

  const missing = await inspectPersistedAssessmentForOpportunityNumber({
    role: "ADMIN",
    organizationId: ORG,
    actorUserId: "admin-1",
    opportunityNumber: "OPP-2026-000999",
    findOpportunityByNumber,
    service,
  });
  assert.equal(missing.status, 404);
  if (missing.status === 404) {
    assert.equal(missing.body.error.code, "OPPORTUNITY_NOT_FOUND");
    assert.equal(JSON.stringify(missing.body).includes("10000000.00"), false);
    assert.equal(JSON.stringify(missing.body).includes("assessment-137"), false);
  }

  const crossOrg = await inspectPersistedAssessmentForOpportunityNumber({
    role: "SUPER_ADMIN",
    organizationId: ORG,
    actorUserId: "admin-1",
    opportunityNumber: "OPP-OTHER-000001",
    findOpportunityByNumber: async (organizationId, opportunityNumber) => {
      if (opportunityNumber === "OPP-OTHER-000001" && organizationId === OTHER_ORG) {
        return {
          ...opportunityRow(OTHER_ORG),
          id: "opp-secret",
          opportunityNumber: "OPP-OTHER-000001",
          productCode: "SECRET_PRODUCT",
          requestedAmount: "777.00",
        };
      }
      return null;
    },
    service,
  });
  assert.equal(crossOrg.status, 404);
  assert.equal(JSON.stringify(crossOrg.body).includes("SECRET_PRODUCT"), false);
  assert.equal(JSON.stringify(crossOrg.body).includes("777.00"), false);
  assert.equal(JSON.stringify(crossOrg.body).includes("opp-secret"), false);

  const employee = await inspectPersistedAssessmentForOpportunityNumber({
    role: "USER",
    organizationId: ORG,
    actorUserId: "employee-1",
    opportunityNumber: OPPORTUNITY_NUMBER,
    findOpportunityByNumber: async () => {
      throw new Error("LOOKUP_FORBIDDEN");
    },
    service,
  });
  assert.equal(employee.status, 403);
  if (employee.status === 403) assert.equal(employee.body.error.code, "FORBIDDEN");

  const blankOrg = await inspectPersistedAssessmentForOpportunityNumber({
    role: "ADMIN",
    organizationId: "   ",
    actorUserId: "admin-1",
    opportunityNumber: OPPORTUNITY_NUMBER,
    findOpportunityByNumber: async () => {
      throw new Error("LOOKUP_FORBIDDEN");
    },
    service,
  });
  assert.equal(blankOrg.status, 403);
  if (blankOrg.status === 403) assert.equal(blankOrg.body.error.code, "ORGANIZATION_CONTEXT_REQUIRED");
  assert.equal(snapshot(store), before);

  const internalId = await inspectPersistedAssessmentForOpportunityNumber({
    role: "ADMIN",
    organizationId: ORG,
    actorUserId: "admin-1",
    opportunityNumber: OPPORTUNITY_ID,
    findOpportunityByNumber,
    service,
  });
  assert.equal(internalId.status, 404);

  const { GET } = await import(
    "../../app/api/admin/chanakya/persisted-assessment-inspection/[opportunityNumber]/route"
  );
  const unauthenticated = await GET(
    new Request("http://internal.test/api/admin/chanakya/persisted-assessment-inspection/OPP-2026-000137"),
    { params: Promise.resolve({ opportunityNumber: OPPORTUNITY_NUMBER }) },
  );
  assert.equal(unauthenticated.status, 401);
  const unauthenticatedBody = await unauthenticated.json();
  assert.equal(unauthenticatedBody.success, false);
  assert.equal(unauthenticatedBody.error.code, "UNAUTHORIZED");
  assert.equal(JSON.stringify(unauthenticatedBody).includes("10000000.00"), false);
  assert.equal(JSON.stringify(unauthenticatedBody).includes(OPPORTUNITY_ID), false);

  const route = source(
    "src/app/api/admin/chanakya/persisted-assessment-inspection/[opportunityNumber]/route.ts",
  );
  const routeHandler = route.slice(route.indexOf("export async function GET"));
  const handler = source("server/services/opportunity-assessment/persisted-assessment-inspection-http.ts");
  const navigation = source("src/config/navigation.ts");
  const existingAssessmentRoute = source(
    "src/app/api/enterprise-opportunities/[opportunityId]/opportunity-assessment/route.ts",
  );
  for (const text of [routeHandler, handler]) {
    assert.equal(text.includes("getOrCreateAssessment"), false);
    assert.equal(text.includes("recommendLendersCanonical"), false);
    assert.equal(text.includes("evaluateCanonicalEligibility"), false);
    assert.equal(text.includes("insertRevision"), false);
    assert.equal(text.includes("insertRun"), false);
    assert.equal(text.includes("advanceAssessmentCursor"), false);
    assert.equal(text.includes("completeRun"), false);
    assert.equal(text.includes("updateOpportunity"), false);
    assert.equal(text.includes("enterpriseLenderProgram"), false);
    assert.equal(text.includes("export async function POST"), false);
    assert.equal(text.includes("export async function PATCH"), false);
    assert.equal(text.includes("export async function PUT"), false);
  }
  assert.ok(routeHandler.indexOf("requireAccessToken") < routeHandler.indexOf("resolvePilotOrganizationId"));
  assert.ok(routeHandler.indexOf("isChanakyaInspectionAdministrator") < routeHandler.indexOf("resolvePilotOrganizationId"));
  assert.ok(routeHandler.indexOf("ORGANIZATION_CONTEXT_REJECTED") < routeHandler.indexOf("resolvePilotOrganizationId"));
  assert.equal(routeHandler.includes("findByNumber"), true);
  assert.equal(routeHandler.includes("findById"), false);
  assert.equal(routeHandler.includes("inspectPersistedAssessmentForOpportunityNumber"), true);
  assert.equal(existingAssessmentRoute.includes("inspectPersistedAssessmentForOpportunityNumber"), false);
  assert.equal(existingAssessmentRoute.includes("getOpportunityAssessmentCapture"), true);
  assert.equal(navigation.includes("persisted-assessment-inspection"), false);
  assert.equal(handler.includes("inspectPersistedAssessment"), true);
}
