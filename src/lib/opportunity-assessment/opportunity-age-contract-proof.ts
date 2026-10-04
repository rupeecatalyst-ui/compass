/**
 * Opportunity age contract proof.
 * No database. No production access. No DOB derivation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptyLeadInformationForm } from "@/constants/lead-information-workspace";
import { buildLeadInformationPatchBody, formFromOpportunity } from "@/lib/lead-information/form-helpers";
import {
  canonicalFactsForLeadInformation,
  parseCanonicalRecommendationFactBody,
} from "@/lib/lead-information/canonical-recommendation-facts";
import { ageYearsToMonths, resolveEffectiveAvailableTenureMonths } from "@/lib/product-recommendation/home-loan-inputs";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";
import { MemoryOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/memory-repository";
import { evaluateCanonicalEligibility } from "@server/services/lender-recommendation/canonical-governed-eligibility";
import { mapCanonicalProgramme } from "@server/services/lender-recommendation/programme-assessment-adapter";
import {
  buildCanonicalAssessmentSnapshot,
  canonicalSnapshotSignature,
  type CanonicalAssessmentSources,
} from "@server/services/opportunity-assessment/canonical-snapshot";
import { projectChanakyaRecommendationWorkspace } from "@server/services/opportunity-assessment/chanakya-workspace";
import { mapFinalizedAssessmentFactsToCanonical } from "@server/services/opportunity-assessment/map-to-canonical";
import { collectProgrammeFactNeeds } from "@server/services/opportunity-assessment/programme-fact-needs";
import { persistCanonicalAssessmentSnapshot } from "@server/services/opportunity-assessment/persist-canonical-snapshot";
import { createOpportunityAssessmentService } from "@server/services/opportunity-assessment/runtime";
import type { OpportunityAssessmentActorContext } from "@server/services/opportunity-assessment/types";
import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ACTOR: OpportunityAssessmentActorContext = {
  organizationId: "org-1",
  actorUserId: "user-1",
  channel: "C1",
};
const AS_OF = new Date("2026-09-30T00:00:00.000Z");

function form(age: string) {
  return { ...emptyLeadInformationForm(), productCode: "HOME_LOAN", borrowerAgeYears: age };
}

function sources(extra: Partial<CanonicalAssessmentSources> = {}): CanonicalAssessmentSources {
  return {
    opportunityId: "opp-age",
    productCode: "HOME_LOAN",
    transactionType: "fresh",
    employmentTypeCode: "salaried",
    requestedAmount: 5000000,
    requestedTenureMonths: 240,
    monthlyIncomeRupees: 500000,
    existingMonthlyObligationsRupees: 0,
    propertyValueRupees: 8000000,
    propertyCategory: "residential",
    constructionStatus: "ready",
    residency: "resident",
    cityLabel: "Mumbai",
    stateLabel: "Maharashtra",
    dateOfBirth: "1990-01-15",
    contactId: "contact-1",
    approxCibilScore: "750_799",
    rowVersion: 1,
    ...extra,
  };
}

function programme(patch: Record<string, unknown> = {}) {
  return mapCanonicalProgramme({
    product: "HOME_LOAN",
    lenderCategory: "A",
    asOf: AS_OF,
    row: {
      id: "age-prog",
      organizationId: "org-1",
      lenderId: "lender-age",
      productCode: "HOME_LOAN",
      code: "age",
      label: "age",
      versionNumber: 1,
      transactionTypes: null,
      policyVersionId: "version-age",
      policyVersion: {
        id: "version-age",
        organizationId: "org-1",
        policyId: "policy-age",
        versionNumber: 1,
        status: "published",
        eligibilityRules: {},
        creditRules: {},
        effectiveFrom: null,
        effectiveUntil: null,
        policy: {
          id: "policy-age",
          organizationId: "org-1",
          lenderId: "lender-age",
          productCode: "HOME_LOAN",
          status: "published",
          currentPublishedVersionId: "version-age",
          isDeleted: false,
        },
      },
      lender: {
        displayName: "Age Lender",
        label: "age",
        code: "age",
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
      residencyEligibility: ["resident"],
      minCibil: 750,
      maxCibil: 900,
      minAge: 21,
      maxAge: 65,
      maxFoirExact: "60",
      minRoiExact: "8.5",
      policyAssessmentJson: { maxAgeAtMaturityYears: 70 },
      ...patch,
    },
  });
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
    analyzedAt: AS_OF.toISOString(),
  };
}

export async function runOpportunityAgeContractProof() {
  const blank = canonicalFactsForLeadInformation(form(""));
  assert.equal(blank.ok, true);
  if (blank.ok) assert.equal(blank.facts.borrowerAgeYears, null);
  for (const value of ["1", "47", "120"]) {
    const parsed = canonicalFactsForLeadInformation(form(value));
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.facts.borrowerAgeYears, Number(value));
  }
  for (const value of ["0", "121", "-1", "47.5", "forty"]) {
    const parsed = canonicalFactsForLeadInformation(form(value));
    assert.equal(parsed.ok, false);
  }

  const saved = buildLeadInformationPatchBody(form("47"), 3);
  const continued = buildLeadInformationPatchBody(form("47"), 3);
  assert.equal(saved.borrowerAgeYears, 47);
  assert.equal(continued.borrowerAgeYears, 47);
  assert.equal(JSON.stringify(saved.borrowerAgeYears), JSON.stringify(continued.borrowerAgeYears));
  const reopened = formFromOpportunity({
    productCode: "HOME_LOAN",
    borrowerAgeYears: 47,
    lendingExtension: null,
  } as EnterpriseOpportunityApiRecord);
  assert.equal(reopened.borrowerAgeYears, "47");

  const withoutAge = buildCanonicalAssessmentSnapshot(sources());
  assert.equal(withoutAge.borrower.ageYears.state, "missing");
  assert.equal(withoutAge.borrower.dateOfBirth.value, "1990-01-15");
  assert.equal(withoutAge.borrower.dateOfBirth.sourceEntityType, "EcmContact");
  const withAge = buildCanonicalAssessmentSnapshot(sources({ borrowerAgeYears: 47 }));
  assert.equal(withAge.borrower.ageYears.value, 47);
  assert.equal(withAge.borrower.ageYears.sourceEntityType, "EnterpriseOpportunity");
  assert.equal(withAge.borrower.dateOfBirth.value, "1990-01-15");
  const mapped = mapFinalizedAssessmentFactsToCanonical(withAge);
  assert.equal(mapped.customer.ageYears, 47);
  assert.equal(mapFinalizedAssessmentFactsToCanonical(withoutAge).customer.ageYears, null);

  const agedProgramme = programme();
  const missingAge = evaluateCanonicalEligibility(agedProgramme, mapFinalizedAssessmentFactsToCanonical(withoutAge).customer, AS_OF);
  assert.equal(missingAge?.reason, "ASSESSMENT_INPUT_REQUIRED");
  assert.equal(missingAge?.missingInputs.includes("age"), true);
  assert.equal(missingAge?.missingInputs.includes("dateOfBirth"), false);
  const accepted = evaluateCanonicalEligibility(agedProgramme, mapped.customer, AS_OF);
  assert.equal(accepted?.missingInputs?.includes("age") ?? false, false);
  const tooYoung = evaluateCanonicalEligibility(
    agedProgramme,
    mapFinalizedAssessmentFactsToCanonical(buildCanonicalAssessmentSnapshot(sources({ borrowerAgeYears: 15 }))).customer,
    AS_OF,
  );
  assert.equal(tooYoung?.reason, "ELIGIBILITY_NOT_MET");
  const tooOld = evaluateCanonicalEligibility(
    agedProgramme,
    mapFinalizedAssessmentFactsToCanonical(buildCanonicalAssessmentSnapshot(sources({ borrowerAgeYears: 80 }))).customer,
    AS_OF,
  );
  assert.equal(tooOld?.reason, "ELIGIBILITY_NOT_MET");

  const tenure = resolveEffectiveAvailableTenureMonths({
    ageYears: 47,
    maxAgeAtMaturityYears: 70,
    programmeMaxTenureMonths: 360,
  });
  assert.equal(ageYearsToMonths(47), 47 * 12);
  assert.equal(tenure.agePermittedTenureMonths, 70 * 12 - 47 * 12);
  assert.equal(tenure.effectiveAvailableTenureMonths, 70 * 12 - 47 * 12);

  const noRule = collectProgrammeFactNeeds([programme({ minAge: null, maxAge: null, policyAssessmentJson: {} })], mapped.customer);
  assert.equal(noRule.askPaths.includes("borrower.ageYears"), false);
  const askAge = collectProgrammeFactNeeds([programme()], mapFinalizedAssessmentFactsToCanonical(withoutAge).customer);
  assert.equal(askAge.askPaths.includes("borrower.ageYears"), true);

  const repository = new MemoryOpportunityAssessmentRepository();
  const service = createOpportunityAssessmentService({ repository });
  const first = await persistCanonicalAssessmentSnapshot(service, ACTOR, sources({ borrowerAgeYears: null }));
  const firstRevision = await repository.getRevision(ACTOR.organizationId, first.revisionId!);
  const firstSignature = canonicalSnapshotSignature(firstRevision.factsJson);
  assert.equal(firstRevision.factsJson.borrower.ageYears.state, "missing");
  const second = await persistCanonicalAssessmentSnapshot(service, ACTOR, sources({ borrowerAgeYears: 47, rowVersion: 2 }));
  assert.notEqual(second.revisionId, first.revisionId);
  const preserved = await repository.getRevision(ACTOR.organizationId, first.revisionId!);
  assert.equal(canonicalSnapshotSignature(preserved.factsJson), firstSignature);
  assert.equal(preserved.factsJson.borrower.ageYears.state, "missing");

  let seenAge: number | null | undefined = undefined;
  const asked = await projectChanakyaRecommendationWorkspace(service, ACTOR, sources({ opportunityId: "opp-ask-age" }), {
    loadInventory: async () => ({
      programmes: [inventoryRow()],
      lenderCategories: new Map([["lender-age", "A" as const]]),
    }),
    recommend: async () => readyResult(),
  });
  assert.equal(asked.workspaceState, "INFORMATION_REQUIRED");
  assert.equal(asked.missingFactKeys.includes("borrower.ageYears"), true);
  assert.equal(asked.missingLabels.includes("Age"), true);
  assert.equal(asked.recommendationExecuted, false);
  const written = parseCanonicalRecommendationFactBody({ borrowerAgeYears: 47 }, "salaried");
  assert.equal(written.ok, true);
  if (!written.ok) throw new Error("age write");
  const rerun = await projectChanakyaRecommendationWorkspace(
    service,
    ACTOR,
    sources({ opportunityId: "opp-ask-age", borrowerAgeYears: written.patch.borrowerAgeYears, rowVersion: 4 }),
    {
      loadInventory: async () => ({
        programmes: [inventoryRow()],
        lenderCategories: new Map([["lender-age", "A" as const]]),
      }),
      recommend: async (request) => {
        seenAge = request.customer.ageYears;
        return readyResult();
      },
    },
  );
  assert.equal(seenAge, 47);
  assert.equal(rerun.workspaceState, "INFORMATION_COMPLETE");
  assert.equal(rerun.recommendationExecuted, true);
  assert.notEqual(rerun.revisionId, asked.revisionId);

  const migration = readFileSync(path.join(root, "prisma/migrations/20260930223000_opportunity_borrower_age_years/migration.sql"), "utf8");
  const sql = migration.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("--"));
  assert.deepEqual(sql, [
    "ALTER TABLE \"enterprise_opportunities\"",
    "ADD COLUMN \"borrower_age_years\" INTEGER;",
  ]);
  const scoring = readFileSync(path.join(root, "src/lib/product-recommendation/approved-scoring-contracts.ts"), "utf8");
  assert.equal(scoring.includes("borrowerAgeYears"), false);
  const engine = readFileSync(path.join(root, "src/lib/home-loan-recommendation/engine.ts"), "utf8");
  assert.equal(engine.includes("ageInMonthsFromDateOfBirth(customer.dateOfBirth"), false);
  assert.equal(engine.includes("Math.round(customer.ageYears * 12)"), true);

  console.log("OPPORTUNITY_AGE_CONTRACT_PROOF checks=45 failed=0");
}

function inventoryRow() {
  return {
    id: "age-prog",
    organizationId: "org-1",
    lenderId: "lender-age",
    productCode: "HOME_LOAN",
    code: "age",
    label: "age",
    versionNumber: 1,
    transactionTypes: null,
    policyVersionId: "version-age",
    policyVersion: {
      id: "version-age",
      organizationId: "org-1",
      policyId: "policy-age",
      versionNumber: 1,
      status: "published",
      eligibilityRules: {},
      creditRules: {},
      effectiveFrom: null,
      effectiveUntil: null,
      policy: {
        id: "policy-age",
        organizationId: "org-1",
        lenderId: "lender-age",
        productCode: "HOME_LOAN",
        status: "published",
        currentPublishedVersionId: "version-age",
        isDeleted: false,
      },
    },
    lender: {
      displayName: "Age Lender",
      label: "age",
      code: "age",
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
    residencyEligibility: ["resident"],
    minCibil: 750,
    maxCibil: 900,
    minAge: 21,
    maxAge: 65,
    maxFoirExact: "60",
    minRoiExact: "8.5",
    policyAssessmentJson: { maxAgeAtMaturityYears: 70 },
  };
}
