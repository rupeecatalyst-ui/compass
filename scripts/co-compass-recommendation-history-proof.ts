/**
 * COMPASS recommendation history. No database and no recommendation execution.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  appendChanakyaRecalculation,
  cardsFromGovernedResult,
  isCompassOriginSnapshot,
  projectCompassRecommendationHistory,
  rememberOriginalCompassRecommendation,
  stampCompassCustomerSelection,
} from "../src/lib/compass-customer-gateway/recommendation-history";
import type { CompassSelectedLender } from "../src/lib/compass-customer-gateway/borrower-lender-selection";
import type { CanonicalAssessmentSources } from "../server/services/opportunity-assessment/canonical-snapshot";

const originalCards = [
  {
    displayName: "HDFC Bank",
    rank: 1,
    lenderRef: "lender:hdfc",
    programmeId: "prog-hdfc",
    programmeVersion: 4,
    interestRateLabel: "8.5%",
    estimatedEmiLabel: "₹1,12,000",
    tenureLabel: "240 months",
    tentativeOfferLabel: "₹1,55,69,811",
    processingTimeLabel: "7 days",
    matchScore: 88,
    whyThisRecommendation: "This published programme matches the details you provided.",
  },
  {
    displayName: "ICICI Bank",
    rank: 2,
    lenderRef: "lender:icici",
    programmeId: "prog-icici",
    programmeVersion: 2,
    interestRateLabel: "8.7%",
    estimatedEmiLabel: null,
    tenureLabel: null,
    tentativeOfferLabel: null,
  },
];

const answers = {
  incomeType: "salaried",
  monthlyIncomeLabel: "₹2,00,000",
  existingEmi: "0",
  propertyCity: "mumbai-mh",
  propertyValueLabel: "₹2,00,00,000",
  loanAmount: "15569811",
  mobile: "9000000000",
  personalEmail: "hidden@example.com",
};

const first = rememberOriginalCompassRecommendation(
  { compassAnswers: answers, compassChannel: "organic" },
  {
    recordedAt: "2026-10-22T10:00:00.000Z",
    journeyVersion: 2,
    recommendationBinding: "governed_chanakya",
    cards: originalCards,
    answers,
    status: "ready",
  },
);
assert.equal(first.changed, true);
const second = rememberOriginalCompassRecommendation(first.snapshot, {
  recordedAt: "2026-10-23T10:00:00.000Z",
  journeyVersion: 9,
  recommendationBinding: "governed_chanakya",
  cards: [{ displayName: "Replacement", rank: 1, interestRateLabel: "1%" }],
  answers: { monthlyIncomeLabel: "₹1" },
  status: "ready",
});
assert.equal(second.changed, false);
assert.equal(second.snapshot, first.snapshot);

const lender: CompassSelectedLender = {
  lenderRef: "lender:hdfc",
  lenderName: "HDFC Bank",
  programmeRef: "prog-hdfc",
  programmeVersion: 4,
  interestRateLabel: "8.5%",
  estimatedEmiLabel: "₹1,12,000",
  tenureLabel: "240 months",
  processingTimeLabel: "7 days",
  tentativeOfferLabel: "₹1,55,69,811",
};
const selected = stampCompassCustomerSelection(first.snapshot, lender, "2026-10-22T10:05:00.000Z");
const viewed = projectCompassRecommendationHistory(selected);
assert.equal(viewed.compassOrigin, true);
assert.equal(viewed.originalListPersisted, true);
assert.equal(viewed.versions[0]?.title, "Recommendation 1 — Original COMPASS");
assert.equal(viewed.versions[0]?.cards[0]?.displayName, "HDFC Bank");
assert.equal(viewed.versions[0]?.cards[0]?.interestRateLabel, "8.5%");
assert.equal(viewed.versions[0]?.cards[0]?.customerSelected, true);
assert.equal(viewed.versions[0]?.cards[1]?.displayName, "ICICI Bank");
assert.equal(viewed.versions[0]?.cards[1]?.estimatedEmiLabel, null);
assert.equal(viewed.versions[0]?.cards[1]?.customerSelected, false);
assert.equal(viewed.versions[0]?.selectedLender?.lenderName, "HDFC Bank");
assert.equal(viewed.versions[0]?.cards[0]?.customerPreference, 1);
assert.equal(viewed.versions[0]?.cards[0]?.rank, 1);
const preferenceOrder = stampCompassCustomerSelection(selected, [
  {
    lenderRef: "lender:icici",
    lenderName: "ICICI Bank",
    programmeRef: "prog-icici",
    programmeVersion: 2,
  },
  lender,
], "2026-10-22T10:06:00.000Z");
const preferenceView = projectCompassRecommendationHistory(preferenceOrder);
assert.deepEqual(preferenceView.versions[0]?.cards.map((card) => card.displayName), ["HDFC Bank", "ICICI Bank"]);
assert.deepEqual(preferenceView.versions[0]?.cards.map((card) => card.rank), [1, 2]);
assert.deepEqual(
  preferenceView.versions[0]?.cards.map((card) => card.customerPreference),
  [2, 1],
);
assert.deepEqual(
  preferenceView.versions[0]?.selectedLenders.map((item) => item.lenderName),
  ["ICICI Bank", "HDFC Bank"],
);
const legacy = projectCompassRecommendationHistory({
  compassAnswers: { loanAmount: 1 },
  compassRecommendationVersions: [{
    versionNumber: 1,
    kind: "compass_original",
    recordedAt: "2026-10-22T09:00:00.000Z",
    cards: [{ displayName: "HDFC Bank", rank: 2, lenderRef: "lender:hdfc", programmeId: "prog-hdfc" }],
    customerSelectedLender: {
      lenderRef: "lender:hdfc",
      lenderName: "HDFC Bank",
      programmeRef: "prog-hdfc",
    },
  }],
});
assert.equal(legacy.versions[0]?.cards[0]?.rank, 2);
assert.equal(legacy.versions[0]?.cards[0]?.customerPreference, 1);
assert.equal(legacy.versions[0]?.selectedLenders.length, 1);
assert.equal(viewed.versions[0]?.assessment.some((line) => line.value === "₹2,00,000"), true);
assert.equal(viewed.versions[0]?.assessment.some((line) => line.value.includes("@")), false);
assert.equal(viewed.versions[0]?.journeyVersion, 2);

const recalculated = appendChanakyaRecalculation(selected, {
  recordedAt: "2026-10-23T11:00:00.000Z",
  actorUserId: "employee-1",
  assessment: [{ label: "Monthly income", value: "₹2,10,000" }],
  cards: [{ displayName: "Axis Bank", rank: 1, lenderRef: "lender:axis", interestRateLabel: "8.4%" }],
  note: null,
});
const again = appendChanakyaRecalculation(recalculated.snapshot, {
  recordedAt: "2026-10-23T12:00:00.000Z",
  actorUserId: "employee-2",
  assessment: [{ label: "Monthly income", value: "₹2,20,000" }],
  cards: [{ displayName: "SBI", rank: 1, lenderRef: "lender:sbi", interestRateLabel: "8.2%" }],
  note: null,
});
const history = projectCompassRecommendationHistory(again.snapshot);
assert.deepEqual(history.versions.map((version) => version.versionNumber), [1, 2, 3]);
assert.equal(history.versions[0]?.cards[0]?.displayName, "HDFC Bank");
assert.equal(history.versions[0]?.cards[0]?.interestRateLabel, "8.5%");
assert.equal(history.versions[1]?.title, "Recommendation 2 — CHANAKYA Recalculation");
assert.equal(history.versions[1]?.actorUserId, "employee-1");
assert.equal(history.versions[1]?.cards[0]?.displayName, "Axis Bank");
assert.equal(history.versions[2]?.actorUserId, "employee-2");

const historical = {
  compassChannel: "campaign",
  compassUpdatedAt: "2026-10-22T09:00:00.000Z",
  compassJourneyVersion: 2,
  compassAnswers: {
    incomeType: "salaried",
    monthlyIncomeLabel: "₹2,00,000",
    loanAmount: "15569811",
    mobile: "9000000000",
  },
  compassSelectedLender: {
    lenderRef: "lender:hdfc",
    lenderName: "HDFC Bank",
    programmeRef: "prog-hdfc",
    programmeVersion: 4,
  },
};
const unrestored = projectCompassRecommendationHistory(historical);
assert.equal(unrestored.originalListPersisted, false);
assert.equal(unrestored.versions[0]?.cards.length, 0);
assert.equal(unrestored.versions[0]?.note?.includes("not stored"), true);
assert.equal(unrestored.versions[0]?.selectedLender?.lenderName, "HDFC Bank");
assert.equal(unrestored.versions[0]?.selectedLender?.interestRateLabel, null);
assert.equal(unrestored.versions[0]?.assessment.some((line) => line.value === "₹2,00,000"), true);

const sources: CanonicalAssessmentSources = {
  opportunityId: "opp-1",
  productCode: "HOME_LOAN",
  transactionType: "fresh",
  employmentTypeCode: null,
  requestedAmount: null,
  monthlyIncomeRupees: null,
  existingMonthlyObligationsRupees: null,
  propertyValueRupees: null,
  cityLabel: null,
  stateLabel: null,
};
const prefilled = projectCompassRecommendationHistory(
  {
    compassAnswers: {
      incomeType: "salaried",
      monthlyIncomeLabel: "₹2,00,000",
      existingEmi: "0",
      propertyCity: "mumbai-mh",
      propertyValue: "20000000",
      loanAmount: "15569811",
    },
  },
  sources,
);
assert.equal(prefilled.prefill.some((item) => item.key === "incomeAndObligations.monthlyIncome" && item.value === "200000"), true);
assert.equal(prefilled.prefill.some((item) => item.key === "property.propertyCity" && item.value === "Mumbai" && item.state === "Maharashtra"), true);
assert.equal(prefilled.missingFactKeys.includes("incomeAndObligations.monthlyIncome"), false);
assert.equal(prefilled.missingFactKeys.includes("property.propertyCity"), false);

assert.equal(isCompassOriginSnapshot({ requestedAmount: 1 }), false);
assert.equal(projectCompassRecommendationHistory({ productCode: "HOME_LOAN" }).compassOrigin, false);
assert.equal(rememberOriginalCompassRecommendation({}, {
  recordedAt: "2026-10-22T10:00:00.000Z",
  journeyVersion: null,
  recommendationBinding: null,
  cards: originalCards,
  answers,
  status: "pending",
}).changed, false);
assert.deepEqual(cardsFromGovernedResult(null), []);

const root = "C:/hl-campaign-p0-integration-20261022";
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");
const historySource = read("src/lib/compass-customer-gateway/recommendation-history.ts");
const journey = read("server/services/compass-customer-gateway/compass-journey.service.ts");
const route = read("src/app/api/enterprise-opportunities/[opportunityId]/chanakya-recommendation/route.ts");
const life = read("src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx");
const workspace = read("src/components/catalyst-one/chanakya/chanakya-recommendation-workspace.tsx");
assert.equal(historySource.includes("recommendPublishedLendersFromOptions"), false);
assert.equal(historySource.includes("executeFinalizedAssessmentRecommendation"), false);
assert.equal(journey.includes("rememberOriginalCompassRecommendation"), true);
assert.equal(journey.includes("stampCompassCustomerSelection"), true);
assert.equal(route.includes("!isCompassOriginSnapshot(loaded.snapshot)"), true);
assert.equal(route.includes("appendChanakyaRecalculation"), true);
assert.equal(route.includes("projectChanakyaRecommendationWorkspace"), true);
assert.equal(route.includes("updateOpportunity"), true);
assert.equal(life.includes("Customer Selected Lender"), true);
assert.equal(life.includes("Manual Recommendation"), true);
assert.equal(life.includes("Move to Deal"), true);
assert.equal(life.includes("CHANAKYA needs additional information before lender strategy can be completed."), true);
assert.equal(workspace.includes("Recalculate"), true);
assert.equal(workspace.includes("Submit & Get Recommendation"), true);

console.log("co-compass-recommendation-history-proof: ok");
