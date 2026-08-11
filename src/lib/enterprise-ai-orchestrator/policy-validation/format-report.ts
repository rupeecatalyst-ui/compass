/**
 * CO-AI-G2-W6 — Format policy validation reports.
 */

import type {
  EaoPolicyValidationReport,
  EaoPolicyValidationSuiteReport,
} from "@/types/enterprise-ai-orchestrator/policy-validation";

export function formatEaoPolicyValidationReportMarkdown(
  report: EaoPolicyValidationReport,
): string {
  const lines: string[] = [
    `## ${report.label}`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Overall | **${report.overallScore}** · ${report.passed ? "PASS" : "FAIL"} |`,
    `| Response unmodified | ${report.responseUnmodified} |`,
    `| Customer isolated | ${report.customerIsolated} |`,
    `| Shadow ID | ${report.shadowId ?? "—"} |`,
    `| Validated | ${report.validatedAt} |`,
    "",
    `**Customer:** ${report.customerUtterance}`,
    "",
    `**Evaluated shadow text (unchanged):** ${report.evaluatedFacingText}`,
    "",
    `| Dimension | Score | Pass | Top finding |`,
    `|-----------|------:|:----:|-------------|`,
  ];
  for (const d of report.dimensions) {
    const f = (d.findings[0]?.detail ?? "—").replace(/\|/g, "/");
    lines.push(
      `| ${d.label} | ${d.score} | ${d.passed ? "✓" : "✗"} | ${f} |`,
    );
  }
  lines.push("", "### Recommendations", "");
  for (const r of report.recommendations) lines.push(`- ${r}`);
  lines.push("");
  return lines.join("\n");
}

export function formatEaoPolicyValidationSuiteMarkdown(
  suite: EaoPolicyValidationSuiteReport,
): string {
  const lines: string[] = [
    `# ${suite.title}`,
    "",
    `**Suite score:** ${suite.suiteOverallScore} · **Pass:** ${suite.passCount} · **Fail:** ${suite.failCount} · **Version:** ${suite.version}`,
    "",
    `Report ID: \`${suite.reportId}\` · Generated: ${suite.generatedAt}`,
    "",
    `> Validates Shadow Mode responses. Does **not** modify responses. Internal only.`,
    "",
    "---",
    "",
  ];
  for (const r of suite.reports) {
    lines.push(formatEaoPolicyValidationReportMarkdown(r), "---", "");
  }
  return lines.join("\n");
}
