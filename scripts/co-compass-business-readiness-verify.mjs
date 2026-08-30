#!/usr/bin/env node
/**
 * COMPASS Preview business-readiness — HLBT fields, borrower kind,
 * product-aware snapshots, EDIE LOD (no invented rules), Advantage / lender authority.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const {
  COMPASS_PRODUCT_REGISTRY,
  getCompassProductDefinition,
} = await import("../src/constants/compass-customer-gateway/product-registry.ts");
const {
  compassPersistedAnswerKeys,
  sanitizeCompassJourneyAnswers,
} = await import("../src/constants/compass-customer-gateway/snapshot-answers.ts");
const { answersToSnapshotFields } = await import(
  "../server/services/compass-customer-gateway/compass-opportunity-projection.ts"
);
const { generateOpportunityLod } = await import("../src/lib/document-requests/generate-lod.ts");
const { tryResolveEdieProductRef } = await import("../src/lib/edie-certified/resolve-context.ts");
const { computeCompassAdvantage } = await import(
  "../server/services/compass-customer-gateway/compass-advantage.service.ts"
);
const { projectCompassRecommendations } = await import(
  "../server/services/compass-customer-gateway/compass-recommendations.service.ts"
);
const { getDiscoveryStepOrder, getPersistedDiscoveryAnswerKeys } = await import(
  "../compass/src/config/compass-lending-products.ts"
);

const polluted = {
  loanAmount: 5000000,
  propertyValue: 8000000,
  propertyType: "ready",
  incomeType: "salaried",
  monthlyIncome: 150000,
  existingEmi: 0,
  city: "Mumbai",
  otpVerified: true,
  annualTurnover: 20000000,
  projectCost: 100000000,
  companyName: "Should Not Persist",
  currentLender: "Should Not Persist",
  outstandingLoanAmount: 3200000,
};

const hlbtSteps = getDiscoveryStepOrder("home-loan-balance-transfer");
assert.ok(hlbtSteps.includes("currentLender"));
assert.ok(hlbtSteps.includes("outstandingLoanAmount"));
assert.equal(getDiscoveryStepOrder("home-loan").includes("currentLender"), false);

const hlbtSanitized = sanitizeCompassJourneyAnswers("home-loan-balance-transfer", {
  ...polluted,
  currentLender: "HDFC Bank",
  outstandingLoanAmount: 3200000,
  existingEmi: 35000,
});
assert.equal(hlbtSanitized.currentLender, "HDFC Bank");
assert.equal(hlbtSanitized.outstandingLoanAmount, 3200000);
assert.equal(hlbtSanitized.annualTurnover, undefined);
assert.equal(hlbtSanitized.projectCost, undefined);
assert.equal(hlbtSanitized.companyName, undefined);
const hlbtMapped = answersToSnapshotFields(hlbtSanitized);
assert.equal(hlbtMapped.productFields.currentLendingInstitution, "HDFC Bank");
assert.equal(hlbtMapped.productFields.outstandingLoanAmount, "3200000");
assert.equal(getCompassProductDefinition("home-loan-balance-transfer").enterpriseProductCode, "HOME_LOAN_BT");
assert.equal(getCompassProductDefinition("home-loan").enterpriseProductCode, "HOME_LOAN");

const companyProducts = ["business-loan", "working-capital", "construction-finance", "project-finance"];
for (const code of companyProducts) {
  assert.equal(getCompassProductDefinition(code).borrowerKind, "company", code);
}
for (const code of ["home-loan", "home-loan-balance-transfer", "personal-loan", "loan-against-property"]) {
  assert.equal(getCompassProductDefinition(code).borrowerKind, "individual", code);
}

const pl = sanitizeCompassJourneyAnswers("personal-loan", polluted);
assert.equal(pl.projectCost, undefined);
assert.equal(pl.annualTurnover, undefined);
assert.equal(pl.propertyValue, undefined);
assert.equal(pl.propertyType, undefined);
assert.equal(pl.loanAmount, 5000000);
assert.equal(pl.incomeType, "salaried");

const hl = sanitizeCompassJourneyAnswers("home-loan", polluted);
assert.equal(hl.projectCost, undefined);
assert.equal(hl.annualTurnover, undefined);
assert.equal(hl.propertyValue, 8000000);
assert.equal(hl.currentLender, undefined);

const bl = sanitizeCompassJourneyAnswers("business-loan", {
  ...polluted,
  companyName: "Acme Traders",
  constitution: "private_limited",
});
assert.equal(bl.companyName, "Acme Traders");
assert.equal(bl.annualTurnover, 20000000);
assert.equal(bl.projectCost, undefined);
assert.equal(bl.propertyValue, undefined);

const wc = sanitizeCompassJourneyAnswers("working-capital", {
  ...polluted,
  companyName: "WC Co",
  constitution: "proprietorship",
  facilityType: "cash_credit",
});
assert.equal(wc.facilityType, "cash_credit");
assert.equal(wc.annualTurnover, 20000000);
assert.equal(wc.projectCost, undefined);

const cf = sanitizeCompassJourneyAnswers("construction-finance", {
  ...polluted,
  companyName: "Builder LLP",
  constitution: "llp",
  projectCost: 50000000,
});
assert.equal(cf.projectCost, 50000000);
assert.equal(cf.annualTurnover, undefined);

const lap = sanitizeCompassJourneyAnswers("loan-against-property", {
  ...polluted,
  propertyUsage: "self-occupied",
});
assert.equal(lap.propertyUsage, "self-occupied");
assert.equal(lap.propertyValue, 8000000);
assert.equal(lap.projectCost, undefined);
assert.equal(lap.annualTurnover, undefined);

for (const code of COMPASS_PRODUCT_REGISTRY.map((p) => p.compassCode)) {
  const compassKeys = new Set(getPersistedDiscoveryAnswerKeys(code));
  const c1Keys = compassPersistedAnswerKeys(code);
  for (const key of compassKeys) {
    assert.ok(c1Keys.has(key), `${code} compass key ${key} missing from C1 allowlist`);
  }
}

const journeyService = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-journey.service.ts"),
  "utf8",
);
assert.match(journeyService, /primaryBorrowerKind:\s*definition\.borrowerKind/);
assert.doesNotMatch(journeyService, /primaryBorrowerKind:\s*"individual"/);
assert.match(journeyService, /COMPANY_REQUIRED/);
assert.match(journeyService, /compassSubmitMissingCompany/);
assert.match(journeyService, /decideOpportunityBorrowerCreate|COMPASS_WEBSITE_SOURCE_CODE/);

const hlLod = generateOpportunityLod({
  productLabel: "HOME_LOAN",
  employmentType: "salaried",
  transactionType: "fresh",
  contactChannelPolicy: "compass_public",
});
assert.ok(hlLod.length > 0, "HOME_LOAN EDIE LOD must return items");
assert.ok(hlLod.some((item) => item.mandatory));

const hlbtLod = generateOpportunityLod({
  productLabel: "HOME_LOAN_BT",
  employmentType: "salaried",
  transactionType: "balance_transfer",
  contactChannelPolicy: "compass_public",
});
assert.ok(hlbtLod.length > 0, "HOME_LOAN_BT EDIE LOD must return items");

const plLod = generateOpportunityLod({
  productLabel: "PERSONAL_LOAN",
  employmentType: "salaried",
  transactionType: "fresh",
  contactChannelPolicy: "compass_public",
});
assert.ok(plLod.length > 0, "PERSONAL_LOAN EDIE LOD must return items");

const lapLod = generateOpportunityLod({
  productLabel: "LAP",
  employmentType: "salaried",
  transactionType: "fresh",
  contactChannelPolicy: "compass_public",
});
assert.ok(lapLod.length > 0, "LAP EDIE LOD must return items");

const blLod = generateOpportunityLod({
  productLabel: "BUSINESS_LOAN_UNSECURED",
  borrowerCategory: "company",
  constitution: "private_limited",
  transactionType: "fresh",
  contactChannelPolicy: "compass_public",
});
assert.ok(blLod.length > 0, "BUSINESS_LOAN_UNSECURED EDIE LOD must return items");

assert.equal(tryResolveEdieProductRef("WORKING_CAPITAL_SECURED").ok, false);
assert.equal(tryResolveEdieProductRef("CONSTRUCTION_FINANCE").ok, false);
assert.equal(tryResolveEdieProductRef("PROJECT_FINANCE").ok, false);

let wcLodFailed = false;
try {
  generateOpportunityLod({
    productLabel: "WORKING_CAPITAL_SECURED",
    borrowerCategory: "company",
    constitution: "proprietorship",
    contactChannelPolicy: "compass_public",
  });
} catch {
  wcLodFailed = true;
}
assert.equal(wcLodFailed, true, "must not invent Working Capital LOD");

const recService = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-recommendations.service.ts"),
  "utf8",
);
assert.match(recService, /interestRateLabel:\s*null/);
assert.doesNotMatch(recService, /8\.5%|fake rate|mock lender/i);

const emptyRec = await projectCompassRecommendations({
  detail: {
    opportunityId: "opp",
    reference: "OPP-TEST",
    customerId: "c1",
    customerDisplayName: "Test",
    productCode: "HOME_LOAN",
    productLabel: "Home Loan",
    requiredAmountLabel: "50,00,000",
    stageLabel: "Draft",
    lifecycleStatus: "draft",
    ownerLabel: "COMPASS",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    summary: "",
    dtoSource: "enterprise_opportunity_registry",
    dtoNotice: "",
    primaryBorrowerKind: "individual",
    borrowerFields: { employmentTypeCode: "salaried", city: "Mumbai" },
    productFields: { requestedAmountLabel: "5000000", transactionType: "fresh" },
    documents: [],
    activities: [],
    timeline: [],
    loanFile: {
      available: false,
      fileId: null,
      fileReference: null,
      stageLabel: null,
      lenderLabel: null,
      amountLabel: null,
      statusLabel: "Not attached",
      message: "",
      dtoSource: "enterprise_opportunity_registry",
      dtoNotice: "",
    },
    sourceAttribution: {
      sourcePartnerId: "",
      sourcePartnerName: "COMPASS",
      sourcePartnerCode: "website_compass",
      sourceType: "website_compass",
      organizationId: "",
      branchLabel: null,
      territoryLabel: null,
      hiddenFromPartnerUi: true,
    },
  },
  productCode: "home-loan",
  registryOptions: [],
  city: "Mumbai",
});
assert.equal(emptyRec.status, "pending");
assert.equal(emptyRec.cards.length, 0);

const adv = computeCompassAdvantage({
  productCode: "home-loan",
  loanAmount: 5000000,
  monthlyIncome: 200000,
  propertyValue: 8000000,
  propertyType: "ready",
});
assert.equal(adv.status, "not_available");
assert.equal(adv.amount, null);
assert.equal(adv.eligible, false);

const advService = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-advantage.service.ts"),
  "utf8",
);
assert.doesNotMatch(advService, /0\.0045|ltvFactor|baseRate|eligibleAmount\s*=/);

console.log("CO-COMPASS-BUSINESS-READINESS verify: PASS");
console.log(
  JSON.stringify(
    {
      hlLod: hlLod.length,
      hlbtLod: hlbtLod.length,
      plLod: plLod.length,
      lapLod: lapLod.length,
      blLod: blLod.length,
      wcCfPfLod: "edie_phase1_excluded",
    },
    null,
    2,
  ),
);
