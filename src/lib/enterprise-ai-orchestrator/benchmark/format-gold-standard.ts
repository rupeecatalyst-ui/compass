/**
 * CO-AI-G2-W3 — Render Gold Standard Library as Product Owner markdown.
 */

import {
  EAO_GOLD_STANDARD_LIBRARY,
  EAO_GOLD_STANDARD_LIBRARY_VERSION,
} from "@/constants/enterprise-ai-orchestrator/gold-standard-library";

export function formatEaoGoldStandardLibraryMarkdown(): string {
  const lines: string[] = [
    `# Product Owner Benchmark Library — Gold Standard Consultations`,
    "",
    `**Version:** ${EAO_GOLD_STANDARD_LIBRARY_VERSION}  `,
    `**Library ID:** \`${EAO_GOLD_STANDARD_LIBRARY.libraryId}\`  `,
    `**Authority:** ${EAO_GOLD_STANDARD_LIBRARY.authorityNote}  `,
    "",
    `> **Benchmarking only.** This library is NOT a runtime response source and must not drive live SARATHI facing text.`,
    "",
  ];

  for (const p of EAO_GOLD_STANDARD_LIBRARY.products) {
    lines.push(`## ${p.productLabel}`, "");
    lines.push(`**Product ID:** \`${p.productId}\``, "");
    lines.push(`### Typical customer goals`, "");
    for (const g of p.typicalCustomerGoals) lines.push(`- ${g}`);
    lines.push("");
    lines.push(`### Expected consultant behaviour`, "");
    for (const b of p.expectedConsultantBehaviour) lines.push(`- ${b}`);
    lines.push("");
    lines.push(`### Expected follow-up strategy`, "");
    p.expectedFollowUpStrategy.forEach((s, i) => {
      lines.push(`${i + 1}. ${s}`);
    });
    lines.push("");
    lines.push(`### Evaluation notes`, "");
    for (const n of p.evaluationNotes) lines.push(`- ${n}`);
    lines.push("");
    lines.push(`### Typical conversations`, "");
    for (const c of p.typicalConversations) {
      lines.push(`#### ${c.title}`, "");
      lines.push(`*${c.premise}*`, "");
      for (const t of c.turns) {
        const who = t.speaker === "customer" ? "**Customer**" : "**Consultant**";
        lines.push(`${who}: ${t.text}`);
        if (t.note) lines.push(`  - _Evaluator note: ${t.note}_`);
        lines.push("");
      }
    }
    lines.push("---", "");
  }

  return lines.join("\n");
}
