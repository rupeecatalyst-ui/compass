/**
 * Loan-file adapter forwards recorded Opportunity facts and keeps match rules unchanged.
 */
import assert from "node:assert/strict";
import { deriveChanakyaOpportunityRecommendationsFromOptions } from "../src/lib/chanakya-opportunity-recommendations/derive";
import {
  acceptedCustomerResidency,
  matchInputFromLoanFile,
  type LoanFileOpportunityMatchFacts,
} from "../src/lib/enterprise-lender-registry/recommend-from-registry";
import {
  recommendationProgrammeIds,
  selectCurrentProgramme,
} from "../src/lib/enterprise-lender-registry/programme-versioning";
import { projectPublicProgrammeMatchInput } from "../src/lib/compass-customer-gateway/public-programme-match";
import { projectRegistryProgrammeRecommendations } from "../server/services/compass-customer-gateway/compass-recommendations.service";
import { emptyOpportunityAssessmentFacts } from "../src/lib/opportunity-assessment/empty-facts";
import { mapFinalizedAssessmentFactsToCanonical } from "../server/services/opportunity-assessment/map-to-canonical";
import type { AssessmentFact } from "../src/types/opportunity-assessment";
import type { LoanFile } from "../src/types/catalyst-one";
import type { EnterpriseLenderProgramRecord } from "../src/types/enterprise-lender-registry";
import type { PublishedLenderOption } from "../src/lib/enterprise-lender-registry/published-directory";

const lender = {
  id: "cmchanakyalenderfact01",
  code: "FACTBANK",
  displayName: "Fact Bank",
  legalName: "Fact Bank",
  institutionCategory: "bank",
  aliases: [],
  source: "api",
  published: true,
  active: true,
} as PublishedLenderOption;

function programme(patch: Partial<EnterpriseLenderProgramRecord> = {}): EnterpriseLenderProgramRecord {
  return {
    id: "prog-live",
    lenderId: lender.id,
    lineageId: "line-fact",
    code: "BASE_FACT_HOME_LOAN",
    label: "Fact Home Loan",
    productCode: "HOME_LOAN",
    employmentType: "salaried",
    employmentTypes: ["salaried"],
    legalConstitutions: ["individual"],
    residencyEligibility: ["resident"],
    eligibleStates: ["MH"],
    status: "active",
    lifecycleStatus: "active",
    enabled: true,
    isLivePublished: true,
    publicationState: "published",
    completenessState: "complete",
    approvalStatus: "approved",
    versionNumber: 6,
    effectiveFrom: "2020-01-01T00:00:00.000Z",
    isDeleted: false,
    ...patch,
  } as EnterpriseLenderProgramRecord;
}

function file(): LoanFile {
  return {
    id: "file-fact",
    fileNumber: "FILE-FACT",
    customerId: "ctc-fact",
    customerName: "Fact Customer",
    customerMobile: "",
    customerEmail: "",
    city: "Pune",
    state: "",
    employmentType: "salaried",
    lendingType: "secured",
    transactionType: "fresh",
    loanProduct: "HOME_LOAN",
    loanAmount: 5_000_000,
    requiredAmount: 5_000_000,
    lender: "",
    stage: "raw_lead",
    relationshipManager: "",
    priority: "medium",
    daysInStage: 0,
    expectedRevenue: 0,
    revenuePercent: 0,
    revenueReceived: 0,
    expectedDisbursement: "",
    loginDate: "",
    expectedLoginDate: "",
    sanctionAmount: 0,
    disbursementAmount: 0,
    interestRate: 0,
    tenure: 0,
    status: "on_track",
    progress: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    documents: [],
    tasks: [],
    timeline: [],
    internalNotes: "",
    isUrgent: false,
    isDelayed: false,
    approxCibilScore: "700_749",
    enterpriseOpportunityId: "opp-fact",
  } as LoanFile;
}

function facts(patch: Partial<LoanFileOpportunityMatchFacts> = {}): LoanFileOpportunityMatchFacts {
  return {
    residency: "resident",
    borrowerLegalConstitution: "individual",
    state: "MH",
    ...patch,
  };
}

const live = programme();
const superseded = programme({
  id: "prog-old",
  versionNumber: 3,
  publicationState: "superseded",
  isLivePublished: false,
  status: "archived",
  lifecycleStatus: "archived",
  residencyEligibility: ["nri"],
});
const programmes = [live, superseded];
const dealStamp = { programmeId: live.id, programmeVersion: 3, roiPercent: 7.1 };

function recommend(opportunityFacts: LoanFileOpportunityMatchFacts | undefined, loan = file()) {
  return deriveChanakyaOpportunityRecommendationsFromOptions({
    file: loan,
    stated: { statedPropertyType: "residential", statedPropertyValue: "8000000" },
    registryOptions: [lender],
    programmes,
    limit: 5,
    opportunityFacts,
  });
}

const matched = recommend(facts());
assert.equal(matched.ready, true, matched.guidance.join(" | "));
assert.equal(matched.recommendations.length, 1);
assert.equal(matched.recommendations[0]?.programmeId, live.id);
assert.equal(matched.recommendations[0]?.programmeVersion, 6);
assert.equal(matched.missingRequirements.length, 0);

