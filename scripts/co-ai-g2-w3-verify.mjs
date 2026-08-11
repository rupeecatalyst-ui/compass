/**
 * CO-AI-G2-W3 — Gold Standard library verify + emit PO reports.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(
  existsSync(join(root, "docs/co-ai-g2-w3/CO-AI-G2-W3-GOLD-STANDARD-LIBRARY-SPEC.md")),
  true,
);

const {
  EAO_GOLD_STANDARD_LIBRARY,
  EAO_GOLD_STANDARD_LIBRARY_VERSION,
  listEaoGoldStandardProductIds,
} = await import(
  "../src/constants/enterprise-ai-orchestrator/gold-standard-library.ts"
);

assert.equal(EAO_GOLD_STANDARD_LIBRARY_VERSION, "1.0.0-g2-w3");
assert.equal(EAO_GOLD_STANDARD_LIBRARY.products.length, 6);
assert.deepEqual(listEaoGoldStandardProductIds().sort(), [
  "balance_transfer",
  "business_loan",
  "home_loan",
  "lap",
  "personal_loan",
  "working_capital",
].sort());

for (const p of EAO_GOLD_STANDARD_LIBRARY.products) {
  assert.equal(p.runtimePolicy, "benchmark_only_never_runtime_ssot");
  assert.ok(p.typicalCustomerGoals.length >= 3);
  assert.ok(p.typicalConversations.length >= 1);
  assert.ok(p.expectedConsultantBehaviour.length >= 3);
  assert.ok(p.expectedFollowUpStrategy.length >= 3);
  assert.ok(p.evaluationNotes.length >= 2);
  for (const c of p.typicalConversations) {
    assert.ok(c.turns.some((t) => t.speaker === "customer"));
    assert.ok(c.turns.some((t) => t.speaker === "consultant"));
  }
}

const {
  formatEaoGoldStandardLibraryMarkdown,
  listEaoGoldStandardBenchmarkConversations,
  buildEaoBenchmarkSuiteReport,
  formatEaoBenchmarkSuiteMarkdown,
} = await import("../src/lib/enterprise-ai-orchestrator/benchmark/index.ts");

const goldConversations = listEaoGoldStandardBenchmarkConversations();
assert.ok(goldConversations.length >= 6);

const suite = buildEaoBenchmarkSuiteReport({
  title: "CO-AI-G2-W3 Gold Standard Dialogues — Benchmark Scores",
  conversations: goldConversations,
});
assert.equal(suite.conversations.length, goldConversations.length);
assert.ok(suite.suiteOverallScore > 70, "gold dialogues should score well");

// Isolation: live dialogue path must not import gold standard library
const turn = read(
  "src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts",
);
assert.doesNotMatch(turn, /gold-standard-library|EAO_GOLD_STANDARD/);
assert.doesNotMatch(
  read("src/lib/enterprise-ai-platform/conversation-experience/consultation-reasoning.ts"),
  /gold-standard-library|EAO_GOLD_STANDARD/,
);
assert.doesNotMatch(
  read("src/lib/enterprise-ai-platform/conversation-experience/consultant-facing.ts"),
  /gold-standard-library|EAO_GOLD_STANDARD/,
);

const outDir = join(root, "docs/co-ai-g2-w3");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "CO-AI-G2-W3-GOLD-STANDARD-LIBRARY.md"),
  formatEaoGoldStandardLibraryMarkdown(),
  "utf8",
);
writeFileSync(
  join(outDir, "CO-AI-G2-W3-GOLD-BENCHMARK-REPORT.md"),
  formatEaoBenchmarkSuiteMarkdown(suite),
  "utf8",
);

console.log(
  `CO-AI-G2-W3 verify: PASS (products=6, goldDialogues=${goldConversations.length}, suite=${suite.suiteOverallScore})`,
);
