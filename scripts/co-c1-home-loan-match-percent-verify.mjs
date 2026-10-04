import assert from "node:assert/strict";
let databaseAttempts = 0;
globalThis.prisma = new Proxy({}, { get() { databaseAttempts++; throw new Error("DATABASE_FORBIDDEN"); } });
const { runHomeLoanMatchPercentProof } = await import("../src/lib/product-recommendation/home-loan-match-percent-proof.ts");
const { evaluateCanonicalEligibility } = await import("../server/services/lender-recommendation/canonical-governed-eligibility.ts");
const { mapCanonicalProgramme } = await import("../server/services/lender-recommendation/programme-assessment-adapter.ts");
await runHomeLoanMatchPercentProof();

const now = new Date("2026-09-21T12:00:00Z");
function programme(id, patch = {}) {
  return {
    id,
    organizationId: "synthetic-org",
    lenderId: `lender-${id}`,
    productCode: "HOME_LOAN",
    code: id,
    label: id,
    versionNumber: 1,
    transactionTypes: null,
    policyVersionId: `version-${id}`,
    policyVersion: {
      id: `version-${id}`,
      organizationId: "synthetic-org",
      policyId: `policy-${id}`,
      versionNumber: 1,
      status: "published",
      eligibilityRules: {},
      creditRules: {},
      effectiveFrom: null,
      effectiveUntil: null,
      policy: {
        id: `policy-${id}`,
        organizationId: "synthetic-org",
        lenderId: `lender-${id}`,
        productCode: "HOME_LOAN",
        status: "published",
        currentPublishedVersionId: `version-${id}`,
        isDeleted: false,
      },
    },
    lender: {
      displayName: id,
      label: id,
      code: id,
      organizationId: "synthetic-org",
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
    minIncomeExact: "30000",
    maxLoanAmountExact: "100000000",
    maxFoirExact: "70",
    minRoiExact: "8.5",
    maxLtvExact: "90",
    minCibil: 700,
    maxCibil: 900,
    minAge: 21,
    maxAge: 70,
    minTenureMonths: 12,
    maxTenureMonths: 360,
    ...patch,
  };
}

const salaried = {
  journeyKind: "home_loan",
  requiredAmountRupees: 50000000,
  propertyValueRupees: 75000000,
  employmentFamily: "salaried",
  employmentType: "salaried",
  monthlyIncomeRupees: 800000,
  existingMonthlyEmiRupees: 100000,
  residency: "resident",
  cibilBand: 650,
  ageYears: 25,
  dateOfBirth: "2001-01-01",
  customerSelectedTenureMonths: 240,
  coApplicantDecision: "no",
  propertyType: "residential",
  constructionStatus: "ready",
  state: "test-state",
  city: "test-city",
};

const floor700 = mapCanonicalProgramme({
  row: programme("fixture-cibil-floor-700", { minCibil: 700 }),
  product: "HOME_LOAN",
  lenderCategory: "C",
  asOf: now,
});
const floor650 = mapCanonicalProgramme({
  row: programme("fixture-cibil-floor-650", { minCibil: 650 }),
  product: "HOME_LOAN",
  lenderCategory: "C",
  asOf: now,
});
const missingRoi = mapCanonicalProgramme({
  row: programme("fixture-missing-comparable-roi", { minRoiExact: null, minRoiPercent: null }),
  product: "HOME_LOAN",
  lenderCategory: "A",
  asOf: now,
});

const rejected700 = evaluateCanonicalEligibility(floor700, salaried, now);
assert.ok(rejected700);
assert.equal(rejected700.reason, "ELIGIBILITY_NOT_MET");
const accepted650 = evaluateCanonicalEligibility(floor650, salaried, now);
assert.equal(accepted650, null);
const retainedMissingRoi = evaluateCanonicalEligibility(missingRoi, {
  ...salaried,
  cibilBand: 750,
  requiredAmountRupees: 25000000,
  propertyValueRupees: 30000000,
  monthlyIncomeRupees: 500000,
  existingMonthlyEmiRupees: 10000,
  ageYears: 35,
  dateOfBirth: "1991-01-01",
}, now);
assert.equal(retainedMissingRoi, null);
console.log("UAT programme-level CIBIL and missing-ROI eligibility: PASS");
assert.equal(databaseAttempts, 0);
console.log("DATABASE_ACCESSED: NO");