const missingResidency = recommend(facts({ residency: null }));
assert.equal(missingResidency.ready, false);
assert.equal(missingResidency.recommendations.length, 0);
assert.equal(missingResidency.missingRequirements.some((gap) => gap.id === "residency"), true);
assert.match(missingResidency.guidance.join(" "), /Residency was not available/);
assert.equal(missingResidency.guidance.some((line) => line.includes("outside programme")), false);

const contactResidentStatus = "resident";
assert.equal(acceptedCustomerResidency(null), null);
assert.equal(contactResidentStatus, "resident");
const contactIgnored = matchInputFromLoanFile(file(), facts({ residency: null }));
assert.equal(contactIgnored.residency, null);
assert.equal(contactIgnored.state, "MH");
const contactResult = recommend(facts({ residency: null }));
assert.equal(contactResult.recommendations.length, 0);
assert.match(contactResult.guidance.join(" "), /Residency was not available/);

const missingConstitution = recommend(facts({ borrowerLegalConstitution: null }));
assert.equal(missingConstitution.recommendations.length, 0);
assert.equal(missingConstitution.missingRequirements.some((gap) => gap.id === "constitution"), true);
assert.match(missingConstitution.guidance.join(" "), /Legal constitution was not available/);
assert.equal(missingConstitution.missingRequirements.some((gap) => gap.id === "residency"), false);

const missingState = recommend(facts({ state: null }));
assert.equal(missingState.recommendations.length, 0);
assert.equal(missingState.missingRequirements.some((gap) => gap.id === "state"), true);
assert.match(missingState.guidance.join(" "), /State was not available/);
const stateInput = matchInputFromLoanFile(file(), facts({ state: null }));
assert.equal(stateInput.city, "Pune");
assert.equal(stateInput.state, null);

const ineligible = recommend(facts({ residency: "nri" }));
assert.equal(ineligible.recommendations.length, 0);
assert.equal(ineligible.missingRequirements.length, 0);
assert.deepEqual(ineligible.guidance, ["Residency is outside programme eligibility."]);

const unsupported = recommend(facts({ residency: "not_applicable" }));
assert.match(unsupported.guidance.join(" "), /Residency was not available/);
assert.equal(acceptedCustomerResidency("not_applicable"), null);

const withoutOpportunity = recommend(undefined);
assert.deepEqual(withoutOpportunity.guidance, [
  "No applicable published programme matched this Opportunity. Category heuristics were not used.",
]);
assert.equal(withoutOpportunity.missingRequirements.length, 0);

assert.equal(selectCurrentProgramme(programmes, "salaried")?.id, live.id);
assert.deepEqual([...recommendationProgrammeIds(programmes)], [live.id]);
assert.equal(dealStamp.programmeVersion, 3);
assert.equal(dealStamp.roiPercent, 7.1);

const compassInput = projectPublicProgrammeMatchInput({
  productCode: "HOME_LOAN",
  productLabel: "Home Loan",
  requiredAmountLabel: "5000000",
  borrowerFields: {
    employmentTypeCode: "salaried",
    residency: "resident",
    ageYears: "35",
    propertyCity: "Pune",
    approxCibilScore: "760",
  },
  productFields: {
    propertyCategory: "residential",
    constructionStatus: "ready",
  },
});
assert.equal(compassInput.residency, "resident");
assert.equal(compassInput.state, "MH");
const compass = projectRegistryProgrammeRecommendations({
  detail: {
    opportunityId: "opp-fact",
    reference: "OPP-FACT",
    customerId: "ctc-fact",
    customerDisplayName: "Fact Customer",
    ownerLabel: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    productCode: "HOME_LOAN",
    productLabel: "Home Loan",
    requiredAmountLabel: "5000000",
    borrowerFields: {
      employmentTypeCode: "salaried",
      residency: "resident",
      ageYears: "35",
      propertyCity: "Pune",
      approxCibilScore: "700_749",
    },
    productFields: {
      propertyCategory: "residential",
      constructionStatus: "ready",
      requestedAmountLabel: "5000000",
    },
  } as never,
  lenders: [lender],
  programs: programmes,
  requestedAmount: 5_000_000,
});
assert.equal(compass.cards[0]?.programmeId, live.id);
assert.equal(compass.cards.length, 1);

function known<T>(value: T): AssessmentFact<T> {
  return {
    value,
    state: "known",
    sourceChannel: "C1",
    sourceEntityType: "EnterpriseOpportunity",
    sourceEntityId: "opp-fact",
    sourceFieldKey: "residency",
    sourceUpdatedAt: null,
    capturedByUserId: null,
    capturedAt: null,
    effectiveAt: null,
    confirmedByUserId: null,
    confirmedAt: null,
    certainty: null,
    evidenceRef: null,
  };
}

const assessment = emptyOpportunityAssessmentFacts();
assessment.loanRequirement.productCode = known("HOME_LOAN");
assessment.borrower.employmentFamily = known("salaried");
assessment.borrower.residency = known("resident");
assert.equal(mapFinalizedAssessmentFactsToCanonical(assessment).customer.residency, "resident");
assessment.borrower.residency = { ...known<string | null>(null), value: null, state: "missing" };
assert.equal(mapFinalizedAssessmentFactsToCanonical(assessment).customer.residency, null);

console.log("chanakya loan-file match facts proof passed");
