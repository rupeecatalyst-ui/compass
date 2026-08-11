/**
 * CO-AI-G2-W5 — Format context quality optimization reports.
 */

import type {
  EaoContextQualityReport,
  EaoContextQualitySuiteReport,
} from "@/types/enterprise-ai-orchestrator/context-quality";

export function formatEaoContextQualityReportMarkdown(
  report: EaoContextQualityReport,
): string {
  const lines: string[] = [
    `## ${report.label}`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Pack ID | ${report.packId} |`,
    `| Overall | **${report.overallScore}** (${report.grade}) |`,
    `| Estimated prompt chars | ${report.estimatedPromptChars} |`,
    `| Facts | ${report.factCounts.total} (C${report.factCounts.customer}/O${report.factCounts.opportunity}/D${report.factCounts.deal}/P${report.factCounts.product}/Pol${report.factCounts.policy}) |`,
    `| Runtime unmodified | ${report.runtimeUnmodified} |`,
    `| Analyzed | ${report.analyzedAt} |`,
    "",
    `| Dimension | Score | Findings |`,
    `|-----------|------:|----------|`,
  ];
  for (const d of report.dimensions) {
    const finding = (d.findings[0] ?? "—").replace(/\|/g, "/");
    lines.push(`| ${d.label} | ${d.score} | ${finding} |`);
  }
  lines.push("", "### Optimizations", "");
  if (report.optimizations.length === 0) {
    lines.push("- None — pack looks healthy");
  } else {
    for (const o of report.optimizations) lines.push(`- ${o}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function formatEaoContextQualitySuiteMarkdown(
  suite: EaoContextQualitySuiteReport,
): string {
  const lines: string[] = [
    `# ${suite.title}`,
    "",
    `**Suite overall:** ${suite.suiteOverallScore} · **Version:** ${suite.version} · **Generated:** ${suite.generatedAt}`,
    "",
    `Report ID: \`${suite.reportId}\``,
    "",
    `> Optimization reports only. No runtime context packs were modified.`,
    "",
    "---",
    "",
  ];
  for (const r of suite.reports) {
    lines.push(formatEaoContextQualityReportMarkdown(r), "---", "");
  }
  return lines.join("\n");
}
