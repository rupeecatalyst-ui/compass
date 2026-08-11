/**
 * CO-AI-G2-W7 — Cost & Performance Profiler verify + emit optimization report.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(
  existsSync(join(root, "docs/co-ai-g2-w7/CO-AI-G2-W7-COST-PERFORMANCE-PROFILER.md")),
  true,
);

const {
  EAO_PERF_PROFILER_VERSION,
  buildEaoPerfFixtureSamples,
  buildEaoPerfProfilerReport,
  formatEaoPerfProfilerReportMarkdown,
  clearEaoPerfSamples,
  saveEaoPerfSample,
  countEaoPerfSamples,
  estimateTokensFromText,
  estimateCostUsd,
} = await import("../src/lib/enterprise-ai-orchestrator/perf-profiler/index.ts");

assert.equal(EAO_PERF_PROFILER_VERSION, "1.0.0-g2-w7");
assert.ok(estimateTokensFromText("abcd") >= 1);
assert.ok(estimateCostUsd({ inputTokens: 1000, outputTokens: 1000 }) > 0);

const samples = buildEaoPerfFixtureSamples();
assert.equal(samples.length, 3);
for (const s of samples) {
  assert.equal(s.runtimeUnoptimized, true);
  assert.equal(s.customerIsolated, true);
}

clearEaoPerfSamples();
for (const s of samples) saveEaoPerfSample(s);
assert.equal(countEaoPerfSamples(), 3);

const report = buildEaoPerfProfilerReport({
  title: "CO-AI-G2-W7 Cost & Performance — Optimization Report",
  samples,
});

assert.equal(report.runtimeUnoptimized, true);
assert.equal(report.customerIsolated, true);
assert.equal(report.metrics.sampleCount, 3);
assert.ok(report.metrics.averageResponseTimeMs > 0);
assert.ok(report.metrics.averageLatencyMs > 0);
assert.ok(report.metrics.averageTokens > 0);
assert.ok(report.metrics.estimatedCostUsdTotal >= 0);
assert.ok(report.metrics.averageToolCalls >= 0);
assert.ok(report.metrics.averageContextSizeChars > 0);
assert.ok(report.metrics.averageMemorySizeChars >= 0);
assert.ok(report.metrics.p95LatencyMs >= report.metrics.averageLatencyMs - 1);
assert.ok(report.metrics.providerUsage.length >= 1);
assert.ok(report.optimizations.length >= 5);

const md = formatEaoPerfProfilerReportMarkdown(report);
assert.match(md, /Average Response Time/);
assert.match(md, /Average Tokens/);
assert.match(md, /Estimated Cost/);
assert.match(md, /Tool Calls/);
assert.match(md, /Context Size/);
assert.match(md, /Memory Size/);
assert.match(md, /Latency/);
assert.match(md, /Provider/);
assert.match(md, /No runtime optimisation applied/);

// Pipeline records metrics but does not optimise
const pipeline = read("src/lib/enterprise-ai-orchestrator/shadow/pipeline.ts");
assert.match(pipeline, /saveEaoPerfSample/);
assert.match(pipeline, /no runtime optimisation/i);

assert.doesNotMatch(
  read("src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx"),
  /perf-profiler|saveEaoPerfSample/,
);

const outDir = join(root, "docs/co-ai-g2-w7");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "CO-AI-G2-W7-COST-PERFORMANCE-REPORT.md"), md, "utf8");
writeFileSync(
  join(outDir, "CO-AI-G2-W7-COST-PERFORMANCE-REPORT.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log(
  `CO-AI-G2-W7 verify: PASS (avgLatency=${report.metrics.averageLatencyMs}ms, avgTokens=${report.metrics.averageTokens}, costAvg=$${report.metrics.estimatedCostUsdAverage})`,
);
