/**
 * CO-AI-G2-W5 — Context Quality Analyzer verify + emit optimization reports.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(
  existsSync(join(root, "docs/co-ai-g2-w5/CO-AI-G2-W5-CONTEXT-QUALITY-ANALYZER.md")),
  true,
);

const {
  EAO_CONTEXT_QUALITY_VERSION,
  EAO_CONTEXT_QUALITY_DIMENSION_IDS,
  EAO_CONTEXT_QUALITY_FIXTURES,
  analyzeEaoContextQuality,
  buildEaoContextQualitySuite,
  formatEaoContextQualitySuiteMarkdown,
} = await import("../src/lib/enterprise-ai-orchestrator/context-quality/index.ts");

assert.equal(EAO_CONTEXT_QUALITY_VERSION, "1.0.0-g2-w5");
assert.equal(EAO_CONTEXT_QUALITY_DIMENSION_IDS.length, 7);
assert.equal(EAO_CONTEXT_QUALITY_FIXTURES.length, 2);

const healthy = analyzeEaoContextQuality(EAO_CONTEXT_QUALITY_FIXTURES[0]);
const noisy = analyzeEaoContextQuality(EAO_CONTEXT_QUALITY_FIXTURES[1]);

assert.equal(healthy.runtimeUnmodified, true);
assert.equal(noisy.runtimeUnmodified, true);
assert.equal(healthy.dimensions.length, 7);
assert.ok(healthy.overallScore > noisy.overallScore);
assert.ok(
  noisy.optimizations.length > 0,
  "noisy pack must produce optimizations",
);

const suite = buildEaoContextQualitySuite({
  title: "CO-AI-G2-W5 Context Quality — Optimization Suite",
  items: EAO_CONTEXT_QUALITY_FIXTURES,
});
assert.equal(suite.runtimeUnmodified, true);
assert.equal(suite.reports.length, 2);

// No runtime wiring
assert.doesNotMatch(
  read("src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts"),
  /analyzeEaoContextQuality|context-quality/,
);
assert.doesNotMatch(
  read("src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx"),
  /analyzeEaoContextQuality|context-quality/,
);

const outDir = join(root, "docs/co-ai-g2-w5");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "CO-AI-G2-W5-CONTEXT-QUALITY-REPORT.md"),
  formatEaoContextQualitySuiteMarkdown(suite),
  "utf8",
);
writeFileSync(
  join(outDir, "CO-AI-G2-W5-CONTEXT-QUALITY-REPORT.json"),
  JSON.stringify(suite, null, 2),
  "utf8",
);

console.log(
  `CO-AI-G2-W5 verify: PASS (healthy=${healthy.overallScore}, noisy=${noisy.overallScore}, suite=${suite.suiteOverallScore})`,
);
