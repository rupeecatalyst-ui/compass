#!/usr/bin/env node
/** Stage 1 — published Home Loan programme identity, policy scope, eligibility, commercials. */
import assert from "node:assert/strict";
import { preferCanonicalLenderSurvivor } from "../src/lib/enterprise-lender-registry/presentation-canonical.ts";
import {
  canonicalStoredProductCode,
  rankPublishedProgrammes,
} from "../src/lib/enterprise-lender-registry/published-program-match.ts";
import {
  resolvePolicyForProgram,
  validateProgramCreditRiskPolicyRef,
} from "../src/lib/enterprise-lender-registry/resolve-program-policy.ts";
import { journeyRegistryKey } from "../src/lib/product-journey/publication.ts";
import { calculateMonthlyEmi } from "../src/lib/loan-emi-utils.ts";

assert.equal(canonicalStoredProductCode("HL_STD"), "HOME_LOAN");
assert.equal(canonicalStoredProductCode("home-loan"), "HOME_LOAN");
assert.equal(canonicalStoredProductCode("not-a-real-product"), null);
assert.equal(journeyRegistryKey("HOME_LOAN"), "home_loan");
assert.equal(journeyRegistryKey("HL_STD"), "home_loan");
assert.equal(journeyRegistryKey("home-loan"), "home_loan");

const cbi = preferCanonicalLenderSurvivor(
  { id: "bf", code: "BF_CENTRAL", label: "Central Bank of India" },
  { id: "cbi", code: "CBI", label: "Central Bank of India" },
);
assert.equal(cbi.code, "CBI");

assert.equal(validateProgramCreditRiskPolicyRef("policy_001", "lender_001").ok, true);
assert.equal(validateProgramCreditRiskPolicyRef("policy_001", "cms4cmnqu000fwen42ygnftpi").ok, false);
assert.equal(validateProgramCreditRiskPolicyRef("", "cms4cmnqu000fwen42ygnftpi").ok, true);

const cross = resolvePolicyForProgram({
  program: {
    id: "p1",
    lenderId: "cms4cmnqu000fwen42ygnftpi",
    productId: null,
    productCode: "HOME_LOAN",
    creditRiskPolicyRef: "policy_001",
  },
});
assert.equal(cross.ok, false);

function programme(overrides) {
  return {
    id: overrides.id,
    organizationId: "org",
    lenderId: overrides.lenderId,
    productCode: overrides.productCode ?? "HOME_LOAN",
    code: overrides.id,
    label: overrides.label,
    employmentType: overrides.employmentType ?? null,
    borrowerType: null,
    roiPercent: overrides.roiPercent ?? 8.5,
    minRoiPercent: null,
    maxRoiPercent: null,
    processingFeeLabel: null,
    processingFeePct: 0.5,
    maxFundingAmount: 10_00_00_000,
    maxLtvPercent: 80,
    maxTenureMonths: 240,
    minCibil: overrides.minCibil ?? 700,
    minIncomeAmount: overrides.minIncomeAmount ?? 50000,
    maxFoirPercent: null,
    maxDbrPercent: null,
    minFundingAmount: null,
    minAge: null,
    maxAge: null,
    creditRiskPolicyRef: null,
    requiredDocumentTypeIds: null,
    eligibleStates: null,
    eligibleCities: null,
    averageTatDays: overrides.averageTatDays ?? 15,
    remarks: null,
    lifecycleStatus: "active",
    status: "active",
    enabled: true,
    isLivePublished: true,
    publicationState: "published",
    completenessState: "complete",
    versionNumber: 1,
    isDeleted: false,
    approvalStatus: "none",
    createdBy: "test",
    modifiedBy: "test",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

const profile = {
  employmentType: "salaried",
  approxCibil: "750_799",
  monthlyIncome: 150000,
  existingEmi: 0,
  loanAmount: 50_00_000,
  propertyValue: 80_00_000,
};

const ranked = rankPublishedProgrammes({
  productCode: "Home Loan",
  profile,
  candidates: [
    {
      program: programme({
        id: "bf-prog",
        lenderId: "cms0zh7lo0005we64kzu4jay1",
        label: "Home Loan Program",
        employmentType: "salaried",
      }),
      lenderId: "cms0zh7lo0005we64kzu4jay1",
      lenderCode: "BF_CENTRAL",
      lenderName: "Central Bank of India",
      priorityRank: 1,
    },
    {
      program: programme({
        id: "cbi-prog",
        lenderId: "cms4cmnqu000fwen42ygnftpi",
        label: "CBI — Home Loan",
        employmentType: "salaried",
      }),
      lenderId: "cms4cmnqu000fwen42ygnftpi",
      lenderCode: "CBI",
      lenderName: "Central Bank of India",
      priorityRank: 1,
    },
    {
      program: programme({
        id: "se-only",
        lenderId: "other-lender",
        label: "SE only",
        employmentType: "self_employed",
        roiPercent: 9,
      }),
      lenderId: "other-lender",
      lenderCode: "OTHER",
      lenderName: "Other Housing",
      priorityRank: 2,
    },
  ],
});

assert.equal(ranked.length, 1);
assert.equal(ranked[0].lenderCode, "CBI");
assert.equal(ranked[0].interestRateLabel, "8.50%");
assert.equal(ranked[0].tenureLabel, "240 months");
assert.equal(ranked[0].processingTimeLabel, "15 days");
assert.equal(ranked[0].estimatedEmiLabel, `₹${calculateMonthlyEmi(50_00_000, 8.5, 240).toLocaleString("en-IN")}`);
assert.ok(ranked[0].matchScore >= 55 && ranked[0].matchScore <= 96);
assert.ok(ranked[0].reasons.some((reason) => reason.includes("Salaried")));

const selfEmployed = rankPublishedProgrammes({
  productCode: "HOME_LOAN",
  profile: { ...profile, employmentType: "self-employed-business" },
  candidates: [
    {
      program: programme({
        id: "cbi-prog",
        lenderId: "cms4cmnqu000fwen42ygnftpi",
        label: "CBI — Home Loan",
        employmentType: "salaried",
      }),
      lenderId: "cms4cmnqu000fwen42ygnftpi",
      lenderCode: "CBI",
      lenderName: "Central Bank of India",
      priorityRank: 1,
    },
    {
      program: programme({
        id: "se-only",
        lenderId: "other-lender",
        label: "SE Home Loan",
        employmentType: "self_employed",
        minCibil: 700,
      }),
      lenderId: "other-lender",
      lenderCode: "OTHER",
      lenderName: "Other Housing",
      priorityRank: 2,
    },
  ],
});
assert.equal(selfEmployed.length, 1);
assert.equal(selfEmployed[0].lenderCode, "OTHER");
assert.ok(selfEmployed[0].reasons.some((reason) => reason.includes("Self-employed")));

const lowCibil = rankPublishedProgrammes({
  productCode: "HOME_LOAN",
  profile: { ...profile, approxCibil: "below_600" },
  candidates: [
    {
      program: programme({
        id: "cbi-prog",
        lenderId: "cms4cmnqu000fwen42ygnftpi",
        label: "CBI — Home Loan",
      }),
      lenderId: "cms4cmnqu000fwen42ygnftpi",
      lenderCode: "CBI",
      lenderName: "Central Bank of India",
      priorityRank: 1,
    },
  ],
});
assert.equal(lowCibil.length, 0);

console.log("CO-HL-CAMPAIGN programme match verify: PASS");
