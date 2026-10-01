/**
 * Legal constitution canonical fact, DOB-filter age alignment, and unsupported-fact display.
 * No database. No production access.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emptyLeadInformationForm } from "@/constants/lead-information-workspace";
import { PROGRAMME_LEGAL_CONSTITUTIONS } from "@/constants/product-programme-operations/controlled-masters";
import { buildLeadInformationPatchBody, formFromOpportunity } from "@/lib/lead-information/form-helpers";
import {
  CANONICAL_LEGAL_CONSTITUTION_IDS,
  canonicalFactsForLeadInformation,
  parseCanonicalRecommendationFactBody,
} from "@/lib/lead-information/canonical-recommendation-facts";
import { CHANAKYA_FACT_INPUTS } from "@/lib/opportunity-assessment/chanakya-fact-inputs";
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
const APPROVED_IDS = [
  "individual",
  "proprietorship",
  "partnership",
  "llp",
  "opc",
  "private_limited",
  "public_limited",
  "huf",
  "trust",
  "society",
  "other_approved",
] as const;
const ACTOR: OpportunityAssessmentActorContext = {
  organizationId: "org-1",
  actorUserId: "user-1",
  channel: "C1",
};
const AS_OF = new Date("2026-10-01T00:00:00.000Z");

function form(constitution: string, employmentTypeCode = "salaried") {
  return {
    ...emptyLeadInformationForm(),
    productCode: "HOME_LOAN",
    employmentTypeCode,
    borrowerLegalConstitution: constitution,
  };
}

function sources(extra: Partial<CanonicalAssessmentSources> = {}): CanonicalAssessmentSources {
  return {
    opportunityId: "opp-constitution",
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
    borrowerAgeYears: 47,
    dateOfBirth: "1990-01-15",
    contactId: "contact-1",
    approxCibilScore: "750_799",
    rowVersion: 1,
    ...extra,
  };
}

function row(code: string, patch: Record<string, unknown> = {}) {
  return {
    id: `prog-${code}`,
    organizationId: "org-1",
    lenderId: "lender-constitution",
    productCode: "HOME_LOAN",
    code,
    label: code,
    versionNumber: 1,
    transactionTypes: null,
    policyVersionId: `version-${code}`,
    policyVersion: {
      id: `version-${code}`,
      organizationId: "org-1",
      policyId: `policy-${code}`,
      versionNumber: 1,
      status: "published",
      eligibilityRules: {},
      creditRules: {},
      effectiveFrom: null,
      effectiveUntil: null,
      policy: {
        id: `policy-${code}`,
        organizationId: "org-1",
        lenderId: "lender-constitution",
        productCode: "HOME_LOAN",
        status: "published",
        currentPublishedVersionId: `version-${code}`,
        isDeleted: false,
      },
    },
    lender: {
      displayName: "Constitution Lender",
      label: code,
      code,
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
    maxFoirExact: "60",
    minRoiExact: "8.5",
    residencyEligibility: ["resident"],
    ...patch,
  };
}

function mapped(code: string, patch: Record<string, unknown> = {}) {
  return mapCanonicalProgramme({
    row: row(code, patch),
    product: "HOME_LOAN",
    lenderCategory: "A",
    asOf: AS_OF,
  });
}

function customer(extra: Partial<CanonicalAssessmentSources> = {}) {
  return mapFinalizedAssessmentFactsToCanonical(buildCanonicalAssessmentSnapshot(sources(extra))).customer;
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

function dobFilter() {
  return {
    additionalEligibilityFilters: {
      version: 1 as const,
      root: {
        kind: "group" as const,
        id: "dob",
        combinator: "AND" as const,
        children: [{
          kind: "predicate" as const,
          id: "dob-leaf",
          fieldId: "borrower.dateOfBirth",
          operator: "IS_NOT_EMPTY" as const,
        }],
      },
    },
  };
}

export async function runLegalConstitutionContractProof() {
  assert.deepEqual(PROGRAMME_LEGAL_CONSTITUTIONS.map((item) => item.id), [...APPROVED_IDS]);
  assert.deepEqual([...CANONICAL_LEGAL_CONSTITUTION_IDS], [...APPROVED_IDS]);
  const selector = CHANAKYA_FACT_INPUTS["borrower.constitution"];
  assert.equal(selector?.label, "Legal Constitution");
  assert.equal(selector?.control, "select");
  assert.equal(selector?.patchKey, "borrowerLegalConstitution");
  assert.deepEqual(selector?.options?.map((item) => item.value), [...APPROVED_IDS]);
  assert.deepEqual(selector?.options?.map((item) => item.label), PROGRAMME_LEGAL_CONSTITUTIONS.map((item) => item.label));

  const blank = canonicalFactsForLeadInformation(form(""));
  assert.equal(blank.ok, true);
  if (blank.ok) assert.equal(blank.facts.borrowerLegalConstitution, null);
  const spaces = canonicalFactsForLeadInformation(form("   "));
  assert.equal(spaces.ok, true);
  if (spaces.ok) assert.equal(spaces.facts.borrowerLegalConstitution, null);
  const salaried = canonicalFactsForLeadInformation(form("", "salaried"));
  assert.equal(salaried.ok, true);
  if (salaried.ok) assert.equal(salaried.facts.borrowerLegalConstitution, null);
  for (const value of ["Individual", "INDIVIDUAL", "person", "other"]) {
    const rejected = canonicalFactsForLeadInformation(form(value));
    assert.equal(rejected.ok, false);
    const server = parseCanonicalRecommendationFactBody({ borrowerLegalConstitution: value }, "salaried");
    assert.equal(server.ok, false);
  }
  const accepted = parseCanonicalRecommendationFactBody({ borrowerLegalConstitution: "individual" }, "salaried");
  assert.equal(accepted.ok, true);
  if (!accepted.ok) throw new Error("constitution write");
  assert.equal(accepted.patch.borrowerLegalConstitution, "individual");
  const cleared = parseCanonicalRecommendationFactBody({ borrowerLegalConstitution: "" }, "salaried");
  assert.equal(cleared.ok, true);
  if (cleared.ok) assert.equal(cleared.patch.borrowerLegalConstitution, null);

  const saved = buildLeadInformationPatchBody(form("llp"), 3);
  const continued = buildLeadInformationPatchBody(form("llp"), 3);
  assert.equal(saved.borrowerLegalConstitution, "llp");
  assert.equal(continued.borrowerLegalConstitution, "llp");
  assert.equal(JSON.stringify(saved), JSON.stringify(continued));
  const reopened = formFromOpportunity({
    productCode: "HOME_LOAN",
    employmentTypeCode: "salaried",
    borrowerLegalConstitution: "llp",
    dateOfBirth: "1990-01-15",
    lendingExtension: null,
  } as EnterpriseOpportunityApiRecord & { dateOfBirth?: string });
  assert.equal(reopened.borrowerLegalConstitution, "llp");
  assert.equal(reopened.employmentTypeCode, "salaried");
  assert.equal("dateOfBirth" in reopened, false);

  const lead = readFileSync(path.join(root, "src/components/catalyst-one/lead-information/lead-information-workspace.tsx"), "utf8");
  assert.equal(lead.includes('label="Legal Constitution"'), true);
  assert.equal(lead.includes("PROGRAMME_LEGAL_CONSTITUTIONS.map"), true);
  assert.equal(lead.includes("persist({ requireMandatory: false, continueAfter: false })"), true);
  assert.equal(lead.includes("persist({ requireMandatory: true, continueAfter: true })"), true);

  const missingSnapshot = buildCanonicalAssessmentSnapshot(sources());
  assert.equal(missingSnapshot.borrower.constitution.state, "missing");
  assert.equal(missingSnapshot.borrower.dateOfBirth.value, "1990-01-15");
  assert.equal(missingSnapshot.borrower.dateOfBirth.sourceEntityType, "EcmContact");
  assert.equal(missingSnapshot.borrower.ageYears.value, 47);
  const knownSnapshot = buildCanonicalAssessmentSnapshot(sources({ borrowerLegalConstitution: "individual" }));
  assert.equal(knownSnapshot.borrower.constitution.value, "individual");
  assert.equal(knownSnapshot.borrower.constitution.sourceEntityType, "EnterpriseOpportunity");
  assert.equal(knownSnapshot.borrower.constitution.sourceFieldKey, "borrowerLegalConstitution");
  assert.equal(knownSnapshot.borrower.dateOfBirth.value, "1990-01-15");
  assert.equal(knownSnapshot.borrower.dateOfBirth.sourceEntityType, "EcmContact");
  assert.equal(knownSnapshot.borrower.ageYears.value, 47);
  const invalidSnapshot = buildCanonicalAssessmentSnapshot(sources({ borrowerLegalConstitution: "other" }));
  assert.equal(invalidSnapshot.borrower.constitution.state, "missing");

  const knownCustomer = mapFinalizedAssessmentFactsToCanonical(knownSnapshot).customer;
  assert.equal(knownCustomer.constitution, "individual");
  assert.equal(knownCustomer.ageYears, 47);
  assert.equal(knownCustomer.dateOfBirth, "1990-01-15");
  const requiring = mapped("needs-constitution", { legalConstitutions: ["individual"] });
  const missingNeeds = collectProgrammeFactNeeds([requiring], customer());
  assert.equal(missingNeeds.unsupportedKeys.includes("borrower.constitution"), false);
  assert.ok(missingNeeds.askPaths.includes("borrower.constitution"));
  const presentNeeds = collectProgrammeFactNeeds([requiring], knownCustomer);
  assert.equal(presentNeeds.askPaths.includes("borrower.constitution"), false);
  assert.equal(presentNeeds.unsupportedKeys.includes("borrower.constitution"), false);

  const mismatch = evaluateCanonicalEligibility(
    requiring,
    mapFinalizedAssessmentFactsToCanonical(buildCanonicalAssessmentSnapshot(sources({ borrowerLegalConstitution: "proprietorship" }))).customer,
    AS_OF,
  );
  assert.equal(mismatch?.reason, "ELIGIBILITY_NOT_MET");
  assert.equal(mismatch?.missingInputs.includes("constitution") ?? false, false);
  assert.notEqual(mismatch?.reason, "CANONICAL_FACT_STORAGE_NOT_AVAILABLE");
  const matched = evaluateCanonicalEligibility(requiring, knownCustomer, AS_OF);
  assert.equal(matched?.missingInputs?.includes("constitution") ?? false, false);
  assert.notEqual(matched?.reason, "ASSESSMENT_INPUT_REQUIRED");

  const repository = new MemoryOpportunityAssessmentRepository();
  const service = createOpportunityAssessmentService({ repository });
  const first = await persistCanonicalAssessmentSnapshot(service, ACTOR, sources({ borrowerLegalConstitution: null }));
  const firstRevision = await repository.getRevision(ACTOR.organizationId, first.revisionId!);
  const firstSignature = canonicalSnapshotSignature(firstRevision.factsJson);
  assert.equal(firstRevision.factsJson.borrower.constitution.state, "missing");
  assert.equal(firstRevision.factsJson.borrower.dateOfBirth.value, "1990-01-15");
  const second = await persistCanonicalAssessmentSnapshot(
    service,
    ACTOR,
    sources({ borrowerLegalConstitution: "individual", rowVersion: 2 }),
  );
  assert.notEqual(second.revisionId, first.revisionId);
  const preserved = await repository.getRevision(ACTOR.organizationId, first.revisionId!);
  assert.equal(canonicalSnapshotSignature(preserved.factsJson), firstSignature);
  assert.equal(preserved.factsJson.borrower.constitution.state, "missing");
  const current = await repository.getRevision(ACTOR.organizationId, second.revisionId!);
  assert.equal(current.factsJson.borrower.constitution.value, "individual");

  const inventory = {
    programmes: [row("needs-constitution", { legalConstitutions: ["individual"] })],
    lenderCategories: new Map([["lender-constitution", "A" as const]]),
  };
  const asked = await projectChanakyaRecommendationWorkspace(service, ACTOR, sources({ opportunityId: "opp-ask" }), {
    loadInventory: async () => inventory,
    recommend: async () => readyResult(),
  });
  assert.equal(asked.workspaceState, "INFORMATION_REQUIRED");
  assert.ok(asked.missingFactKeys.includes("borrower.constitution"));
  assert.ok(asked.missingLabels.includes("Legal Constitution"));
  assert.equal(asked.recommendationExecuted, false);
  assert.equal(asked.guidance.includes("no canonical Opportunity store"), false);

  let seenConstitution: string | null | undefined = undefined;
  const rerun = await projectChanakyaRecommendationWorkspace(
    service,
    ACTOR,
    sources({
      opportunityId: "opp-ask",
      borrowerLegalConstitution: accepted.patch.borrowerLegalConstitution,
      rowVersion: 4,
    }),
    {
      loadInventory: async () => inventory,
      recommend: async (request) => {
        seenConstitution = request.customer.constitution;
        return readyResult();
      },
    },
  );
  assert.equal(seenConstitution, "individual");
  assert.equal(rerun.recommendationExecuted, true);
  assert.equal(rerun.workspaceState, "INFORMATION_COMPLETE");
  assert.notEqual(rerun.revisionId, asked.revisionId);

  const life = await projectChanakyaRecommendationWorkspace(service, ACTOR, sources({ opportunityId: "opp-ask" }), {
    loadInventory: async () => inventory,
    recommend: async () => readyResult(),
  });
  assert.equal(life.workspaceState, asked.workspaceState);
  assert.deepEqual(life.missingFactKeys, asked.missingFactKeys);
  assert.deepEqual(life.missingLabels, asked.missingLabels);
  assert.equal(life.guidance, asked.guidance);

  const missingAge = collectProgrammeFactNeeds([mapped("dob", dobFilter())], customer({ borrowerAgeYears: null }));
  assert.ok(missingAge.askPaths.includes("borrower.ageYears"));
  assert.equal(missingAge.askPaths.includes("borrower.dateOfBirth"), false);
  assert.equal(missingAge.unsupportedKeys.includes("borrower.dateOfBirth"), false);
  const knownAge = collectProgrammeFactNeeds([mapped("dob", dobFilter())], customer());
  assert.equal(knownAge.askPaths.includes("borrower.ageYears"), false);
  assert.equal(knownAge.unsupportedKeys.includes("borrower.dateOfBirth"), false);

  const property = collectProgrammeFactNeeds([
    mapped("kind", { policyAssessmentJson: { allowedPropertyKinds: ["flat"] } }),
    mapped("use", { policyAssessmentJson: { allowedOccupancy: ["self"] } }),
    mapped("possession", { policyAssessmentJson: { allowedPossession: ["yes"] } }),
    mapped("registration", { policyAssessmentJson: { allowedRegistration: ["registered"] } }),
    mapped("co", { policyAssessmentJson: { ageGoverningParty: "co_applicant" } }),
  ], knownCustomer);
  for (const key of [
    "property.propertyKind",
    "property.occupancy",
    "property.possessionStatus",
    "property.registrationStatus",
    "coApplicant",
  ]) {
    assert.ok(property.unsupportedKeys.includes(key));
  }
  assert.equal(property.askPaths.includes("borrower.constitution"), false);
  const labels = Object.fromEntries(property.blockers.map((item) => [item.factKey, item.displayLabel]));
  assert.equal(labels["property.propertyKind"], "Property Kind");
  assert.equal(labels["property.occupancy"], "Occupancy");
  assert.equal(labels["property.possessionStatus"], "Possession Status");
  assert.equal(labels["property.registrationStatus"], "Registration Status");
  assert.equal(labels.coApplicant, "Co-applicant");
  assert.equal(property.blockers.every((item) => item.reasonCategory === "CANONICAL_STORAGE_NOT_AVAILABLE"), true);
  assert.equal(property.blockers.every((item) => item.programmes?.length === 1), true);
  const sharedKind = collectProgrammeFactNeeds([
    mapped("kind-a", { policyAssessmentJson: { allowedPropertyKinds: ["flat"] } }),
    mapped("kind-b", { policyAssessmentJson: { allowedPropertyKinds: ["house"] } }),
  ], knownCustomer);
  const sharedBlocker = sharedKind.blockers.find((item) => item.factKey === "property.propertyKind");
  assert.equal(sharedBlocker?.programmes, undefined);

  const oneProgramme = collectProgrammeFactNeeds([
    mapped("only-kind", { policyAssessmentJson: { allowedPropertyKinds: ["flat"] } }),
  ], knownCustomer);
  assert.equal(oneProgramme.blockers[0]?.programmes?.[0]?.code, "only-kind");
  const unknown = collectProgrammeFactNeeds([
    mapped("unknown", {
      additionalEligibilityFilters: {
        version: 1,
        root: {
          kind: "group",
          id: "unknown",
          combinator: "AND",
          children: [{ kind: "predicate", id: "unknown-leaf", fieldId: "assessment:mystery.widget", operator: "IS_NOT_EMPTY" }],
        },
      },
    }),
  ], knownCustomer);
  assert.equal(unknown.blockers[0]?.factKey, "assessment:mystery.widget");
  assert.equal(unknown.blockers[0]?.displayLabel, "assessment:mystery.widget");

  const blocked = await projectChanakyaRecommendationWorkspace(
    service,
    ACTOR,
    sources({ opportunityId: "opp-kind", borrowerLegalConstitution: "individual" }),
    {
      loadInventory: async () => ({
        programmes: [row("only-kind", {
          legalConstitutions: ["individual"],
          policyAssessmentJson: { allowedPropertyKinds: ["flat"] },
        })],
        lenderCategories: new Map([["lender-constitution", "A" as const]]),
      }),
      recommend: async () => readyResult(),
    },
  );
  assert.equal(blocked.workspaceState, "UNSUPPORTED_CANONICAL_FACT");
  assert.equal(blocked.guidance, "Additional information required for lender evaluation: Property Kind");
  assert.equal(blocked.guidance.includes("no canonical Opportunity store"), false);
  assert.equal(blocked.blockers[0]?.displayLabel, "Property Kind");
  assert.equal(blocked.recommendationExecuted, false);

  const selfEmployed = await projectChanakyaRecommendationWorkspace(
    service,
    ACTOR,
    sources({
      opportunityId: "opp-se",
      employmentTypeCode: "self-employed-business",
      borrowerLegalConstitution: "proprietorship",
    }),
    {
      loadInventory: async () => inventory,
      recommend: async () => readyResult(),
    },
  );
  assert.equal(selfEmployed.workspaceState, "UNSUPPORTED_METHODOLOGY");
  assert.equal(selfEmployed.recommendationExecuted, false);

  const workspace = readFileSync(path.join(root, "src/components/catalyst-one/chanakya/chanakya-recommendation-workspace.tsx"), "utf8");
  const lifeFile = readFileSync(path.join(root, "src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx"), "utf8");
  assert.equal(workspace.includes('row.input.control === "select"'), true);
  assert.equal(workspace.includes("model.blockers"), true);
  assert.equal(workspace.includes("no canonical Opportunity store"), false);
  assert.equal(lifeFile.includes("chanakya-recommendation"), true);
  assert.equal(lifeFile.includes("workspaceState"), true);
  assert.equal(lifeFile.includes("chanakya.missingLabels"), true);
  assert.equal(lifeFile.includes("useChanakyaCanonicalRecommendations"), false);

  const migration = readFileSync(
    path.join(root, "prisma/migrations/20261001003000_opportunity_borrower_legal_constitution/migration.sql"),
    "utf8",
  );
  const sql = migration.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("--"));
  assert.deepEqual(sql, [
    "ALTER TABLE \"enterprise_opportunities\"",
    "ADD COLUMN \"borrower_legal_constitution\" TEXT;",
  ]);
  assert.equal(sql.some((line) => /\bDEFAULT\b/i.test(line) || /\bUPDATE\b/i.test(line) || /\bDELETE\b/i.test(line)), false);
  const ageMigration = readFileSync(
    path.join(root, "prisma/migrations/20260930223000_opportunity_borrower_age_years/migration.sql"),
    "utf8",
  );
  assert.equal(ageMigration.includes("borrower_legal_constitution"), false);
  const allowlist = readFileSync(path.join(root, "scripts/prisma-migrate-status-build-probe.mjs"), "utf8");
  assert.equal(allowlist.includes("20261001003000_opportunity_borrower_legal_constitution"), true);
  const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
  assert.equal(schema.includes('borrowerLegalConstitution String?'), true);
  assert.equal(schema.includes('@map("borrower_legal_constitution")'), true);

  console.log("LEGAL_CONSTITUTION_CONTRACT_PROOF failed=0");
}
