/**
 * PAN_INDIA is nationwide. Explicit state lists stay exact.
 * Failed criteria stay on the eligibility verdict.
 */
import assert from "node:assert/strict";
import { mapCanonicalProgramme } from "@server/services/lender-recommendation/programme-assessment-adapter";
import { evaluateCanonicalEligibility } from "@server/services/lender-recommendation/canonical-governed-eligibility";
import { applicantStateMatchesProgramme } from "@/lib/product-programme-operations/pan-india-geography";
import type { CanonicalLenderRecommendationRequest } from "@/types/canonical-lender-recommendation";

const AS_OF = new Date("2026-10-01T00:00:00Z");
type Customer = CanonicalLenderRecommendationRequest["customer"];

function customer(state: string | null, income = 250_000): Customer {
  return {
    journeyKind: "home_loan",
    requiredAmountRupees: 10_000_000,
    propertyValueRupees: 15_000_000,
    employmentFamily: "salaried",
    employmentType: "salaried",
    monthlyIncomeRupees: income,
    existingMonthlyEmiRupees: 15_000,
    residency: "resident",
    constitution: "individual",
    cibilBand: "750_799",
    ageYears: 35,
    customerSelectedTenureMonths: 240,
    coApplicantDecision: null,
    propertyType: "residential",
    constructionStatus: "ready",
    state,
    city: "mumbai",
  };
}

function programme(eligibleStates: string[], maxIncomeExact = "10000000") {
  return mapCanonicalProgramme({
    product: "HOME_LOAN",
    lenderCategory: "A",
    asOf: AS_OF,
    row: {
      id: "hl",
      organizationId: "org-1",
      lenderId: "lender-1",
      productCode: "HOME_LOAN",
      code: "HL",
      label: "HL",
      versionNumber: 1,
      transactionTypes: null,
      policyVersionId: "version-1",
      policyVersion: {
        id: "version-1",
        organizationId: "org-1",
        policyId: "policy-1",
        versionNumber: 1,
        status: "published",
        eligibilityRules: {},
        creditRules: {},
        effectiveFrom: null,
        effectiveUntil: null,
        policy: {
          id: "policy-1",
          organizationId: "org-1",
          lenderId: "lender-1",
          productCode: "HOME_LOAN",
          status: "published",
          currentPublishedVersionId: "version-1",
          isDeleted: false,
        },
      },
      lender: {
        displayName: "Lender",
        label: "lender",
        code: "lender",
        organizationId: "org-1",
        enabled: true,
        isDeleted: false,
        lifecycleStatus: "active",
        operationalStatus: "active",
      },
      eligibleStates,
      employmentTypes: ["salaried"],
      legalConstitutions: ["individual"],
      residencyEligibility: ["resident"],
      propertyCategories: ["residential"],
      constructionStatuses: ["ready"],
      minAge: 21,
      maxAge: 70,
      minTenureMonths: 36,
      maxTenureMonths: 300,
      minCibil: 700,
      maxCibil: 900,
      minIncomeExact: "30000",
      maxIncomeExact,
      minLoanAmountExact: "2500000",
      maxLoanAmountExact: "1000000000",
      maxFoirExact: "70",
      minRoiExact: "8",
    },
  });
}

function stateOutcome(states: string[], applicant: string | null, income = 250_000) {
  const verdict = evaluateCanonicalEligibility(programme(states), customer(applicant, income), AS_OF);
  return verdict?.criteria?.find((row) => row.criterion === "state");
}

export function runPanIndiaEligibilityProof() {
  assert.equal(applicantStateMatchesProgramme("MH", ["PAN_INDIA"]), true);
  assert.equal(applicantStateMatchesProgramme("KA", ["PAN_INDIA"]), true);
  assert.equal(applicantStateMatchesProgramme("MH", ["MH"]), true);
  assert.equal(applicantStateMatchesProgramme("KA", ["MH"]), false);
  assert.equal(applicantStateMatchesProgramme("MH", ["MH", "KA"]), true);
  assert.equal(applicantStateMatchesProgramme("KA", ["MH", "KA"]), true);
  assert.equal(applicantStateMatchesProgramme("DL", ["MH", "KA"]), false);
  assert.equal(applicantStateMatchesProgramme("PAN_INDIA", ["PAN_INDIA"]), false);

  assert.equal(evaluateCanonicalEligibility(programme(["PAN_INDIA"]), customer("MH"), AS_OF), null);
  assert.equal(evaluateCanonicalEligibility(programme(["PAN_INDIA"]), customer("KA"), AS_OF), null);
  assert.equal(evaluateCanonicalEligibility(programme(["MH"]), customer("MH"), AS_OF), null);
  assert.equal(evaluateCanonicalEligibility(programme(["MH", "KA"]), customer("MH"), AS_OF), null);
  assert.equal(evaluateCanonicalEligibility(programme(["MH", "KA"]), customer("KA"), AS_OF), null);
  assert.equal(stateOutcome(["MH", "KA"], "DL")?.outcome, "FAIL");
  const explicitReject = stateOutcome(["MH"], "KA");
  assert.equal(explicitReject?.outcome, "FAIL");
  assert.equal(explicitReject?.reasonCode, "STATE_NOT_ELIGIBLE");
  assert.equal(explicitReject?.applicantValue, "KA");
  assert.equal(explicitReject?.requirement, "MH");

  const incomeReject = evaluateCanonicalEligibility(
    programme(["PAN_INDIA"], "10000000"),
    customer("MH", 250_000_000),
    AS_OF,
  );
  assert.equal(incomeReject?.reason, "ELIGIBILITY_NOT_MET");
  const income = incomeReject?.criteria?.find((row) => row.criterion === "monthlyIncome");
  assert.equal(income?.outcome, "FAIL");
  assert.equal(income?.applicantValue, 250_000_000);
  assert.equal(income?.requirement, "30000-10000000");
  assert.equal(stateOutcome(["PAN_INDIA"], "MH", 250_000_000)?.outcome, "PASS");

  const missingState = evaluateCanonicalEligibility(programme(["MH"]), customer(null), AS_OF);
  assert.equal(missingState?.reason, "ASSESSMENT_INPUT_REQUIRED");
  assert.equal(missingState?.missingInputs.includes("state"), true);
  assert.equal(missingState?.criteria?.find((row) => row.criterion === "state")?.outcome, "INFORMATION_REQUIRED");
  assert.notEqual(missingState?.reason, "ELIGIBILITY_NOT_MET");
}
