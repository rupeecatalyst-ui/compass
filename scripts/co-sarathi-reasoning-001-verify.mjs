/**
 * CO-SARATHI-REASONING-001 verify — answer-first, memory, contextual follow-ups.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.match(
  read("src/constants/enterprise-ai-platform/conversation-experience.ts"),
  /3\.3\.0-reasoning-001/,
);
assert.match(
  read("src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts"),
  /reasonSarathiConsultationResponse/,
);
assert.match(
  read("src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts"),
  /enrichUtteranceForDomainGate/,
);
assert.equal(
  existsSync(join(root, "docs/co-sarathi-reasoning-001/CO-SARATHI-REASONING-001-REPORT.md")),
  true,
);

const {
  runEaiSarathiConversationTurn,
  reasonSarathiConsultationResponse,
  enrichUtteranceForDomainGate,
  isSarathiContextualFollowUp,
} = await import("../src/lib/enterprise-ai-platform/conversation-experience/index.ts");

assert.equal(isSarathiContextualFollowUp("How?"), true);
assert.equal(isSarathiContextualFollowUp("Why?"), true);
assert.equal(isSarathiContextualFollowUp("Yes"), true);
assert.equal(isSarathiContextualFollowUp("Who won the cricket match?"), false);

const enrichedHome = enrichUtteranceForDomainGate("I want to buy my first home", []);
assert.match(enrichedHome, /home loan|property purchase/i);

const enrichedLoan = enrichUtteranceForDomainGate("How fast can I get a loan?", []);
assert.match(enrichedLoan, /loan process|financing/i);

const reasoned = reasonSarathiConsultationResponse({
  utterance: "How fast can I get a business loan?",
  priorAssistantTexts: [],
  plannerQuestion: "What type of business do you operate?",
});
assert.match(reasoned.facingText, /quickly|timeline|documents|lender|profile/i);
assert.match(reasoned.facingText, /business|proprietorship|partnership|private limited|funding|amount|operate/i);
assert.doesNotMatch(reasoned.facingText, /explore your options|feels useful next/i);
assert.equal(reasoned.directQuestion != null, true);

// First home must not be domain-blocked
const home = await runEaiSarathiConversationTurn({
  utterance: "I want to buy my first home",
  emitActionProposals: false,
});
assert.equal(home.blocked, false, "first home purchase must stay in domain");
assert.doesNotMatch(home.facingText, /I'm not trained for this subject/);

const speed = await runEaiSarathiConversationTurn({
  utterance: "How fast can I get a business loan?",
  emitActionProposals: false,
});
assert.equal(speed.blocked, false);
assert.match(speed.facingText, /quickly|timeline|documents|lender|profile/i);

const follow = await runEaiSarathiConversationTurn({
  utterance: "Why?",
  continuity: speed.continuity,
  emitActionProposals: false,
});
assert.equal(follow.blocked, false, "Why? must resolve in consultation context");
assert.doesNotMatch(follow.facingText, /I'm not trained for this subject/);

const yes = await runEaiSarathiConversationTurn({
  utterance: "Yes",
  continuity: follow.continuity,
  emitActionProposals: false,
});
assert.equal(yes.blocked, false);
assert.doesNotMatch(yes.facingText, /I'm not trained for this subject/);

const cricket = await runEaiSarathiConversationTurn({
  utterance: "Who will win the cricket match?",
  emitActionProposals: false,
});
assert.equal(cricket.blocked, true);
assert.match(cricket.facingText, /I'm not trained for this subject/);

/** Product-path smoke: each must stay in-domain and avoid banned generics */
const productPaths = [
  { id: "home_loan", utterance: "I need a home loan for a ready flat in Pune" },
  { id: "balance_transfer", utterance: "I want a home loan balance transfer to reduce EMI" },
  { id: "lap", utterance: "I need a loan against property for my residential flat" },
  { id: "business_loan", utterance: "I need a business loan for expansion" },
  { id: "personal_loan", utterance: "I am looking for a personal loan" },
];

for (const path of productPaths) {
  const turn = await runEaiSarathiConversationTurn({
    utterance: path.utterance,
    emitActionProposals: false,
  });
  assert.equal(turn.blocked, false, `${path.id} must stay in domain`);
  assert.doesNotMatch(turn.facingText, /I'm not trained for this subject/);
  assert.doesNotMatch(
    turn.facingText,
    /explore your options|feels useful next|share whatever/i,
    `${path.id} must not use generic stall lines`,
  );
  assert.ok(turn.facingText.trim().length > 20, `${path.id} must produce a real reply`);
  console.log(`  product-path ${path.id}: OK — ${turn.facingText.slice(0, 90)}…`);
}

console.log("CO-SARATHI-REASONING-001 verify: PASS");
