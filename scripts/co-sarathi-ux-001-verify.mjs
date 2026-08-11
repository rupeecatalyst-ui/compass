/**
 * CO-SARATHI-UX-001 — Natural consultation experience verify.
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
assert.match(constants, /3\.2\.0-vision-w1|3\.1\.0-ux002|3\.0\.0-ux001/);
assert.match(constants, /Your Financial Intelligence Partner/);

const workspace = read(
  "src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx",
);
assert.match(workspace, /deriveSarathiConsultationConfidence|proposalsUnlockedRef/);
assert.doesNotMatch(workspace, /Enterprise AI Platform|Proposals Only/i);
// WAVE-1: questionnaire chips fully retired
assert.doesNotMatch(workspace, /showWelcomeChips|welcomeChips|SuggestedQuestionsBar/);

const suggested = read(
  "src/lib/enterprise-ai-platform/conversation-experience/suggested-questions.ts",
);
assert.doesNotMatch(suggested, /What amount are you looking for\?/);
assert.doesNotMatch(suggested, /Do you have KYC/);
assert.match(suggested, /return \[\]/);

const docs = [
  "docs/co-sarathi-ux-001/CO-SARATHI-UX-001-BEFORE-VS-AFTER.md",
  "docs/co-sarathi-ux-001/CO-SARATHI-UX-001-CONVERSATION-FLOW-EXAMPLES.md",
  "docs/co-sarathi-ux-001/CO-SARATHI-UX-001-KNOWN-LIMITATIONS.md",
  "docs/co-sarathi-ux-001/CO-SARATHI-UX-001-PRODUCT-OWNER-SUMMARY.md",
];
for (const d of docs) {
  assert.equal(existsSync(join(root, d)), true, `Missing ${d}`);
}

const {
  deriveSarathiConsultationConfidence,
  isSarathiSummaryReady,
  shapeSarathiConsultantFacing,
  runEaiSarathiConversationTurn,
  resolveEaiSarathiSuggestedQuestions,
} = await import("../src/lib/enterprise-ai-platform/conversation-experience/index.ts");

// Early summary blocked
assert.equal(
  deriveSarathiConsultationConfidence({
    product: "lap",
    facts: [{ key: "product_interest", value: "LAP" }],
    userTurnCount: 1,
  }).readyForSummary,
  false,
);

assert.equal(
  isSarathiSummaryReady({
    userTurnCount: 1,
    factCount: 5,
    product: "lap",
    consultationConfidence: 20,
  }),
  false,
);

// WAVE-1: chips fully retired
assert.deepEqual(
  resolveEaiSarathiSuggestedQuestions({
    plannerPlan: {
      selectedQuestions: [{ questionId: "q1", slotId: "purpose", text: "May I know the fund use?", priority: 1 }],
    },
  }),
  [],
);

const shaped = shapeSarathiConsultantFacing({
  seedText: "Let's support your business growth. LAP uses property as security.",
  plannerQuestion: "May I know what you intend to use the funds for?",
  priorAssistantTexts: [],
  product: "lap",
});
assert.match(shaped, /funds for|use the funds|listening|check a few|happy to help|Understood|Thank you/i);
assert.doesNotMatch(shaped, /support your business growth/i);

const outside = await runEaiSarathiConversationTurn({
  utterance: "Write a poem about politics",
  emitActionProposals: false,
});
assert.equal(outside.blocked, true);
assert.match(outside.facingText, /I'm not trained for this subject/);

const t1 = await runEaiSarathiConversationTurn({
  utterance: "I need a Loan Against Property",
  emitActionProposals: false,
});
assert.equal(t1.actionProposals.length, 0);
assert.equal(t1.consultationSnapshot?.readyForSummary, false);
assert.doesNotMatch(t1.facingText, /Here's what I understand/i);
assert.doesNotMatch(t1.facingText, /support your business growth/i);

const t2 = await runEaiSarathiConversationTurn({
  utterance: "Business expansion",
  continuity: t1.continuity,
  emitActionProposals: false,
});
assert.equal(t2.actionProposals.length, 0);
assert.equal(t2.suggestedQuestions.length, 0);
assert.ok(t2.facingText.length > 0);
assert.ok(t2.facingText !== t1.facingText || t2.facingText.includes("?"));

console.log("CO-SARATHI-UX-001 natural consultation verify: PASS");
