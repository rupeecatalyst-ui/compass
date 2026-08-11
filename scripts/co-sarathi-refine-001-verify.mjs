/**
 * CO-SARATHI-REFINE-001 — Conversation Experience v2.0 static + scenario verify.
 * Experience-layer only — does not assert new engines.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const constants = read("src/constants/enterprise-ai-platform/conversation-experience.ts");
assert.match(constants, /3\.0\.0-ux001|2\.0\.0-refine/);
assert.match(constants, /Your Financial Intelligence Partner/);
assert.match(constants, /I'll help you understand your loan options|How can I help you today/);

const workspace = read(
  "src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx",
);
assert.match(workspace, /CustomerSummaryCard/);
assert.match(workspace, /summary_pending|confirmed|advising/);
assert.match(workspace, /emitActionProposals:\s*emitProposals/);
assert.doesNotMatch(workspace, /Enterprise AI Platform/);
assert.doesNotMatch(workspace, /Proposals Only|CRM Disabled/i);

const welcome = read("src/components/catalyst-one/sarathi/conversation-message-list.tsx");
assert.match(welcome, /EAI_SARATHI_WELCOME/);
assert.doesNotMatch(welcome, /Enterprise AI Platform|Draft|Proposals Only/i);

const ux = read("src/lib/enterprise-ai-platform/conversation-experience/ux-flow.ts");
assert.match(ux, /primaryAdaptiveQuestionForProduct/);
assert.match(ux, /isSarathiSummaryReady/);
assert.match(ux, /detectSarathiProductContext/);

assert.equal(
  existsSync(join(root, "src/components/catalyst-one/sarathi/customer-summary-card.tsx")),
  true,
);

const docs = [
  "docs/co-sarathi-refine-001/CO-SARATHI-REFINE-001-UX-IMPROVEMENT-REPORT.md",
  "docs/co-sarathi-refine-001/CO-SARATHI-REFINE-001-CONVERSATION-FLOW-REPORT.md",
  "docs/co-sarathi-refine-001/CO-SARATHI-REFINE-001-PRODUCT-OWNER-CHANGE-SUMMARY.md",
  "docs/co-sarathi-refine-001/CO-SARATHI-REFINE-001-KNOWN-LIMITATIONS.md",
  "docs/co-sarathi-refine-001/CO-SARATHI-REFINE-001-BEFORE-VS-AFTER-SCREENSHOTS.md",
];
for (const d of docs) {
  assert.equal(existsSync(join(root, d)), true, `Missing deliverable ${d}`);
}

const {
  detectSarathiProductContext,
  primaryAdaptiveQuestionForProduct,
  isSarathiSummaryReady,
  mapConsultationFactsToSummary,
  runEaiSarathiConversationTurn,
} = await import("../src/lib/enterprise-ai-platform/conversation-experience/index.ts");

const productCases = [
  ["I need a Home Loan", "home_loan", "What is the property's approximate value?"],
  ["I want a Balance Transfer", "balance_transfer", "Which bank is your current loan with?"],
  ["I need a Loan Against Property", "lap", "What will you use the funds for?"],
  ["I need a Business Loan", "business_loan", "What type of business do you operate?"],
  ["I need Working Capital", "working_capital", "What type of business do you operate?"],
  ["I need a Personal Loan", "personal_loan", "What amount are you considering?"],
];

for (const [utterance, product, question] of productCases) {
  assert.equal(detectSarathiProductContext(utterance), product);
  assert.equal(primaryAdaptiveQuestionForProduct(product), question);
}

assert.equal(
  isSarathiSummaryReady({
    userTurnCount: 1,
    factCount: 5,
    product: "home_loan",
  }),
  false,
  "Summary must not ready on first turn",
);

assert.equal(
  isSarathiSummaryReady({
    userTurnCount: 3,
    factCount: 3,
    product: "home_loan",
  }),
  true,
);

const summary = mapConsultationFactsToSummary(
  [
    { key: "required_amount", value: "₹45 Lakhs" },
    { key: "purpose", value: "Purchase" },
    { key: "employment", value: "Salaried" },
    { key: "location", value: "Mumbai" },
  ],
  "home_loan",
);
assert.ok(summary.some((r) => r.label === "Loan Type" && r.value === "Home Loan"));
assert.ok(summary.some((r) => r.label === "Amount"));

const outside = await runEaiSarathiConversationTurn({
  utterance: "Who will win the cricket world cup?",
  emitActionProposals: false,
});
assert.equal(outside.blocked, true);
assert.match(outside.facingText, /I'm not trained for this subject/);
assert.equal(outside.actionProposals.length, 0);

const consult = await runEaiSarathiConversationTurn({
  utterance: "I need a Home Loan",
  emitActionProposals: false,
});
assert.equal(consult.blocked, false);
assert.equal(consult.actionProposals.length, 0, "No proposals before confirmation emit");

const mixed = await runEaiSarathiConversationTurn({
  utterance: "I am salaried in Mumbai and need about 45 lakh for purchase",
  continuity: consult.continuity,
  emitActionProposals: false,
});
assert.equal(mixed.actionProposals.length, 0);
assert.ok(mixed.suggestedQuestions.length <= 2);

console.log("CO-SARATHI-REFINE-001 Conversation Experience v2.0 verify: PASS");
console.log("  Welcome · Adaptive Q · Summary gate · Domain refusal · No early proposals");
