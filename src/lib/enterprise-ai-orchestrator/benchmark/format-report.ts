/**
 * CO-AI-G2-W2 — Render benchmark reports (markdown / plain text).
 * Reports only — no UI mounting.
 */

import type {
  EaoBenchmarkConversationScore,
  EaoBenchmarkSuiteReport,
} from "@/types/enterprise-ai-orchestrator/benchmark";

export function formatEaoBenchmarkConversationMarkdown(
  score: EaoBenchmarkConversationScore,
): string {
  const lines: string[] = [
    `## ${score.scenarioLabel}`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Conversation | ${score.conversationId} |`,
    `| Product path | ${score.productPath} |`,
    `| Source | ${score.source} |`,
    `| Overall | **${score.overallScore}** (${score.grade}) |`,
    `| Turns | ${score.turnCount} |`,
    `| Benchmark | ${score.benchmarkVersion} |`,
    `| Scored at | ${score.scoredAt} |`,
    "",
    `| Dimension | Score | Signals |`,
    `|-----------|------:|---------|`,
  ];
  for (const d of score.dimensions) {
    const sig = d.signals.slice(0, 2).join("; ").replace(/\|/g, "/") || "—";
    lines.push(`| ${d.label} | ${d.score} | ${sig} |`);
  }
  lines.push("");
  return lines.join("\n");
}

export function formatEaoBenchmarkSuiteMarkdown(report: EaoBenchmarkSuiteReport): string {
  const lines: string[] = [
    `# ${report.title}`,
    "",
    `**Suite overall:** ${report.suiteOverallScore} · **Version:** ${report.benchmarkVersion} · **Generated:** ${report.generatedAt}`,
    "",
    `Report ID: \`${report.reportId}\``,
    "",
    `## By product path`,
    "",
    `| Product | Conversations | Average |`,
    `|---------|--------------:|--------:|`,
  ];
  for (const p of report.byProductPath) {
    lines.push(
      `| ${p.productPath} | ${p.conversationCount} | ${p.averageScore} |`,
    );
  }
  lines.push("", "## By dimension", "", `| Dimension | Average |`, `|-----------|--------:|`);
  for (const d of report.byDimension) {
    lines.push(`| ${d.label} | ${d.averageScore} |`);
  }
  lines.push("", "---", "");
  for (const c of report.conversations) {
    lines.push(formatEaoBenchmarkConversationMarkdown(c));
  }
  return lines.join("\n");
}

export function formatEaoBenchmarkSuiteJson(report: EaoBenchmarkSuiteReport): string {
  return JSON.stringify(report, null, 2);
}
