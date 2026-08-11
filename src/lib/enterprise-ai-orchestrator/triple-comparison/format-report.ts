/**
 * CO-AI-G2-W4 — Format triple comparison reports (internal only).
 */

import type {
  EaoTripleComparisonResult,
  EaoTripleComparisonSuiteReport,
} from "@/types/enterprise-ai-orchestrator/triple-comparison";

export function formatEaoTripleComparisonMarkdown(
  result: EaoTripleComparisonResult,
): string {
  const lines: string[] = [
    `## Triple comparison — \`${result.comparisonId}\``,
    "",
    `**Customer:** ${result.customerUtterance}`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Product path | ${result.productPath} |`,
    `| Score (live+model mean) | **${result.score}** |`,
    `| Deviation from gold (mean) | **${result.deviation}** |`,
    `| Customer isolated | ${result.customerIsolated} |`,
    `| Compared at | ${result.comparedAt} |`,
    "",
  ];

  if (result.matchedGold) {
    lines.push(
      `### Matched gold`,
      "",
      `- ${result.matchedGold.productLabel} — ${result.matchedGold.title} (match ${result.matchedGold.matchScore})`,
      `- Gold customer: ${result.matchedGold.customerGoldText}`,
      `- Gold consultant: ${result.matchedGold.consultantGoldText}`,
      "",
    );
  } else {
    lines.push(`### Matched gold`, "", `_No gold match_`, "");
  }

  for (const arm of result.arms) {
    lines.push(
      `### ${arm.label}`,
      "",
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Score | ${arm.score} |`,
      `| Deviation from gold | ${arm.deviationFromGold} |`,
      "",
      `**Facing:** ${arm.facingText || "_(empty)_"}`,
      "",
      `**Strengths**`,
      ...arm.strengths.map((s) => `- ${s}`),
      "",
      `**Weaknesses**`,
      ...arm.weaknesses.map((w) => `- ${w}`),
      "",
      `**Recommendation:** ${arm.recommendation}`,
      "",
    );
  }

  lines.push(
    `### Aggregate`,
    "",
    `**Strengths**`,
    ...(result.strengths.length ? result.strengths.map((s) => `- ${s}`) : ["- —"]),
    "",
    `**Weaknesses**`,
    ...(result.weaknesses.length ? result.weaknesses.map((w) => `- ${w}`) : ["- —"]),
    "",
    `**Recommendation:** ${result.recommendation}`,
    "",
  );

  return lines.join("\n");
}

export function formatEaoTripleSuiteMarkdown(
  report: EaoTripleComparisonSuiteReport,
): string {
  const lines: string[] = [
    `# ${report.title}`,
    "",
    `**Suite score:** ${report.suiteScore} · **Suite deviation:** ${report.suiteDeviation} · **Version:** ${report.version}`,
    "",
    `Report ID: \`${report.reportId}\` · Customer isolated: **${report.customerIsolated}**`,
    "",
    `> Internal evaluation only. Never show to customers.`,
    "",
    `---`,
    "",
  ];
  for (const c of report.comparisons) {
    lines.push(formatEaoTripleComparisonMarkdown(c), "---", "");
  }
  return lines.join("\n");
}
