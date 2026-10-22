import assert from "node:assert/strict";
import { buildCompassAnswersPayload } from "../src/lib/declarable-journey-answers.ts";
import {
  COMMERCIAL_UNAVAILABLE,
  presentCustomerJourneyStages,
  publishedCommercialLabel,
} from "../src/lib/customer-journey-order.ts";

const published = [
  "welcome",
  "mobile",
  "otp",
  "displayName",
  "recommendation",
  "analysing",
  "lenders",
  "advantage",
  "email",
  "application",
  "review",
  "documents",
  "confirmation",
];

const ordered = presentCustomerJourneyStages("home-loan", published);
assert.deepEqual(ordered, [
  "welcome",
  "mobile",
  "otp",
  "displayName",
  "recommendation",
  "email",
  "application",
  "analysing",
  "advantage",
  "lenders",
  "documents",
  "review",
  "confirmation",
]);
assert.ok(ordered.indexOf("advantage") < ordered.indexOf("lenders"));
assert.ok(ordered.indexOf("lenders") < ordered.indexOf("documents"));
assert.ok(ordered.indexOf("documents") < ordered.indexOf("review"));
assert.deepEqual(presentCustomerJourneyStages("personal-loan", published), published);

assert.equal(publishedCommercialLabel(null), COMMERCIAL_UNAVAILABLE);
assert.equal(publishedCommercialLabel("  "), COMMERCIAL_UNAVAILABLE);
assert.equal(publishedCommercialLabel("8.50%"), "8.50%");
assert.equal(publishedCommercialLabel("₹42,000"), "₹42,000");

const payload = buildCompassAnswersPayload(
  {
    selectedLenderRef: "lender:cbi",
    selectedLenderName: "Central Bank of India",
    selectedProgrammeRef: "prog-hl-1",
    loanAmount: 5_000_000,
    collectedFacts: { loanAmount: true },
  },
  new Set(["selectedLenderRef", "selectedLenderName", "selectedProgrammeRef", "loanAmount"]),
);
assert.equal(payload.selectedLenderRef, "lender:cbi");
assert.equal(payload.selectedLenderName, "Central Bank of India");
assert.equal(payload.selectedProgrammeRef, "prog-hl-1");
assert.equal("8.50%" in payload, false);

const salaried = presentCustomerJourneyStages("home-loan", [
  "welcome",
  "incomeType",
  "monthlyIncome",
  "analysing",
  "lenders",
  "advantage",
  "documents",
  "review",
]);
assert.deepEqual(salaried.slice(-5), ["analysing", "advantage", "lenders", "documents", "review"]);

const selfEmployed = presentCustomerJourneyStages("home-loan-balance-transfer", [
  "welcome",
  "incomeType",
  "annualTurnover",
  "advantage",
  "lenders",
  "review",
  "documents",
  "confirmation",
]);
assert.deepEqual(selfEmployed.slice(-5), ["advantage", "lenders", "documents", "review", "confirmation"]);

console.log("co-compass-hl-journey-presentation-verify: pass");
