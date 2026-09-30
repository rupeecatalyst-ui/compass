/**
 * Programme-aware CHANAKYA fact proof.
 * Questions come only from viable published programmes.
 * No database. No production access.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapCanonicalProgramme } from "@server/services/lender-recommendation/programme-assessment-adapter";
import { MemoryOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/memory-repository";
import {
  buildCanonicalAssessmentSnapshot,
  type CanonicalAssessmentSources,
} from "@server/services/opportunity-assessment/canonical-snapshot";
import { projectChanakyaRecommendationWorkspace } from "@server/services/opportunity-assessment/chanakya-workspace";
import { mapFinalizedAssessmentFactsToCanonical } from "@server/services/opportunity-assessment/map-to-canonical";
import { collectProgrammeFactNeeds } from "@server/services/opportunity-assessment/programme-fact-needs";
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

function sources(extra: Partial<CanonicalAssessmentSources> = {}): CanonicalAssessmentSources {
  return {
    opportunityId: "opp-facts",
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
    approxCibilScore: "750_799",
    rowVersion: 1,
    ...extra,
  };
}

function row(product: "HOME_LOAN" | "HOME_LOAN_BT", patch: Record<string, unknown> = {}) {
  return {
    id: `prog-${product}`,
    organizationId: "org-1",
    lenderId: "lender-facts",
    productCode: product,
    code: product,
    label: product,
    versionNumber: 1,
    transactionTypes: product === "HOME_LOAN_BT" ? ["balance_transfer"] : null,
    policyVersionId: `version-${product}`,
    policyVersion: {
      id: `version-${product}`,
      organizationId: "org-1",
      policyId: `policy-${product}`,
      versionNumber: 1,
      status: "published",
      eligibilityRules: {},
      creditRules: {},
      effectiveFrom: null,
      effectiveUntil: null,
      policy: {
        id: `policy-${product}`,
        organizationId: "org-1",
        lenderId: "lender-facts",
        productCode: product,
        status: "published",
        currentPublishedVersionId: `version-${product}`,
        isDeleted: false,
      },
    },
    lender: {
      displayName: "Fact Lender",
      label: product,
      code: product,
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
    ...patch,
  };
}

function mapped(product: "HOME_LOAN" | "HOME_LOAN_BT", patch: Record<string, unknown> = {}) {
  return mapCanonicalProgramme({
    row: row(product, patch),
    product,
    lenderCategory: "A",
    asOf: AS_OF,
  });
}

function customer(extra: Partial<CanonicalAssessmentSources> = {}) {
  return mapFinalizedAssessmentFactsToCanonical(buildCanonicalAssessmentSnapshot(sources(extra))).customer;
}

function result(status: CanonicalLenderRecommendationResult["status"], reason?: string): CanonicalLenderRecommendationResult {
  return {
    status,
    product: "HOME_LOAN",
    readOnly: true,
    recommendations: [],
    rejectedProgrammes: reason ? [{ programmeId: "prog-HOME_LOAN", code: "prog", reason, missingInputs: [] }] : [],
    retrievedProgrammeCount: status === "ready" ? 1 : reason ? 1 : 0,
    evaluatedProgrammeCount: reason ? 1 : 0,
    versions: { lenderScoreVersion: null } as CanonicalLenderRecommendationResult["versions"],
    analyzedAt: AS_OF.toISOString(),
  };
}

export async function runChanakyaProgrammeAwareFactProof() {
  const blank = customer({
    residency: null,
    propertyCategory: null,
    constructionStatus: null,
    cityLabel: null,
    stateLabel: null,
    approxCibilScore: "not_known",
  });
  assert.ok(collectProgrammeFactNeeds([mapped("HOME_LOAN", { residencyEligibility: ["resident"] })], blank).askPaths.includes("borrower.residency"));
  assert.ok(collectProgrammeFactNeeds([mapped("HOME_LOAN", { propertyCategories: ["residential"] })], blank).askPaths.includes("property.propertyCategory"));
  assert.ok(collectProgrammeFactNeeds([mapped("HOME_LOAN", { constructionStatuses: ["ready"] })], blank).askPaths.includes("property.constructionStatus"));
  const geography = collectProgrammeFactNeeds([mapped("HOME_LOAN", { eligibleCities: ["Mumbai"], eligibleStates: ["Maharashtra"] })], blank);
  assert.ok(geography.askPaths.includes("property.propertyCity"));
  assert.ok(geography.askPaths.includes("property.propertyState"));
  assert.ok(collectProgrammeFactNeeds([mapped("HOME_LOAN", { minCibil: 750 })], blank).askPaths.includes("cibil.kind"));
  assert.equal(collectProgrammeFactNeeds([mapped("HOME_LOAN", { minCibil: 750 })], customer()).askPaths.includes("cibil.kind"), false);

  const btCustomer = customer({
    transactionType: "balance_transfer",
    btAmount: 1800000,
    loanStartDate: null,
    repaymentTrack: null,
    delayedEmiCount: null,
    currentRoiPercent: null,
    currentHomeLoanEmiRupees: null,
    remainingTenureMonths: null,
  });
  const seasoning = collectProgrammeFactNeeds([mapped("HOME_LOAN_BT", { policyAssessmentJson: { requiredSeasoningMonths: 12 } })], btCustomer);
  assert.ok(seasoning.askPaths.includes("balanceTransfer.loanStartDate"));
  assert.equal(seasoning.askPaths.some((path) => path.toLowerCase().includes("roi")), false);
  const clean = collectProgrammeFactNeeds([mapped("HOME_LOAN_BT", { policyAssessmentJson: { repaymentCleanRequired: true } })], btCustomer);
  assert.ok(clean.askPaths.includes("balanceTransfer.repaymentTrack"));
  assert.equal(clean.askPaths.some((path) => path.includes("currentHomeLoanEmi")), false);
  const delayed = collectProgrammeFactNeeds([mapped("HOME_LOAN_BT", { policyAssessmentJson: { maxDelayedEmis: 2 } })], btCustomer);
  assert.ok(delayed.askPaths.includes("balanceTransfer.delayedEmiCount"));
  assert.equal(delayed.askPaths.some((path) => path.includes("remainingTenure")), false);

  const blockers: Array<[Record<string, unknown>, string]> = [
    [{ legalConstitutions: ["individual"] }, "borrower.constitution"],
    [{ policyAssessmentJson: { allowedPropertyKinds: ["flat"] } }, "property.propertyKind"],
    [{ policyAssessmentJson: { allowedOccupancy: ["self"] } }, "property.occupancy"],
    [{ policyAssessmentJson: { allowedPossession: ["yes"] } }, "property.possessionStatus"],
    [{ policyAssessmentJson: { allowedRegistration: ["registered"] } }, "property.registrationStatus"],
    [{ policyAssessmentJson: { ageGoverningParty: "co_applicant" } }, "coApplicant"],
  ];
  for (const [patch, key] of blockers) {
    const needs = collectProgrammeFactNeeds([mapped("HOME_LOAN", patch)], customer());
    assert.ok(needs.unsupportedKeys.includes(key));
  }

  const repository = new MemoryOpportunityAssessmentRepository();
  const service = createOpportunityAssessmentService({ repository });
  const project = (
    extra: Partial<CanonicalAssessmentSources>,
    programmes: Array<ReturnType<typeof row>>,
    recommend: () => Promise<CanonicalLenderRecommendationResult>,
  ) => projectChanakyaRecommendationWorkspace(service, ACTOR, sources(extra), {
    loadInventory: async () => ({
      programmes,
      lenderCategories: new Map([["lender-facts", "A" as const]]),
    }),
    recommend,
  });

  const empty = await project({ opportunityId: "opp-empty" }, [], async () => result("ready"));
  assert.equal(empty.workspaceState, "NO_PROGRAMME_INVENTORY");
  assert.equal(empty.recommendationExecuted, false);
  assert.equal(empty.guidance.includes("No eligible lender programme"), false);

  const missing = await project(
    { opportunityId: "opp-residency", residency: null },
    [row("HOME_LOAN", { residencyEligibility: ["resident"] })],
    async () => result("ready"),
  );
  assert.equal(missing.workspaceState, "INFORMATION_REQUIRED");
  assert.ok(missing.missingFactKeys.includes("borrower.residency"));
  assert.equal(missing.recommendationExecuted, false);

  const blocked = await project(
    { opportunityId: "opp-constitution" },
    [row("HOME_LOAN", { legalConstitutions: ["individual"] })],
    async () => result("ready"),
  );
  assert.equal(blocked.workspaceState, "UNSUPPORTED_CANONICAL_FACT");
  assert.equal(blocked.failureCode, "CANONICAL_FACT_STORAGE_NOT_AVAILABLE");
  assert.ok(blocked.missingFactKeys.includes("borrower.constitution"));
  assert.equal(blocked.guidance.includes("No eligible lender programme"), false);

  const none = await project({ opportunityId: "opp-none" }, [row("HOME_LOAN")], async () => result("no_eligible_programmes", "ELIGIBILITY_NOT_MET"));
  assert.equal(none.workspaceState, "NO_ELIGIBLE_PROGRAMMES");
  assert.equal(none.panel, "complete");
  assert.equal(none.guidance.includes("No eligible lender programme"), true);

  let executed = false;
  const eligible = await project({ opportunityId: "opp-ready" }, [row("HOME_LOAN")], async () => {
    executed = true;
    return result("ready");
  });
  assert.equal(executed, true);
  assert.equal(eligible.workspaceState, "INFORMATION_COMPLETE");
  assert.equal(eligible.recommendationExecuted, true);

  const selfEmployed = await project(
    { opportunityId: "opp-se", employmentTypeCode: "self-employed-professional" },
    [row("HOME_LOAN")],
    async () => result("ready"),
  );
  assert.equal(selfEmployed.workspaceState, "UNSUPPORTED_METHODOLOGY");
  assert.equal(selfEmployed.recommendationExecuted, false);

  const life = await project({ opportunityId: "opp-ready", rowVersion: 1 }, [row("HOME_LOAN")], async () => result("ready"));
  assert.equal(life.workspaceState, eligible.workspaceState);
  assert.equal(life.revisionId, eligible.revisionId);

  const btMissingStart = await project(
    {
      opportunityId: "opp-bt",
      transactionType: "balance_transfer",
      btAmount: 1800000,
      currentRoiPercent: null,
      currentHomeLoanEmiRupees: null,
      remainingTenureMonths: null,
    },
    [row("HOME_LOAN_BT", { policyAssessmentJson: { requiredSeasoningMonths: 12, repaymentCleanRequired: true, maxDelayedEmis: 2 } })],
    async () => result("ready"),
  );
  assert.equal(btMissingStart.workspaceState, "INFORMATION_REQUIRED");
  assert.ok(btMissingStart.missingFactKeys.includes("balanceTransfer.loanStartDate"));
  assert.equal(btMissingStart.missingFactKeys.some((key) => key.toLowerCase().includes("roi")), false);

  const workspace = readFileSync(path.join(root, "src/components/catalyst-one/chanakya/chanakya-recommendation-workspace.tsx"), "utf8");
  const lifeFile = readFileSync(path.join(root, "src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx"), "utf8");
  assert.equal(workspace.includes("workspaceState === \"INFORMATION_COMPLETE\""), true);
  assert.equal(workspace.includes("workspaceState === \"NO_ELIGIBLE_PROGRAMMES\""), true);
  assert.equal(lifeFile.includes("workspaceState"), true);
  assert.equal(lifeFile.includes("useChanakyaCanonicalRecommendations"), false);
  assert.equal(workspace.includes("Complete Assessment"), false);
  assert.equal(workspace.includes("Save draft"), false);

  console.log("CHANAKYA_PROGRAMME_AWARE_FACT_PROOF checks=43 failed=0");
}
