/**
 * CHANAKYA single-entry recommendation contract proof.
 * No database. No production access.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildChanakyaCanonicalUpdateBody, parseCanonicalRecommendationFactBody } from "@/lib/lead-information/canonical-recommendation-facts";
import { MemoryOpportunityAssessmentRepository } from "@server/repositories/opportunity-assessment/memory-repository";
import {
  buildCanonicalAssessmentSnapshot,
  canonicalSnapshotSignature,
  evaluateCanonicalAssessmentSnapshot,
  type CanonicalAssessmentSources,
} from "@server/services/opportunity-assessment/canonical-snapshot";
import { projectChanakyaRecommendationWorkspace } from "@server/services/opportunity-assessment/chanakya-workspace";
import { mapFinalizedAssessmentFactsToCanonical } from "@server/services/opportunity-assessment/map-to-canonical";
import { persistCanonicalAssessmentSnapshot } from "@server/services/opportunity-assessment/persist-canonical-snapshot";
import { getOpportunityAssessmentRecommendation } from "@server/services/opportunity-assessment/recommendation-http";
import { createOpportunityAssessmentService } from "@server/services/opportunity-assessment/runtime";
import type { OpportunityAssessmentActorContext } from "@server/services/opportunity-assessment/types";
import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ACTOR: OpportunityAssessmentActorContext = {
  organizationId: "org-1",
  actorUserId: "user-1",
  channel: "C1",
};

function salaried(extra: Partial<CanonicalAssessmentSources> = {}): CanonicalAssessmentSources {
  return {
    opportunityId: "opp-rajesh",
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
    rowVersion: 4,
    ...extra,
  };
}

function result(status: CanonicalLenderRecommendationResult["status"]): CanonicalLenderRecommendationResult {
  return {
    status,
    product: "HOME_LOAN",
    readOnly: true,
    recommendations: [],
    rejectedProgrammes: [],
    retrievedProgrammeCount: 1,
    evaluatedProgrammeCount: 1,
    versions: { lenderScoreVersion: null } as CanonicalLenderRecommendationResult["versions"],
    analyzedAt: "2026-09-30T00:00:00.000Z",
  };
}

function bareProgramme(product: "HOME_LOAN" | "HOME_LOAN_BT" = "HOME_LOAN") {
  return {
    id: "bare",
    organizationId: "org-1",
    lenderId: "lender-bare",
    productCode: product,
    code: "bare",
    label: "bare",
    versionNumber: 1,
    transactionTypes: product === "HOME_LOAN" ? null : ["balance_transfer"],
    policyVersionId: "version-bare",
    policyVersion: {
      id: "version-bare",
      organizationId: "org-1",
      policyId: "policy-bare",
      versionNumber: 1,
      status: "published",
      eligibilityRules: {},
      creditRules: {},
      effectiveFrom: null,
      effectiveUntil: null,
      policy: {
        id: "policy-bare",
        organizationId: "org-1",
        lenderId: "lender-bare",
        productCode: product,
        status: "published",
        currentPublishedVersionId: "version-bare",
        isDeleted: false,
      },
    },
    lender: {
      displayName: "Bare Lender",
      label: "bare",
      code: "bare",
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
    residencyEligibility: null,
    minCibil: null,
    maxCibil: null,
    minAge: null,
    maxAge: null,
    maxFoirExact: "60",
    minRoiExact: "8.5",
  };
}

function proofDependencies(recommend: (request: { customer: { monthlyIncomeRupees?: number | null } }) => Promise<CanonicalLenderRecommendationResult>) {
  return {
    loadInventory: async () => ({
      programmes: [bareProgramme()],
      lenderCategories: new Map([["lender-bare", "A" as const]]),
    }),
    recommend,
  };
}

function harness() {
  const repository = new MemoryOpportunityAssessmentRepository();
  const service = createOpportunityAssessmentService({ repository });
  return { repository, service };
}

export async function runChanakyaSingleEntryProof() {
  const facts = buildCanonicalAssessmentSnapshot(salaried());
  assert.equal(facts.incomeAndObligations.requestedTenureMonths.value, 240);
  assert.equal(facts.incomeAndObligations.monthlyIncome.value, "500000.00");
  assert.equal(facts.incomeAndObligations.existingMonthlyObligations.value, "0.00");
  assert.equal(facts.incomeAndObligations.existingMonthlyObligations.knownZeroDeclared, true);
  assert.equal(facts.property.propertyValue.value, "8000000.00");
  assert.equal(facts.property.propertyCategory.value, "residential");
  assert.equal(facts.property.constructionStatus.value, "ready");
  assert.equal(facts.borrower.residency.value, "resident");
  assert.equal(facts.cibil.kind.value, "expected_band");
  assert.equal(facts.cibil.expectedBand.value, "750_799");
  assert.equal(facts.borrower.dateOfBirth.value, "1990-01-15");
  assert.equal(facts.borrower.dateOfBirth.sourceChannel, "CONTACT");
  assert.equal(facts.borrower.ageYears.state, "missing");
  const aged = buildCanonicalAssessmentSnapshot(salaried({ borrowerAgeYears: 47 }));
  assert.equal(aged.borrower.ageYears.value, 47);
  assert.equal(aged.borrower.ageYears.sourceEntityType, "EnterpriseOpportunity");
  assert.equal(aged.borrower.ageYears.sourceFieldKey, "borrowerAgeYears");
  assert.equal(aged.borrower.dateOfBirth.value, "1990-01-15");
  assert.equal(mapFinalizedAssessmentFactsToCanonical(aged).customer.ageYears, 47);
  assert.equal(mapFinalizedAssessmentFactsToCanonical(facts).customer.ageYears, null);
  assert.equal(facts.loanRequirement.productCode.value, "HOME_LOAN");
  assert.equal(facts.loanRequirement.transactionType.state, "missing");

  const hlbt = buildCanonicalAssessmentSnapshot(salaried({
    opportunityId: "opp-bt",
    transactionType: "balance_transfer",
    btAmount: 1800000,
    btInstitutionName: "Existing Bank",
    currentRoiPercent: "8.25",
    currentHomeLoanEmiRupees: 42000,
    remainingTenureMonths: 180,
    loanStartDate: "2026-01-01",
    repaymentTrack: "yes",
    delayedEmiCount: 0,
  }));
  assert.equal(hlbt.loanRequirement.productCode.value, "HOME_LOAN");
  assert.equal(hlbt.loanRequirement.transactionType.value, "balance_transfer");
  assert.equal(hlbt.balanceTransfer.outstandingPrincipal.value, "1800000.00");
  assert.equal(hlbt.balanceTransfer.currentRoiPercent.value, "8.250000");
  assert.equal(hlbt.balanceTransfer.currentHomeLoanEmi.value, "42000.00");
  assert.equal(hlbt.balanceTransfer.remainingTenureMonths.value, 180);
  assert.equal(hlbt.balanceTransfer.loanStartDate.value, "2026-01-01");
  assert.equal(hlbt.balanceTransfer.repaymentTrack.value, "yes");
  assert.equal(hlbt.balanceTransfer.delayedEmiCount.value, 0);
  assert.equal(hlbt.balanceTransfer.delayedEmiCount.knownZeroDeclared, true);
  const mappedBt = mapFinalizedAssessmentFactsToCanonical(hlbt);
  assert.equal(mappedBt.product, "HOME_LOAN_BT");
  assert.equal(mappedBt.customer.journeyKind, "home_loan_balance_transfer");
  assert.equal(mappedBt.customer.loanStartDate, "2026-01-01");

  const ready = evaluateCanonicalAssessmentSnapshot(facts, salaried());
  assert.equal(ready.executable, true);
  assert.equal(ready.revisionKind, "FINALIZED");
  assert.deepEqual(ready.missingFactKeys, []);

  const missingIncome = buildCanonicalAssessmentSnapshot(salaried({ monthlyIncomeRupees: null, existingMonthlyObligationsRupees: null }));
  const missing = evaluateCanonicalAssessmentSnapshot(missingIncome, salaried({ monthlyIncomeRupees: null }));
  assert.equal(missing.executable, false);
  assert.equal(missing.revisionKind, "SAVED");
  assert.ok(missing.missingFactKeys.includes("incomeAndObligations.monthlyIncome"));
  assert.ok(missing.missingFactKeys.includes("incomeAndObligations.existingMonthlyObligations"));
  assert.ok(missing.missingLabels.includes("Monthly Income"));
  assert.ok(missing.missingLabels.includes("Existing Monthly Obligations"));
  assert.equal(missing.missingFactKeys.includes("incomeAndObligations.requestedTenureMonths"), false);

  const blockedFacts = buildCanonicalAssessmentSnapshot(salaried());
  blockedFacts.loanRequirement.transactionType = {
    ...blockedFacts.loanRequirement.transactionType,
    value: "bt_top_up",
    state: "known",
  };
  const blocked = evaluateCanonicalAssessmentSnapshot(blockedFacts, salaried());
  assert.equal(blocked.executable, false);
  assert.equal(blocked.revisionKind, "SAVED");
  assert.equal(blocked.failureCode, "UNSUPPORTED_RECOMMENDATION_TRANSACTION");
  assert.deepEqual(blocked.missingFactKeys, []);

  const selfEmployed = evaluateCanonicalAssessmentSnapshot(
    buildCanonicalAssessmentSnapshot(salaried({ employmentTypeCode: "self-employed-professional", monthlyIncomeRupees: 500000 })),
    salaried({ employmentTypeCode: "self-employed-professional" }),
  );
  assert.equal(selfEmployed.failureCode, "SELF_EMPLOYED_INCOME_METHODOLOGY_UNSUPPORTED");
  assert.equal(selfEmployed.executable, false);
  assert.deepEqual(selfEmployed.missingFactKeys, []);

  const body = buildChanakyaCanonicalUpdateBody({
    monthlyIncomeRupees: 500000,
    existingMonthlyObligationsRupees: 0,
    assessmentFacts: { ignored: true },
  });
  assert.deepEqual(Object.keys(body).sort(), ["existingMonthlyObligationsRupees", "monthlyIncomeRupees"]);
  const parsed = parseCanonicalRecommendationFactBody(body, "salaried");
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.patch.monthlyIncomeRupees, 500000);
    assert.equal(parsed.patch.existingMonthlyObligationsRupees, 0);
  }

  const { repository, service } = harness();
  const first = await persistCanonicalAssessmentSnapshot(service, ACTOR, salaried());
  assert.equal(first.appended, true);
  assert.equal(first.evaluation.revisionKind, "FINALIZED");
  const firstRevision = await repository.getRevision(ACTOR.organizationId, first.revisionId!);
  const firstSignature = canonicalSnapshotSignature(firstRevision.factsJson);
  const repeat = await persistCanonicalAssessmentSnapshot(service, ACTOR, salaried());
  assert.equal(repeat.appended, false);
  assert.equal(repeat.revisionId, first.revisionId);
  const changed = await persistCanonicalAssessmentSnapshot(service, ACTOR, salaried({ monthlyIncomeRupees: 450000, rowVersion: 5 }));
  assert.equal(changed.appended, true);
  assert.notEqual(changed.revisionId, first.revisionId);
  const preserved = await repository.getRevision(ACTOR.organizationId, first.revisionId!);
  assert.equal(canonicalSnapshotSignature(preserved.factsJson), firstSignature);
  assert.equal(preserved.revisionKind, "FINALIZED");

  const incomplete = await persistCanonicalAssessmentSnapshot(
    service,
    ACTOR,
    salaried({ opportunityId: "opp-gap", monthlyIncomeRupees: null }),
  );
  assert.equal(incomplete.evaluation.revisionKind, "SAVED");
  assert.equal(incomplete.evaluation.executable, false);

  let seenIncome: number | null | undefined = null;
  const opened = await projectChanakyaRecommendationWorkspace(
    service,
    ACTOR,
    salaried({ opportunityId: "opp-run" }),
    proofDependencies(async (request) => {
      seenIncome = request.customer.monthlyIncomeRupees;
      return result("ready");
    }),
  );
  assert.equal(opened.revisionKind, "FINALIZED");
  assert.equal(opened.executionAllowed, true);
  assert.equal(seenIncome, 500000);
  assert.equal(opened.panel, "complete");
  assert.equal(opened.guidance.includes("Assessment incomplete"), false);

  const lifeSame = await projectChanakyaRecommendationWorkspace(
    service,
    ACTOR,
    salaried({ opportunityId: "opp-run" }),
    proofDependencies(async () => result("ready")),
  );
  assert.equal(lifeSame.revisionId, opened.revisionId);
  assert.equal(lifeSame.workspaceState, opened.workspaceState);
  assert.equal(lifeSame.panel, opened.panel);
  assert.equal(lifeSame.resultStatus, opened.resultStatus);
  assert.equal(lifeSame.guidance.includes("Assessment incomplete"), false);
  assert.equal(lifeSame.guidance.includes("Finalize"), false);

  const missingOpen = await projectChanakyaRecommendationWorkspace(
    service,
    ACTOR,
    salaried({ opportunityId: "opp-life-gap", monthlyIncomeRupees: null }),
    proofDependencies(async () => result("ready")),
  );
  assert.equal(missingOpen.panel, "information_required");
  assert.equal(missingOpen.workspaceState, "INFORMATION_REQUIRED");
  assert.ok(missingOpen.missingLabels.includes("Monthly Income"));
  assert.equal(missingOpen.guidance.includes("Finalize"), false);
  const incomeBody = buildChanakyaCanonicalUpdateBody({ monthlyIncomeRupees: 500000 });
  const incomeParsed = parseCanonicalRecommendationFactBody(incomeBody, "salaried");
  assert.equal(incomeParsed.ok, true);
  if (!incomeParsed.ok) throw new Error("monthly income writeback");
  assert.equal(incomeParsed.patch.monthlyIncomeRupees, 500000);
  const afterIncome = await projectChanakyaRecommendationWorkspace(
    service,
    ACTOR,
    salaried({
      opportunityId: "opp-life-gap",
      monthlyIncomeRupees: incomeParsed.patch.monthlyIncomeRupees,
      rowVersion: 6,
    }),
    proofDependencies(async () => result("ready")),
  );
  assert.equal(afterIncome.revisionKind, "FINALIZED");
  assert.equal(afterIncome.workspaceState, "INFORMATION_COMPLETE");
  assert.equal(afterIncome.panel, "complete");
  const lifeAfterIncome = await projectChanakyaRecommendationWorkspace(
    service,
    ACTOR,
    salaried({
      opportunityId: "opp-life-gap",
      monthlyIncomeRupees: incomeParsed.patch.monthlyIncomeRupees,
      rowVersion: 6,
    }),
    proofDependencies(async () => result("ready")),
  );
  assert.equal(lifeAfterIncome.revisionId, afterIncome.revisionId);
  assert.equal(lifeAfterIncome.workspaceState, afterIncome.workspaceState);
  assert.equal(lifeAfterIncome.panel, afterIncome.panel);
  assert.equal(lifeAfterIncome.resultStatus, afterIncome.resultStatus);

  const legacy = harness();
  const legacyAssessment = await legacy.service.getOrCreateAssessment(ACTOR, "opp-legacy-get");
  const legacyGet = await getOpportunityAssessmentRecommendation(legacy.service, ACTOR, "opp-legacy-get");
  assert.equal(legacyGet.body.data?.recommendationExecuted, false);
  assert.equal(legacyGet.body.data?.recommendationRunCreated, false);
  const legacyRead = await legacy.service.readCurrentAssessment(ACTOR, {
    assessmentId: legacyAssessment.id,
    opportunityId: "opp-legacy-get",
  });
  assert.equal(legacyRead.currentRevision, null);

  const none = await projectChanakyaRecommendationWorkspace(
    service,
    ACTOR,
    salaried({ opportunityId: "opp-none" }),
    proofDependencies(async () => ({
      ...result("no_eligible_programmes"),
      rejectedProgrammes: [{ programmeId: "bare", code: "bare", reason: "ELIGIBILITY_NOT_MET", missingInputs: [] }],
    })),
  );
  assert.equal(none.resultStatus, "no_eligible_programmes");
  assert.equal(none.panel, "complete");
  assert.equal(none.workspaceState, "NO_ELIGIBLE_PROGRAMMES");

  const reads = (relative: string) => readFileSync(path.join(root, relative), "utf8");
  const panel = reads("src/components/catalyst-one/credit-bench/chanakya-opportunity-recommendation-panel.tsx");
  const bench = reads("src/components/catalyst-one/credit-bench/credit-bench-workspace.tsx");
  const workspace = reads("src/components/catalyst-one/opportunity-workspace/opportunity-workspace.tsx");
  const chrome = reads("src/components/catalyst-one/shared/lead-opportunity-journey-chrome.tsx");
  const assessment = reads("src/components/catalyst-one/opportunity-workspace/workspace-opportunity-assessment-panel.tsx");
  const snapshot = reads("server/services/opportunity-assessment/canonical-snapshot.ts");
  const route = reads("src/app/api/enterprise-opportunities/[opportunityId]/chanakya-recommendation/route.ts");
  const life = reads("src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx");
  const componentFiles = (dir: string): string[] => {
    const found: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) found.push(...componentFiles(full));
      else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) found.push(full);
    }
    return found;
  };
  const relative = (file: string) => path.relative(root, file).replaceAll("\\", "/");
  const hookUsers = componentFiles(path.join(root, "src/components"))
    .filter((file) => readFileSync(file, "utf8").includes("useChanakyaCanonicalRecommendations"))
    .map(relative)
    .sort();
  assert.equal(panel.includes("Complete Assessment"), false);
  assert.equal(/Chanakya Recommendation/.test(bench), false);
  assert.equal(workspace.includes("AnalyzeDealTriggerButton"), false);
  assert.equal(chrome.includes("CHANAKYA Recommendation"), true);
  assert.equal(chrome.includes("LeadOpportunityJourneyChrome"), true);
  assert.equal(assessment.includes("Save draft"), false);
  assert.equal(assessment.includes("Finalize"), false);
  assert.equal(snapshot.includes("localStorage.getItem"), false);
  assert.equal(snapshot.includes("stated-draft"), false);
  assert.equal(snapshot.includes("rankByMatchPercent"), false);
  assert.equal(snapshot.includes("field-control-master"), false);
  assert.equal(snapshot.includes("compass-journey"), false);
  assert.equal(route.includes("updateOpportunity"), true);
  assert.equal(route.includes("buildChanakyaCanonicalUpdateBody"), true);
  assert.equal(route.includes("factsJson"), false);
  assert.equal(life.includes("/chanakya-recommendation"), true);
  assert.equal(life.includes("ChanakyaRecommendationWorkspace"), true);
  assert.equal(life.includes("CHANAKYA needs additional information before lender strategy can be completed."), true);
  assert.equal(life.includes("useChanakyaCanonicalRecommendations"), false);
  assert.equal(life.includes("opportunity-assessment/recommendation"), false);
  assert.equal(life.includes("Assessment incomplete"), false);
  assert.equal(life.includes("Finalize the Opportunity Assessment"), false);
  assert.equal(life.includes("Complete Assessment"), false);
  assert.equal(life.includes("Submit & Get Recommendation"), false);
  assert.deepEqual(hookUsers, [
    "src/components/catalyst-one/credit-bench/chanakya-opportunity-recommendation-panel.tsx",
  ]);
  assert.equal(bench.includes("ChanakyaOpportunityRecommendationPanel"), false);

  console.log("CHANAKYA_SINGLE_ENTRY_PROOF checks=121 failed=0");
}
