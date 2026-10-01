/**
 * Binding-constraint correction.
 * Co-applicant is asked only when FOIR/income is the cap that sets the offer.
 * LTV, programme maximum, and a fully supported request do not ask.
 * Does not execute a recommendation run or change stored programmes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runHomeLoanRecommendationEngine } from "../src/lib/home-loan-recommendation/engine.ts";
import {
  canonicalInventoryProductCodes,
  canonicalProductPublicationDecision,
  resolveCanonicalProductCode,
} from "../src/constants/enterprise-product-master/canonical-catalog.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function programme(overrides) {
  return {
    id: "p",
    lenderId: "l",
    code: "HL",
    label: "Home Loan",
    versionNumber: 1,
    enabled: true,
    isLivePublished: true,
    publicationState: "published",
    completenessState: "complete",
    lenderCategory: "A",
    maxTenureMonths: 360,
    maxAge: 70,
    minRoiExact: 8.5,
    maxFoirExact: 70,
    maxLoanAmountExact: 10_00_00_000,
    ...overrides,
  };
}

function customer(overrides) {
  return {
    journeyKind: "home_loan",
    employmentFamily: "salaried",
    cibilBand: "750_799",
    existingMonthlyEmiRupees: 0,
    customerSelectedTenureMonths: 240,
    ageYears: 35,
    coApplicant: null,
    coApplicantDecision: null,
    ...overrides,
  };
}

function run(customerInput, programmes) {
  return runHomeLoanRecommendationEngine({
    customer: customer(customerInput),
    programmes,
  });
}

const ltvShortfall = run(
  {
    requiredAmountRupees: 2_75_00_000,
    propertyValueRupees: 3_50_00_000,
    monthlyIncomeRupees: 5_00_000,
    ageYears: 47,
  },
  [programme({ id: "ltv", code: "LTV", minRoiExact: 7.45, maxFoirExact: 70, maxAge: 65, maxTenureMonths: 300 })],
);
assert.equal(ltvShortfall.outcome, "lender_offers");
assert.equal(ltvShortfall.needsCoApplicantPrompt, false);
assert.equal(ltvShortfall.cards.length, 1);
assert.equal(ltvShortfall.cards[0].bindingConstraint, "LTV");
assert.equal(ltvShortfall.cards[0].matchState, "closest_feasible_option");
assert.equal(ltvShortfall.cards[0].tentativeOfferRupees, 2_62_50_000);
assert.equal(ltvShortfall.cards[0].shortfallRupees, 12_50_000);
assert.ok(ltvShortfall.cards[0].incomeSupportedAmountRupees > 2_75_00_000);

const foirShortfall = run(
  {
    requiredAmountRupees: 80_00_000,
    propertyValueRupees: 3_00_00_000,
    monthlyIncomeRupees: 40_000,
    ageYears: 35,
  },
  [programme({ id: "foir", code: "FOIR", minRoiExact: 9, maxFoirExact: 40, maxAge: 70 })],
);
assert.equal(foirShortfall.outcome, "lender_offers");
assert.equal(foirShortfall.cards.length, 1);
assert.equal(foirShortfall.cards[0].bindingConstraint, "FOIR");
assert.equal(foirShortfall.needsCoApplicantPrompt, true);
assert.ok(foirShortfall.cards[0].tentativeOfferRupees < 80_00_000);
assert.ok(foirShortfall.cards[0].ltvSupportedAmountRupees >= 80_00_000);
assert.equal(foirShortfall.cards[0].tentativeOfferRupees, foirShortfall.cards[0].incomeSupportedAmountRupees);

const bothBelow = run(
  {
    requiredAmountRupees: 90_00_000,
    propertyValueRupees: 80_00_000,
    monthlyIncomeRupees: 35_000,
    ageYears: 35,
  },
  [programme({ id: "both", code: "BOTH", minRoiExact: 9, maxFoirExact: 40, maxAge: 70 })],
);
assert.equal(bothBelow.cards.length, 1);
const both = bothBelow.cards[0];
assert.ok(both.ltvSupportedAmountRupees < 90_00_000);
assert.ok(both.incomeSupportedAmountRupees < 90_00_000);
assert.ok(both.incomeSupportedAmountRupees < both.ltvSupportedAmountRupees);
assert.equal(both.bindingConstraint, "FOIR");
assert.equal(both.tentativeOfferRupees, both.incomeSupportedAmountRupees);
assert.notEqual(both.tentativeOfferRupees, 90_00_000);
assert.equal(bothBelow.needsCoApplicantPrompt, true);
assert.equal(bothBelow.outcome, "lender_offers");

const programmeMaximum = run(
  {
    requiredAmountRupees: 80_00_000,
    propertyValueRupees: 3_00_00_000,
    monthlyIncomeRupees: 5_00_000,
    ageYears: 35,
  },
  [programme({ id: "max", code: "MAX", maxLoanAmountExact: 40_00_000, minRoiExact: 8, maxFoirExact: 70 })],
);
assert.equal(programmeMaximum.outcome, "lender_offers");
assert.equal(programmeMaximum.needsCoApplicantPrompt, false);
assert.equal(programmeMaximum.cards[0].bindingConstraint, "PROGRAMME_MAX");
assert.equal(programmeMaximum.cards[0].tentativeOfferRupees, 40_00_000);
assert.equal(programmeMaximum.cards[0].shortfallRupees, 40_00_000);
assert.ok(programmeMaximum.cards[0].incomeSupportedAmountRupees > 80_00_000);
assert.ok(programmeMaximum.cards[0].ltvSupportedAmountRupees > 80_00_000);

const fullSupport = run(
  {
    requiredAmountRupees: 20_00_000,
    propertyValueRupees: 1_00_00_000,
    monthlyIncomeRupees: 3_00_000,
    ageYears: 35,
  },
  [programme({ id: "full", code: "FULL", minRoiExact: 8, maxFoirExact: 70 })],
);
assert.equal(fullSupport.outcome, "lender_offers");
assert.equal(fullSupport.needsCoApplicantPrompt, false);
assert.equal(fullSupport.cards.length, 1);
assert.equal(fullSupport.cards[0].matchState, "standard_match");
assert.equal(fullSupport.cards[0].shortfallRupees, 0);
assert.equal(fullSupport.cards[0].bindingConstraint, null);
assert.equal(fullSupport.cards[0].tentativeOfferRupees, 20_00_000);

const neerajProgrammes = [
  ["AXIS", 7.45, 65, 300],
  ["BOI", 7.1, 75, 360],
  ["BOM", 7, 75, 360],
  ["HSBC", 7.25, 65, 240],
  ["ICICI", 7.45, 65, 300],
  ["SARASWAT", 7.75, 65, 240],
  ["SBI", 7.45, 75, 360],
].map(([code, roi, maxAge, maxTenureMonths]) =>
  programme({
    id: code,
    code,
    lenderId: code,
    minRoiExact: roi,
    maxAge,
    maxTenureMonths,
    maxFoirExact: 70,
  }),
);
const neeraj = run(
  {
    requiredAmountRupees: 2_75_00_000,
    propertyValueRupees: 3_50_00_000,
    monthlyIncomeRupees: 5_00_000,
    existingMonthlyEmiRupees: 0,
    customerSelectedTenureMonths: 240,
    ageYears: 47,
  },
  neerajProgrammes,
);
assert.equal(neeraj.outcome, "lender_offers");
assert.equal(neeraj.needsCoApplicantPrompt, false);
assert.equal(neeraj.cards.length, 7);
for (const card of neeraj.cards) {
  assert.equal(card.bindingConstraint, "LTV");
  assert.equal(card.matchState, "closest_feasible_option");
  assert.equal(card.tentativeOfferRupees, 2_62_50_000);
  assert.equal(card.shortfallRupees, 12_50_000);
  assert.equal(card.requiredAmountRupees, 2_75_00_000);
  assert.ok(card.incomeSupportedAmountRupees > 2_75_00_000);
}

const homeLoanCodes = canonicalInventoryProductCodes("HOME_LOAN");
assert.ok(homeLoanCodes.includes("HOME_LOAN"));
assert.ok(homeLoanCodes.includes("HOME-LOAN"));
assert.ok(!homeLoanCodes.includes("HOME_LOAN_BT"));
assert.ok(!homeLoanCodes.includes("HOME-LOAN-BT"));
for (const code of homeLoanCodes) {
  assert.equal(resolveCanonicalProductCode(code), "HOME_LOAN");
}
const btCodes = canonicalInventoryProductCodes("HOME_LOAN_BT");
assert.ok(btCodes.includes("HOME_LOAN_BT"));
assert.ok(btCodes.includes("HOME-LOAN-BT"));
assert.ok(!btCodes.includes("HOME-LOAN"));
for (const code of btCodes) {
  assert.equal(resolveCanonicalProductCode(code), "HOME_LOAN_BT");
}

assert.deepEqual(canonicalProductPublicationDecision("HOME_LOAN"), { ok: true, canonicalCode: "HOME_LOAN" });
assert.deepEqual(canonicalProductPublicationDecision("HOME-LOAN"), { ok: false, canonicalCode: "HOME_LOAN" });
assert.deepEqual(canonicalProductPublicationDecision("HOME_LOAN_BT"), { ok: true, canonicalCode: "HOME_LOAN_BT" });
assert.deepEqual(canonicalProductPublicationDecision("HOME-LOAN-BT"), { ok: false, canonicalCode: "HOME_LOAN_BT" });

const inventorySource = fs.readFileSync(
  path.join(root, "server/services/lender-recommendation/recommendation-programme.repository.ts"),
  "utf8",
);
assert.match(inventorySource, /canonicalInventoryProductCodes\(input\.product\)/);
assert.doesNotMatch(inventorySource, /CBI_HL_SAL_001|HDFC_HL_SAL_001/);

const publishSource = fs.readFileSync(
  path.join(root, "server/services/product-programme-operations/programme.service.ts"),
  "utf8",
);
const identityCheck = publishSource.indexOf("canonicalProductPublicationDecision(");
const publishWrite = publishSource.indexOf("publishApprovedProgram");
assert.ok(identityCheck > 0 && publishWrite > identityCheck);

const engineSource = fs.readFileSync(path.join(root, "src/lib/home-loan-recommendation/engine.ts"), "utf8");
assert.match(engineSource, /bindingConstraint === "FOIR"/);
assert.doesNotMatch(engineSource, /anyWouldBenefitFromCoApplicant/);

console.log("co-c1-hl-binding-constraint-verify: PASS");
