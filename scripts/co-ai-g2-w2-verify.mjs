/**
 * CO-AI-G2-W2 — Consultant Benchmark Engine verify + emit report artefacts.
 * Offline only — does not touch live SARATHI turn path.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(
  existsSync(join(root, "docs/co-ai-g2-w2/CO-AI-G2-W2-CONSULTANT-BENCHMARK.md")),
  true,
);

const {
  EAO_CONSULTANT_BENCHMARK_VERSION,
  EAO_BENCHMARK_DIMENSION_IDS,
  EAO_BENCHMARK_REFERENCE_FIXTURES,
  EAO_BENCHMARK_NEGATIVE_FIXTURE,
  buildEaoBenchmarkSuiteReport,
  scoreEaoConsultantConversation,
  formatEaoBenchmarkSuiteMarkdown,
  formatEaoBenchmarkSuiteJson,
} = await import("../src/lib/enterprise-ai-orchestrator/benchmark/index.ts");

assert.equal(EAO_CONSULTANT_BENCHMARK_VERSION, "1.0.0-g2-w2");
assert.equal(EAO_BENCHMARK_DIMENSION_IDS.length, 8);
assert.equal(EAO_BENCHMARK_REFERENCE_FIXTURES.length, 6);

const suite = buildEaoBenchmarkSuiteReport({
  title: "CO-AI-G2-W2 Consultant Benchmark — Reference Suite",
  conversations: EAO_BENCHMARK_REFERENCE_FIXTURES,
});

assert.equal(suite.conversations.length, 6);
assert.ok(suite.suiteOverallScore > 0);
for (const c of suite.conversations) {
  assert.equal(c.dimensions.length, 8);
  assert.ok(c.overallScore >= 0 && c.overallScore <= 100);
}

const neg = scoreEaoConsultantConversation(EAO_BENCHMARK_NEGATIVE_FIXTURE);
assert.ok(
  neg.overallScore < suite.suiteOverallScore,
  "negative control must score below reference suite average",
);
assert.ok(
  neg.dimensions.find((d) => d.dimensionId === "business_safety").score < 70,
  "negative control must fail business safety",
);

// No runtime wiring into turn orchestrator for benchmark
const turn = read(
  "src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts",
);
assert.doesNotMatch(turn, /scoreEaoConsultantConversation|buildEaoBenchmarkSuiteReport/);

const outDir = join(root, "docs/co-ai-g2-w2");
mkdirSync(outDir, { recursive: true });
const md = formatEaoBenchmarkSuiteMarkdown(suite);
const json = formatEaoBenchmarkSuiteJson(suite);
writeFileSync(join(outDir, "CO-AI-G2-W2-BENCHMARK-REPORT.md"), md, "utf8");
writeFileSync(join(outDir, "CO-AI-G2-W2-BENCHMARK-REPORT.json"), json, "utf8");

const negMd = [
  "# Negative control score",
  "",
  `Overall: **${neg.overallScore}** (${neg.grade})`,
  "",
  ...neg.dimensions.map((d) => `- ${d.label}: ${d.score}`),
  "",
].join("\n");
writeFileSync(join(outDir, "CO-AI-G2-W2-NEGATIVE-CONTROL.md"), negMd, "utf8");

console.log(
  `CO-AI-G2-W2 verify: PASS (suite=${suite.suiteOverallScore}, neg=${neg.overallScore})`,
);
