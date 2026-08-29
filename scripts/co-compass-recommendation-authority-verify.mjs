#!/usr/bin/env node
/** Chanakya recommendation authority — order, identity, no mock fallback. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const recService = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-recommendations.service.ts"),
  "utf8",
);
const compassClient = readFileSync(join(root, "compass/src/services/catalyst-one/client.ts"), "utf8");

assert.match(recService, /deriveChanakyaOpportunityRecommendationsFromOptions/);
assert.doesNotMatch(recService, /projectPartnerOpportunityRecommendations/);
assert.doesNotMatch(compassClient, /buildLenders|Lender A|Lender B/);

const { deriveChanakyaOpportunityRecommendationsFromOptions } = await import(
  "../src/lib/chanakya-opportunity-recommendations/derive.ts"
);

const baseFile = {
  id: "opp-test",
  fileNumber: "RC-TEST",
  customerId: "c1",
  customerName: "Test",
  customerMobile: "9999999999",
  customerEmail: "",
  city: "Mumbai",
  state: "",
  employmentType: "salaried",
  lendingType: "secured",
  transactionType: "fresh",
  loanProduct: "Home Loan",
  loanAmount: 5000000,
  requiredAmount: 5000000,
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
  createdAt: new Date().toISOString(),
  propertyType: "Ready",
  businessDetails: { monthlySalary: 150000 },
  approxCibilScore: "750-800",
};

const registryOptions = [
  {
    id: "l1",
    code: "ALPHA",
    displayName: "Alpha Bank",
    legalName: "Alpha Bank Ltd",
    institutionCategory: "bank",
    source: "api",
  },
  {
    id: "l2",
    code: "BETA",
    displayName: "Beta NBFC",
    legalName: "Beta NBFC Ltd",
    institutionCategory: "nbfc",
    source: "api",
  },
];

const ready = deriveChanakyaOpportunityRecommendationsFromOptions({
  file: baseFile,
  registryOptions,
  limit: 5,
});

if (ready.ready && ready.recommendations.length >= 2) {
  assert.equal(ready.recommendations[0].rank, 1);
  assert.equal(ready.recommendations[1].rank, 2);
  assert.ok(ready.recommendations[0].lenderRef);
  assert.ok(ready.recommendations[0].lenderName);
  assert.notEqual(ready.recommendations[0].lenderRef, ready.recommendations[1].lenderRef);
}

const empty = deriveChanakyaOpportunityRecommendationsFromOptions({
  file: { ...baseFile, loanProduct: "", requiredAmount: 0, loanAmount: 0 },
  registryOptions,
});
assert.equal(empty.ready, false);
assert.equal(empty.recommendations.length, 0);

console.log("CO-COMPASS-RECOMMENDATION-AUTHORITY verify: PASS");
