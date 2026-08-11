/**
 * CO-SARATHI-VISION-001 WAVE-1 — Questionnaire UX retirement verify.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const constants = read("src/constants/enterprise-ai-platform/conversation-experience.ts");
assert.match(constants, /3\.3\.0-reasoning-001|3\.2\.0-vision-w1/);

const workspace = read(
  "src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx",
);
assert.doesNotMatch(workspace, /SuggestedQuestionsBar/);
assert.doesNotMatch(workspace, /CustomerSummaryCard/);
assert.doesNotMatch(workspace, /welcomeChips/);
assert.doesNotMatch(workspace, /Yes, that summary is correct/);
assert.match(workspace, /proposalsUnlockedRef/);
assert.match(workspace, /WAVE-1|Natural financial consultation/);

const suggested = read(
  "src/lib/enterprise-ai-platform/conversation-experience/suggested-questions.ts",
);
assert.match(suggested, /return \[\]/);

assert.equal(
  existsSync(
    join(root, "docs/co-sarathi-vision-001/CO-SARATHI-VISION-001-WAVE-1-RETIRE-QUESTIONNAIRE.md"),
  ),
  true,
);

const {
  resolveEaiSarathiSuggestedQuestions,
  shapeSarathiConsultantFacing,
  runEaiSarathiConversationTurn,
} = await import("../src/lib/enterprise-ai-platform/conversation-experience/index.ts");

assert.deepEqual(resolveEaiSarathiSuggestedQuestions({}), []);
assert.deepEqual(
  resolveEaiSarathiSuggestedQuestions({
    welcomeOnly: true,
    plannerPlan: {
      selectedQuestions: [{ questionId: "q1", slotId: "purpose", text: "What amount?", priority: 1 }],
    },
  }),
  [],
);

const facing = shapeSarathiConsultantFacing({
  seedText: "Buying a home matters.",
  plannerQuestion: "What is the property value?",
  priorAssistantTexts: [],
  product: "home_loan",
  preferReflect: true,
});
assert.doesNotMatch(facing, /What is the property value/i);

const turn = await runEaiSarathiConversationTurn({
  utterance: "I need a Home Loan for purchase in Mumbai",
  emitActionProposals: false,
});
assert.equal(turn.suggestedQuestions.length, 0);
assert.equal(turn.actionProposals.length, 0);

console.log("CO-SARATHI-VISION-001 WAVE-1 retire questionnaire verify: PASS");
