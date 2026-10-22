import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCompassAnswersPayload } from "../src/lib/declarable-journey-answers.ts";
import {
  COMMERCIAL_UNAVAILABLE,
  presentCustomerJourneyStages,
  publishedCommercialLabel,
} from "../src/lib/customer-journey-order.ts";
import { isVacantApplicationStage } from "../src/lib/journey-config.ts";
import { lenderMatchAction } from "../src/lib/lender-match-request.ts";

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
  "advantage",
  "lenders",
  "documents",
  "review",
  "confirmation",
]);
assert.equal(ordered.includes("analysing"), false);
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
assert.deepEqual(salaried.slice(-4), ["advantage", "lenders", "documents", "review"]);
assert.equal(salaried.includes("analysing"), false);

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

assert.equal(isVacantApplicationStage("application", { fields: [] } as never), true);
assert.equal(
  isVacantApplicationStage("application", {
    fields: [{ fieldId: "personalEmail", purpose: "application" }],
  } as never),
  false,
);
assert.equal(isVacantApplicationStage("email", { fields: [] } as never), false);

assert.equal(lenderMatchAction({ loading: false, failed: false, ready: false }), "start");
assert.equal(lenderMatchAction({ loading: true, failed: false, ready: false }), "wait");
assert.equal(lenderMatchAction({ loading: true, failed: true, ready: false }), "wait");
assert.equal(lenderMatchAction({ loading: false, failed: true, ready: false }), "retry");
assert.equal(lenderMatchAction({ loading: false, failed: false, ready: true }), "open");

const lendersSource = readFileSync(
  new URL("../src/components/home-loan-experience/discovery/discovery-lenders-step.tsx", import.meta.url),
  "utf8",
);
assert.match(lendersSource, /grid-cols-2/);
assert.match(lendersSource, /sm:grid-cols-3/);
assert.match(lendersSource, /min-h-11/);
assert.match(lendersSource, /text-accent/);
assert.match(lendersSource, /Eligible offer/);
assert.match(lendersSource, /Requested amount/);
assert.match(lendersSource, /Processing time/);
assert.match(lendersSource, /Select this lender/);
assert.match(lendersSource, /Try again/);

const advantageSource = readFileSync(
  new URL("../src/components/home-loan-experience/discovery/discovery-advantage-step.tsx", import.meta.url),
  "utf8",
);
assert.match(advantageSource, /lenderMatchAction/);
assert.match(advantageSource, /LENDER_MATCH_LOADING_MESSAGES/);
assert.match(advantageSource, /aria-busy="true"/);
assert.doesNotMatch(advantageSource, /onClick=\{goNext\}/);

console.log("co-compass-hl-journey-presentation-verify: pass");
