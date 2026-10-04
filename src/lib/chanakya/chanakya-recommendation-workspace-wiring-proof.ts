/**
 * Runtime wiring proof for CHANAKYA Recommendation.
 * Resolves the Opportunity client binding the workspace actually imports,
 * then calls getOpportunity. A missing export throws
 * TypeError: Cannot read properties of undefined (reading 'getOpportunity').
 * No database. No production access.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { putSessionOpportunity, invalidateSessionOpportunity } from "@/lib/enterprise-session/opportunity-runtime-cache";
import {
  chanakyaContextIdentityFromOpportunity,
  formatChanakyaOpportunityContextLine,
} from "@/lib/chanakya/opportunity-context-line";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import * as opportunityClient from "@/lib/enterprise-opportunity/opportunity-api-client";
import { MemoryOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/memory-repository";
import {
  buildCanonicalAssessmentSnapshot,
  type CanonicalAssessmentSources,
} from "@server/services/opportunity-assessment/canonical-snapshot";
import { projectChanakyaRecommendationWorkspace } from "@server/services/opportunity-assessment/chanakya-workspace";
import { projectPersistedAssessmentInspection } from "@server/services/opportunity-assessment/persisted-assessment-inspection";
import { createOpportunityAssessmentService } from "@server/services/opportunity-assessment/runtime";
import type {
  OpportunityAssessmentActorContext,
  OpportunityAssessmentRecommendationRunRecord,
} from "@server/services/opportunity-assessment/types";
import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OPPORTUNITY_ID = "cmupfu3yu003f54hs7tqi0q13";
const ACTOR: OpportunityAssessmentActorContext = {
  organizationId: "org-1",
  actorUserId: "user-1",
  channel: "C1",
};

type OpportunityClient = {
  getOpportunity: (opportunityId: string) => Promise<EnterpriseOpportunityApiRecord>;
};

function workspaceClientBinding(): OpportunityClient {
  const source = readFileSync(
    path.join(root, "src/components/catalyst-one/chanakya/chanakya-recommendation-workspace.tsx"),
    "utf8",
  );
  const match = source.match(
    /import\s*\{([^}]+)\}\s*from\s*"@\/lib\/enterprise-opportunity\/opportunity-api-client"/,
  );
  if (!match?.[1]) throw new Error("CHANAKYA workspace does not import the Opportunity client");
  const imported = match[1].split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
    const [original, alias] = part.split(/\s+as\s+/);
    return { original: original?.trim() ?? "", local: (alias ?? original)?.trim() ?? "" };
  });
  const used = imported.find((item) => new RegExp(`${item.local}\\s*\\.getOpportunity`).test(source));
  if (!used?.original) throw new Error("CHANAKYA workspace does not call the Opportunity client getOpportunity");
  const binding = (opportunityClient as unknown as Record<string, OpportunityClient | undefined>)[used.original];
  if (typeof binding?.getOpportunity !== "function") {
    throw new TypeError("Cannot read properties of undefined (reading 'getOpportunity')");
  }
  return binding;
}

function opportunityRecord(): EnterpriseOpportunityApiRecord {
  return {
    id: OPPORTUNITY_ID,
    opportunityNumber: "OPP-2026-000139",
    primaryBorrowerKind: "individual",
    primaryContactId: "contact-139",
    primaryContactName: "Proof Borrower",
    productFamily: "lending",
    productCode: "HOME_LOAN",
    productLabel: "Home Loan",
    requirementStage: "requirement_captured",
    requestedAmount: 10000000,
    borrowerLegalConstitution: null,
  };
}

function sources(extra: Partial<CanonicalAssessmentSources> = {}): CanonicalAssessmentSources {
  return {
    opportunityId: "opp-constitution-missing",
    productCode: "HOME_LOAN",
    transactionType: "fresh",
    employmentTypeCode: "salaried",
    requestedAmount: 10000000,
    requestedTenureMonths: 240,
    monthlyIncomeRupees: 250000,
    existingMonthlyObligationsRupees: 10000,
    propertyValueRupees: 25000000,
    propertyCategory: "residential",
    constructionStatus: "ready",
    residency: "resident",
    cityLabel: "mumbai",
    stateLabel: "MH",
    borrowerAgeYears: 36,
    approxCibilScore: "750_799",
    rowVersion: 13,
    ...extra,
  };
}

function programmeRow() {
  return {
    id: "prog-HOME_LOAN",
    organizationId: "org-1",
    lenderId: "lender-facts",
    productCode: "HOME_LOAN",
    code: "HOME_LOAN",
    label: "HOME_LOAN",
    versionNumber: 1,
    transactionTypes: null,
    policyVersionId: "version-HOME_LOAN",
    policyVersion: {
      id: "version-HOME_LOAN",
      organizationId: "org-1",
      policyId: "policy-HOME_LOAN",
      versionNumber: 1,
      status: "published",
      eligibilityRules: {},
      creditRules: {},
      effectiveFrom: null,
      effectiveUntil: null,
      policy: {
        id: "policy-HOME_LOAN",
        organizationId: "org-1",
        lenderId: "lender-facts",
        productCode: "HOME_LOAN",
        status: "published",
        currentPublishedVersionId: "version-HOME_LOAN",
        isDeleted: false,
      },
    },
    lender: {
      displayName: "Fact Lender",
      label: "HOME_LOAN",
      code: "HOME_LOAN",
      organizationId: "org-1",
      enabled: true,
      isDeleted: false,
      lifecycleStatus: "active",
      operationalStatus: "active",
      effectiveFrom: null,
      effectiveUntil: null,
    },
    isDeleted: false,
    enabled: true,
    isLivePublished: true,
    publicationState: "published",
    completenessState: "complete",
    lifecycleStatus: "active",
    status: "active",
    approvalStatus: "approved",
    effectiveFrom: null,
    effectiveUntil: null,
    legalConstitutions: ["individual"],
    maxFoirExact: "60",
    minRoiExact: "8.5",
  };
}

function blockedResult(): CanonicalLenderRecommendationResult {
  return {
    status: "ready",
    product: "HOME_LOAN",
    readOnly: true,
    recommendations: [],
    rejectedProgrammes: [],
    retrievedProgrammeCount: 1,
    evaluatedProgrammeCount: 1,
    versions: { lenderScoreVersion: null } as CanonicalLenderRecommendationResult["versions"],
    analyzedAt: "2026-10-01T00:00:00.000Z",
  };
}

function historicalRun(
  id: string,
  rejected: OpportunityAssessmentRecommendationRunRecord["rejectedProgrammeCodesJson"],
): OpportunityAssessmentRecommendationRunRecord {
  return {
    id,
    organizationId: "org-1",
    opportunityId: "opp-historical",
    assessmentId: "historical-assessment",
    revisionId: "0424f9a0-2cf0-4634-a38a-df496cbd4bfe",
    requestHash: `hash-${id}`,
    assessedAt: "2026-10-01T11:19:19.730Z",
    asOf: "2026-10-01T11:19:19.730Z",
    mapperVersion: "opportunity-assessment-mapper.v1",
    calculationVersion: "pending",
    factsSchemaVersion: "opportunity-assessment-facts.v1",
    resultStatus: "no_eligible_programmes",
    missingInputCodes: [],
    rejectedProgrammeCodesJson: rejected,
    acceptedProgrammeIdsJson: [],
    cibilNotKnownDisclaimer: false,
    failureCode: null,
  };
}

export async function runChanakyaRecommendationWorkspaceWiringProof() {
  const client = workspaceClientBinding();
  const record = opportunityRecord();
  putSessionOpportunity(record);
  try {
    const loaded = await client.getOpportunity(OPPORTUNITY_ID);
    assert.equal(loaded.borrowerLegalConstitution ?? null, null);
    assert.equal(loaded.opportunityNumber, "OPP-2026-000139");
    const line = formatChanakyaOpportunityContextLine(chanakyaContextIdentityFromOpportunity(loaded));
    assert.equal(line, "Proof Borrower · OPP-2026-000139 · Home Loan · ₹1,00,00,000");
    assert.equal(line.includes("individual"), false);
  } finally {
    invalidateSessionOpportunity(OPPORTUNITY_ID);
  }

  const repository = new MemoryOpportunityAssessmentRepository();
  const service = createOpportunityAssessmentService({ repository });
  let recommended = false;
  const opened = await projectChanakyaRecommendationWorkspace(
    service,
    ACTOR,
    sources(),
    {
      loadInventory: async () => ({
        programmes: [programmeRow()],
        lenderCategories: new Map([["lender-facts", "A" as const]]),
      }),
      recommend: async () => {
        recommended = true;
        return blockedResult();
      },
    },
  );
  assert.equal(opened.workspaceState, "INFORMATION_REQUIRED");
  assert.equal(opened.panel, "information_required");
  assert.equal(opened.failureCode, null);
  assert.ok(opened.missingFactKeys.includes("borrower.constitution"));
  assert.ok(opened.missingLabels.includes("Legal Constitution"));
  assert.equal(opened.recommendationExecuted, false);
  assert.equal(recommended, false);
  const assessmentId = opened.assessmentId ?? "";
  assert.ok(assessmentId);
  assert.equal((await service.listRecommendationRuns(ACTOR, assessmentId)).length, 0);

  await repository.insertRun(historicalRun("legacy-run", [
    { programmeId: "programme-legacy", reason: "ELIGIBILITY_NOT_MET" },
  ]));
  await repository.insertRun(historicalRun("traced-run", [
    {
      programmeId: "programme-traced",
      reason: "ELIGIBILITY_NOT_MET",
      criteria: [{
        criterion: "monthlyIncome",
        applicantValue: 250000,
        requirement: 100000,
        outcome: "FAIL",
        reasonCode: "INCOME_OUTSIDE_RANGE",
      }],
    },
  ]));
  const stored = await repository.listRuns("org-1", "historical-assessment");
  const inspected = projectPersistedAssessmentInspection({
    opportunityId: "opp-historical",
    assessment: {
      id: "historical-assessment",
      organizationId: "org-1",
      opportunityId: "opp-historical",
      currentRevisionId: null,
      draftFactsJson: buildCanonicalAssessmentSnapshot(sources()),
      sourceFingerprintJson: {
        opportunityRowVersion: 13,
        contactUpdatedAt: null,
        companyUpdatedAt: null,
        compassAssessmentUpdatedAt: null,
      },
      readinessStatus: "ready",
      unsupportedReasonCode: null,
      selectedContributorParticipantRef: null,
      rowVersion: 1,
      createdByUserId: "user-1",
      updatedByUserId: "user-1",
      updatedChannel: "C1",
      createdAt: "2026-10-01T11:19:16.549Z",
      updatedAt: "2026-10-01T11:19:16.549Z",
    },
    revisions: [],
    runs: stored,
  });
  const legacy = inspected.recommendationRuns.find((run) => run.runId === "legacy-run");
  const traced = inspected.recommendationRuns.find((run) => run.runId === "traced-run");
  assert.equal(legacy?.rejectedProgrammeCodesJson[0]?.reason, "ELIGIBILITY_NOT_MET");
  assert.equal(legacy?.rejectedProgrammeCodesJson[0]?.criteria, undefined);
  assert.equal(traced?.rejectedProgrammeCodesJson[0]?.criteria?.[0]?.criterion, "monthlyIncome");
  assert.equal(traced?.rejectedProgrammeCodesJson[0]?.criteria?.[0]?.outcome, "FAIL");
  assert.equal((await service.listRecommendationRuns(ACTOR, assessmentId)).length, 0);
}
