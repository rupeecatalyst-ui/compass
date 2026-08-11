/**
 * CO-AI-G2-W1 — Shadow Mode Foundation verify.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(
  existsSync(join(root, "docs/co-ai-g2-w1/CO-AI-G2-W1-SHADOW-MODE-FOUNDATION.md")),
  true,
);

const {
  isEaoShadowModeEnabled,
  runEaoShadowInvocation,
  scheduleEaoShadowAfterLiveTurn,
  clearEaoShadowCaptures,
  countEaoShadowCaptures,
  listEaoShadowCaptures,
  EAO_SHADOW_MODE_VERSION,
} = await import("../src/lib/enterprise-ai-orchestrator/shadow/index.ts");

assert.equal(EAO_SHADOW_MODE_VERSION, "1.0.0-g2-w1");

// Default OFF
delete process.env.EAO_SHADOW_MODE_ENABLED;
assert.equal(isEaoShadowModeEnabled(), false);

clearEaoShadowCaptures();
const live = {
  facingText: "With complete documents, some cases can move quite quickly.",
  objectiveHint: "answer",
  sessionId: "sess_test",
  conversationId: "conv_test",
  utterance: "How fast can I get a business loan?",
  capturedAt: new Date().toISOString(),
};

const skipped = await runEaoShadowInvocation({ live });
assert.equal(skipped.status, "skipped_flag_off");
assert.equal(skipped.customerIsolated, true);
assert.equal(countEaoShadowCaptures(), 0);

scheduleEaoShadowAfterLiveTurn({ live });
assert.equal(countEaoShadowCaptures(), 0);

// Enable → capture
process.env.EAO_SHADOW_MODE_ENABLED = "true";
assert.equal(isEaoShadowModeEnabled(), true);

const completed = await runEaoShadowInvocation({ live });
assert.equal(completed.status, "completed");
assert.equal(completed.customerIsolated, true);
assert.ok(completed.response?.facingText);
assert.ok(completed.comparison);
assert.doesNotMatch(completed.response.facingText, /\d+\s*%|₹\s*\d{4,}/);
assert.equal(countEaoShadowCaptures(), 1);
assert.equal(listEaoShadowCaptures(1)[0]?.shadowId, completed.shadowId);

// Live turn still owns facing — hook must not reassign
const turn = read(
  "src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts",
);
assert.match(turn, /scheduleEaoShadowAfterLiveTurn/);
assert.match(turn, /never alters facingText|facingText is fixed|UNCHANGED|never alters/i);
assert.ok(turn.includes("facingText,")); // still returns live facingText
assert.doesNotMatch(turn, /facingText\s*=\s*completed\.response/);

// Composer must not wire Shadow Mode UI
assert.doesNotMatch(
  read("src/components/catalyst-one/sarathi/conversation-composer.tsx"),
  /eao\.shadow|scheduleEaoShadow|EAO_SHADOW_MODE/i,
);
assert.doesNotMatch(
  read("src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx"),
  /eao\.shadow|scheduleEaoShadow|EAO_SHADOW_MODE/i,
);

// Reset env
delete process.env.EAO_SHADOW_MODE_ENABLED;
clearEaoShadowCaptures();

console.log("CO-AI-G2-W1 verify: PASS (shadow foundation; flag default OFF; customer isolated)");
