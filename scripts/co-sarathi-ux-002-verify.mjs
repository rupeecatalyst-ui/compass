/**
 * CO-SARATHI-UX-002 — Natural conversation timing / stream verify.
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
assert.match(constants, /3\.2\.0-vision-w1|3\.1\.0-ux002/);
assert.match(constants, /EAI_SARATHI_PROGRESSIVE_THINKING/);

const workspace = read(
  "src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx",
);
assert.match(workspace, /awaitSarathiNaturalThinkFloor/);
assert.match(workspace, /streamSarathiFacingText/);
assert.match(workspace, /startSarathiProgressiveThinking/);
assert.doesNotMatch(workspace, /typingDelayMs/);
assert.match(workspace, /SARATHI is thinking/);
assert.doesNotMatch(workspace, /SuggestedQuestionsBar|welcomeChips/);

const typing = read("src/components/catalyst-one/sarathi/typing-indicator.tsx");
assert.match(typing, /SARATHI is thinking/);

const docs = [
  "docs/co-sarathi-ux-002/CO-SARATHI-UX-002-NATURAL-CONVERSATION.md",
  "docs/co-sarathi-ux-002/CO-SARATHI-UX-002-BEFORE-AFTER-VIDEO-GUIDE.md",
  "docs/co-sarathi-ux-002/CO-SARATHI-UX-002-KNOWN-LIMITATIONS.md",
];
for (const d of docs) {
  assert.equal(existsSync(join(root, d)), true, `Missing ${d}`);
}

const {
  classifySarathiThinkComplexity,
  buildSarathiNaturalThinkPlan,
  awaitSarathiNaturalThinkFloor,
  streamSarathiFacingText,
} = await import("../src/lib/enterprise-ai-platform/conversation-experience/index.ts");

assert.equal(
  classifySarathiThinkComplexity({
    utterance: "Hi",
    phase: "welcome",
    userTurnCount: 1,
  }),
  "greeting",
);

assert.equal(
  classifySarathiThinkComplexity({
    utterance: "I need a Home Loan",
    phase: "welcome",
    userTurnCount: 1,
  }),
  "standard",
);

assert.equal(
  classifySarathiThinkComplexity({
    utterance: "Please compare EMI affordability and recommend the best lender option for my FOIR",
    phase: "understanding",
    userTurnCount: 3,
  }),
  "complex",
);

const greeting = buildSarathiNaturalThinkPlan("greeting");
const complex = buildSarathiNaturalThinkPlan("complex");
assert.ok(greeting.softMinMs < complex.softMinMs);
assert.ok(complex.progressiveLabels.length >= 2);
assert.equal(greeting.progressiveLabels.length, 0);

const t0 = Date.now();
await awaitSarathiNaturalThinkFloor(t0, greeting);
assert.ok(Date.now() - t0 < 800, "Greeting floor must stay snappy");

let updates = 0;
const streamed = await streamSarathiFacingText({
  text: "I'd be happy to help. What is the property value you have in mind for this purchase?",
  chunkMs: 5,
  onUpdate: () => {
    updates += 1;
  },
});
assert.ok(streamed.includes("property"));
assert.ok(updates >= 2, "Longer replies should stream progressively");

console.log("CO-SARATHI-UX-002 natural conversation verify: PASS");
