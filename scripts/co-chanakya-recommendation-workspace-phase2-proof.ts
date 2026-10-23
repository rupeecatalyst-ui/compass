/**
 * CHANAKYA recommendation workspace phase 2.
 * Fixtures only. No database, email provider, or production Opportunity.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY } from "../src/constants/opportunity-assessment-recommendation";
import {
  appendChanakyaRecalculation,
  projectCompassRecommendationHistory,
  rememberOriginalCompassRecommendation,
  stampCompassCustomerSelection,
} from "../src/lib/compass-customer-gateway/recommendation-history";
import {
  buildRecommendationClientMessage,
  buildRecommendationPdfHtml,
  nextRecommendationDispatchAttempt,
  recommendationDispatchDecision,
} from "../src/lib/compass-customer-gateway/recommendation-client-message";
import {
  classifyStoredRecommendationOutcome,
  GENERIC_MISSING_ASSESSMENT_NOTE,
  recalculationNote,
} from "../src/lib/compass-customer-gateway/recommendation-version-outcome";

const populated = [
  { label: "Employment", value: "Salaried" },
  { label: "Requested amount", value: "₹1,55,69,811" },
  { label: "Monthly income", value: "₹2,00,000" },
  { label: "CIBIL", value: "800+" },
];

const mislabeled = classifyStoredRecommendationOutcome({
  cards: [],
  note: GENERIC_MISSING_ASSESSMENT_NOTE,
  assessment: populated,
});
assert.equal(mislabeled.kind, "no_eligible_lenders");
assert.match(mislabeled.explanation ?? "", /saved assessment is present/);

const genuinelyMissing = classifyStoredRecommendationOutcome({
  cards: [],
  note: GENERIC_MISSING_ASSESSMENT_NOTE,
  assessment: [{ label: "Employment", value: "Salaried" }],
});
assert.equal(genuinelyMissing.kind, "missing_assessment");

const recommended = classifyStoredRecommendationOutcome({
  cards: [{ displayName: "HDFC Bank" }],
  note: GENERIC_MISSING_ASSESSMENT_NOTE,
  assessment: populated,
});
assert.equal(recommended.kind, "recommended");
assert.equal(recommended.explanation, null);

const unsupported = classifyStoredRecommendationOutcome({
  cards: [],
  note: OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.SELF_EMPLOYED_ASSESSMENT_UNSUPPORTED,
  assessment: populated,
});
assert.equal(unsupported.kind, "unsupported_methodology");

assert.equal(recalculationNote({
  workspaceState: "INFORMATION_REQUIRED",
  missingLabels: ["cibil"],
  guidance: GENERIC_MISSING_ASSESSMENT_NOTE,
  assessment: populated,
  resultReady: false,
}), OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.NO_ELIGIBLE_PROGRAMMES);

assert.match(recalculationNote({
  workspaceState: "INFORMATION_REQUIRED",
  missingLabels: ["Age"],
  guidance: GENERIC_MISSING_ASSESSMENT_NOTE,
  assessment: populated,
  resultReady: false,
}) ?? "", /Missing required assessment: Age/);

assert.equal(recalculationNote({
  workspaceState: "INFORMATION_COMPLETE",
  missingLabels: [],
  guidance: "ready",
  assessment: populated,
  resultReady: true,
}), null);

const original = rememberOriginalCompassRecommendation({
  compassAnswers: { incomeType: "salaried", approxCibilScore: "800_plus", loanAmount: "15569811" },
}, {
  recordedAt: "2026-10-23T08:00:00.000Z",
  journeyVersion: 2,
  recommendationBinding: "published",
  status: "ready",
  answers: { incomeType: "salaried", approxCibilScore: "800_plus", loanAmount: "15569811" },
  cards: [
    { displayName: "HDFC Bank", rank: 1, lenderRef: "lender:hdfc", programmeId: "prog-hdfc", interestRateLabel: "8.5%" },
    { displayName: "SBI", rank: 2, lenderRef: "lender:sbi", programmeId: "prog-sbi", interestRateLabel: "8.2%" },
  ],
});
const selected = stampCompassCustomerSelection(original.snapshot, [{
  lenderRef: "lender:sbi",
  lenderName: "SBI",
  programmeRef: "prog-sbi",
  programmeVersion: 3,
  interestRateLabel: "8.2%",
  estimatedEmiLabel: null,
  tenureLabel: null,
  processingTimeLabel: null,
  tentativeOfferLabel: null,
}], "2026-10-23T08:05:00.000Z");
const recalculated = appendChanakyaRecalculation(selected, {
  recordedAt: "2026-10-23T09:00:00.000Z",
  actorUserId: "employee-1",
  assessment: populated,
  cards: [{ displayName: "Axis Bank", rank: 1, lenderRef: "lender:axis", programmeId: "prog-axis", interestRateLabel: "8.4%" }],
  note: OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.NO_ELIGIBLE_PROGRAMMES,
});
const history = projectCompassRecommendationHistory(recalculated.snapshot);
assert.deepEqual(history.versions[0]?.cards.map((card) => [card.displayName, card.rank, card.customerPreference]), [
  ["HDFC Bank", 1, null],
  ["SBI", 2, 1],
]);
assert.equal(history.versions[1]?.cards[0]?.displayName, "Axis Bank");
assert.equal(history.versions[0]?.cards.some((card) => card.displayName === "Axis Bank"), false);

const first = history.versions[0];
const second = history.versions[1];
if (!first || !second) throw new Error("versions missing");
const firstMessage = buildRecommendationClientMessage({ version: first, customerName: "Rajnish Singh" });
const secondMessage = buildRecommendationClientMessage({ version: second, customerName: "" });
assert.equal(firstMessage.subject, "Your Home Loan Recommendations | Rupee Catalyst");
assert.equal(firstMessage.greeting, "Dear Rajnish Singh,");
assert.equal(secondMessage.greeting, "Hello,");
assert.equal(firstMessage.textBody.includes("HDFC Bank"), true);
assert.equal(firstMessage.textBody.includes("Axis Bank"), false);
assert.equal(secondMessage.textBody.includes("Axis Bank"), true);
assert.equal(secondMessage.textBody.includes("HDFC Bank"), false);
assert.equal(firstMessage.textBody.includes("800+"), false);
assert.equal(firstMessage.textBody.includes("₹2,00,000"), false);
assert.match(firstMessage.textBody, /indicative/);

const pdf = buildRecommendationPdfHtml({
  message: secondMessage,
  customerName: "Rajnish Singh",
  opportunityReference: "OPP-2026-000182",
  logoSrc: null,
});
assert.match(pdf, /Axis Bank/);
assert.equal(pdf.includes("HDFC Bank"), false);
assert.match(pdf, /Rupee Catalyst/);
assert.match(pdf, /OPP-2026-000182/);

assert.equal(recommendationDispatchDecision({
  records: [],
  versionNumber: 1,
  recipient: "customer@example.com",
  resend: false,
}), "send");
assert.equal(recommendationDispatchDecision({
  records: [{
    versionNumber: 1,
    recipient: "customer@example.com",
    actorUserId: "employee-1",
    attemptedAt: "2026-10-23T10:00:00.000Z",
    deliveryStatus: "sent",
    providerStatus: "250 accepted",
    failure: null,
    resend: false,
  }],
  versionNumber: 1,
  recipient: "Customer@example.com",
  resend: false,
}), "duplicate");
assert.equal(recommendationDispatchDecision({
  records: [{
    versionNumber: 1,
    recipient: "customer@example.com",
    actorUserId: "employee-1",
    attemptedAt: "2026-10-23T10:00:00.000Z",
    deliveryStatus: "sent",
    providerStatus: "250 accepted",
    failure: null,
    resend: false,
  }],
  versionNumber: 1,
  recipient: "customer@example.com",
  resend: true,
}), "send");
assert.equal(nextRecommendationDispatchAttempt([{
  versionNumber: 1,
  recipient: "customer@example.com",
  actorUserId: "employee-1",
  attemptedAt: "2026-10-23T10:00:00.000Z",
  deliveryStatus: "failed",
  providerStatus: null,
  failure: "SMTP_NOT_CONFIGURED",
  resend: false,
}], 1), 2);

const workspace = readFileSync("src/components/catalyst-one/chanakya/chanakya-recommendation-workspace.tsx", "utf8");
const route = readFileSync("src/app/api/enterprise-opportunities/[opportunityId]/chanakya-recommendation/route.ts", "utf8");
const delivery = readFileSync("server/services/opportunity-assessment/recommendation-client-delivery.ts", "utf8");
assert.equal(workspace.includes("VersionSelector"), true);
assert.equal(workspace.includes("Send Lender Recommendations to Client"), true);
assert.equal(workspace.includes("confirm: true"), true);
assert.equal(delivery.includes("enterpriseDeal.create"), false);
assert.equal(delivery.includes("dispatchOperationalTransactionEmail"), true);
assert.equal(route.includes("recalculationNote"), true);
assert.equal(route.includes("assertOpportunityReadAccess"), true);

console.log("co-chanakya-recommendation-workspace-phase2-proof: ok");
