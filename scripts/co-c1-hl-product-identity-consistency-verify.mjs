/**
 * Product-identity consistency.
 * Availability and programme mapping use the same catalog list as inventory.
 * Does not execute a production recommendation run.
 */
import assert from "node:assert/strict";
import { isCanonicalProgrammeAvailable } from "../server/services/lender-recommendation/programme-availability.ts";
import { mapCanonicalProgramme } from "../server/services/lender-recommendation/programme-assessment-adapter.ts";
import { evaluateCanonicalEligibility } from "../server/services/lender-recommendation/canonical-governed-eligibility.ts";
import { canonicalInventoryProductCodes } from "../src/constants/enterprise-product-master/canonical-catalog.ts";

const now = new Date("2026-10-01T21:00:00.000Z");
const organizationId = "org-1";

function available(productCode, product) {
  return isCanonicalProgrammeAvailable({
    programme: {
      organizationId,
      productCode,
      isDeleted: false,
      enabled: true,
      isLivePublished: true,
      publicationState: "published",
      completenessState: "complete",
      effectiveFrom: null,
      effectiveUntil: null,
    },
    organizationId,
    product,
    asOf: now,
  });
}

function policy(productCode, lenderId) {
  return {
    id: "policy-version-1",
    organizationId,
    policyId: "policy-1",
    versionNumber: 1,
    status: "published",
    eligibilityRules: {},
    creditRules: {},
    effectiveFrom: null,
    effectiveUntil: null,
    policy: {
      id: "policy-1",
      organizationId,
      lenderId,
      productCode,
      status: "published",
      currentPublishedVersionId: "policy-version-1",
      isDeleted: false,
    },
  };
}

function row(code, productCode) {
  const lenderId = `lender-${code}`;
  return {
    id: code,
    organizationId,
    lenderId,
    productCode,
    code,
    label: code,
    versionNumber: 1,
    transactionTypes: null,
    policyVersionId: "policy-version-1",
    policyVersion: policy("HOME_LOAN", lenderId),
    lender: {
      displayName: code,
      label: code,
      code,
      organizationId,
      enabled: true,
      isDeleted: false,
      lifecycleStatus: "active",
      operationalStatus: "active",
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
    minRoiExact: "7.000000",
    maxFoirExact: "70.000000",
    maxAge: 75,
    maxTenureMonths: 360,
  };
}

const customer = {
  journeyKind: "home_loan",
  employmentFamily: "salaried",
  requiredAmountRupees: 27500000,
  propertyValueRupees: 35000000,
  monthlyIncomeRupees: 500000,
  existingMonthlyEmiRupees: 0,
  customerSelectedTenureMonths: 240,
  ageYears: 47,
  cibilBand: "750_799",
  residency: "resident",
  constitution: "individual",
  state: "Maharashtra",
  propertyType: "residential",
  constructionStatus: "ready",
};

function reachesEligibility(code, storedProductCode) {
  assert.equal(available(storedProductCode, "HOME_LOAN"), true, `${code} availability`);
  const mapped = mapCanonicalProgramme({
    row: row(code, storedProductCode),
    product: "HOME_LOAN",
    lenderCategory: "A",
    asOf: now,
  });
  assert.equal(mapped.canonicalProduct, "HOME_LOAN");
  assert.equal(mapped.productCode, "HOME_LOAN");
  const verdict = evaluateCanonicalEligibility(mapped, customer, now);
  assert.ok(verdict === null || typeof verdict.reason === "string");
  assert.notEqual(verdict?.reason, "PROGRAMME_UNAVAILABLE");
  assert.notEqual(verdict?.reason, "PROGRAMME_PRODUCT_MISMATCH");
  return verdict;
}

assert.equal(available("HOME_LOAN", "HOME_LOAN"), true);
assert.equal(available("HOME-LOAN", "HOME_LOAN"), true);
assert.equal(available("NOT_A_REAL_PRODUCT", "HOME_LOAN"), false);
assert.equal(available(null, "HOME_LOAN"), false);

const seven = [
  "BASE_AXIS_HOME_LOAN",
  "BASE_BOI_HOME_LOAN",
  "BASE_BOM_HOME_LOAN",
  "BASE_HSBC_HOME_LOAN",
  "BASE_ICICI_HOME_LOAN",
  "BASE_SARASWAT_HOME_LOAN",
  "BASE_SBI_HOME_LOAN",
];
for (const code of seven) {
  assert.equal(available("HOME_LOAN", "HOME_LOAN"), true);
  const verdict = reachesEligibility(code, "HOME_LOAN");
  assert.equal(verdict, null, `${code} eligibility`);
}

assert.equal(reachesEligibility("CBI_HL_SAL_001", "HOME-LOAN"), null);
assert.equal(reachesEligibility("HDFC_HL_SAL_001", "HOME-LOAN"), null);

assert.equal(available("HOME_LOAN_BT", "HOME_LOAN_BT"), true);
assert.equal(available("HOME_LOAN", "HOME_LOAN_BT"), false);
assert.equal(available("HOME-LOAN", "HOME_LOAN_BT"), false);
assert.equal(available("HOME-LOAN-BT", "HOME_LOAN_BT"), true);
assert.equal(available("NOT_A_REAL_PRODUCT", "HOME_LOAN_BT"), false);
assert.ok(canonicalInventoryProductCodes("HOME_LOAN").includes("HOME-LOAN"));
assert.ok(canonicalInventoryProductCodes("HOME_LOAN_BT").includes("HOME-LOAN-BT"));
assert.ok(!canonicalInventoryProductCodes("HOME_LOAN").includes("HOME-LOAN-BT"));

console.log("co-c1-hl-product-identity-consistency-verify: PASS");
