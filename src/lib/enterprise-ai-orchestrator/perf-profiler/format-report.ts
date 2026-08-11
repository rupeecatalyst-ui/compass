/**
 * CO-AI-G2-W7 — Format cost/performance optimization reports.
 */

import type { EaoPerfProfilerReport } from "@/types/enterprise-ai-orchestrator/perf-profiler";

export function formatEaoPerfProfilerReportMarkdown(report: EaoPerfProfilerReport): string {
  const m = report.metrics;
  const lines: string[] = [
    `# ${report.title}`,
    "",
    `**Version:** ${report.version} · **Generated:** ${report.generatedAt}`,
    "",
    `Report ID: \`${report.reportId}\``,
    "",
    `> Metrics & optimization recommendations only. **No runtime optimisation applied** (W7).`,
    "",
    `## Enterprise metrics`,
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Samples | ${m.sampleCount} |`,
    `| Average Response Time (ms) | ${m.averageResponseTimeMs} |`,
    `| Average Latency (ms) | ${m.averageLatencyMs} |`,
    `| p95 Latency (ms) | ${m.p95LatencyMs} |`,
    `| Average Tokens | ${m.averageTokens} |`,
    `| Avg Input Tokens | ${m.averageInputTokens} |`,
    `| Avg Output Tokens | ${m.averageOutputTokens} |`,
    `| Estimated Cost (total USD) | ${m.estimatedCostUsdTotal} |`,
    `| Estimated Cost (avg USD) | ${m.estimatedCostUsdAverage} |`,
    `| Average Tool Calls | ${m.averageToolCalls} |`,
    `| Average Context Size (chars) | ${m.averageContextSizeChars} |`,
    `| Average Memory Size (chars) | ${m.averageMemorySizeChars} |`,
    "",
    `## Provider usage`,
    "",
    `| Provider | Invocations | Total latency ms | Tokens | Est. cost USD |`,
    `|----------|------------:|-----------------:|-------:|--------------:|`,
  ];

  if (m.providerUsage.length === 0) {
    lines.push(`| — | 0 | 0 | 0 | 0 |`, "");
  } else {
    for (const p of m.providerUsage) {
      lines.push(
        `| ${p.providerId} | ${p.invocationCount} | ${p.totalLatencyMs} | ${p.totalEstimatedTokens} | ${Math.round(p.totalEstimatedCostUsd * 1e6) / 1e6} |`,
      );
    }
    lines.push("");
  }

  lines.push(`## Optimization recommendations`, "");
  for (const o of report.optimizations) {
    lines.push(
      `### ${o.area} (${o.severity})`,
      "",
      `- **Observation:** ${o.observation}`,
      `- **Recommendation:** ${o.recommendation}`,
      "",
    );
  }

  lines.push(
    `## Flags`,
    "",
    `| Flag | Value |`,
    `|------|-------|`,
    `| runtimeUnoptimized | ${report.runtimeUnoptimized} |`,
    `| customerIsolated | ${report.customerIsolated} |`,
    "",
  );

  return lines.join("\n");
}
