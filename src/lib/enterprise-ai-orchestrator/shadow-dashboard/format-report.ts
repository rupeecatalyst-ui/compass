/**
 * CO-AI-G2-W8 — Format Product Owner Shadow Mode Dashboard as markdown.
 */

import type { EaoShadowDashboardSnapshot } from "@/types/enterprise-ai-orchestrator/shadow-dashboard";

export function formatEaoShadowDashboardMarkdown(
  snapshot: EaoShadowDashboardSnapshot,
): string {
  const lines: string[] = [
    `# ${snapshot.title}`,
    "",
    `**Version:** ${snapshot.version} · **Generated:** ${snapshot.generatedAt}`,
    "",
    `Snapshot ID: \`${snapshot.snapshotId}\``,
    "",
    "> Product Owner review only. **No customer access.** Customer-isolated evaluation surface.",
    "",
    "## Suite averages",
    "",
    "| Metric | Value |",
    "|--------|------:|",
    `| Benchmark Score | ${snapshot.averages.benchmarkScore} |`,
    `| Policy Score | ${snapshot.averages.policyScore} |`,
    `| Consultation Score | ${snapshot.averages.consultationScore} |`,
    `| Latency (ms) | ${snapshot.averages.latencyMs} |`,
    `| Estimated Cost (USD) | ${snapshot.averages.estimatedCostUsd} |`,
    "",
    "## Rows",
    "",
  ];

  for (const [i, row] of snapshot.rows.entries()) {
    lines.push(`### ${i + 1}. ${row.customerUtterance}`);
    lines.push("");
    lines.push(`**Product:** ${row.productPath ?? "—"}`);
    lines.push("");
    lines.push("| Field | Value |");
    lines.push("|-------|-------|");
    lines.push(`| Current SARATHI Response | ${escapeCell(row.currentSarathiResponse)} |`);
    lines.push(`| Reasoning Model Response | ${escapeCell(row.reasoningModelResponse)} |`);
    lines.push(`| Gold Standard Response | ${escapeCell(row.goldStandardResponse || "—")} |`);
    lines.push(`| Benchmark Score | ${row.benchmarkScore} |`);
    lines.push(`| Policy Score | ${row.policyScore} |`);
    lines.push(`| Consultation Score | ${row.consultationScore} |`);
    lines.push(`| Latency (ms) | ${row.latencyMs} |`);
    lines.push(`| Estimated Cost (USD) | ${row.estimatedCostUsd} |`);
    if (row.recommendation) {
      lines.push("");
      lines.push(`_Recommendation:_ ${row.recommendation}`);
    }
    lines.push("");
  }

  lines.push("## Access flags");
  lines.push("");
  lines.push("| Flag | Value |");
  lines.push("|------|-------|");
  lines.push(`| audience | ${snapshot.audience} |`);
  lines.push(`| customerAccess | ${snapshot.customerAccess} |`);
  lines.push(`| customerIsolated | ${snapshot.customerIsolated} |`);
  lines.push("");

  return lines.join("\n");
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}
