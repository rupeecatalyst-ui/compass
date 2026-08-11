/**
 * Comparison Engine (CO-AI-106).
 * Frames comparisons — never ranks products or invents scores.
 */

import type { EaiAdvisoryFragment } from "@/types/enterprise-ai-advisory-reasoning";

function newId(): string {
  return `eai_adv_cmp_${crypto.randomUUID().slice(0, 8)}`;
}

export function reasonEaiComparison(question: string): EaiAdvisoryFragment | null {
  const q = question.toLowerCase();
  if (!/\bcompare\b|\bvs\b|\bversus\b|\bdifference\b|\bbetter\b|\bwhich (is|loan|product)\b/.test(q)) {
    return null;
  }

  if (/\bbt\b|\bbalance transfer\b/.test(q) && /\bfresh\b|\bnew loan\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "comparison",
      lines: ["BT and fresh loans differ.", "Engines compare the numbers."],
      toneCategoryId: "balance_transfer",
      defersToEnterpriseEngine: true,
      supportingDomains: ["product", "financial"],
    };
  }

  if (/\blap\b/.test(q) && /\bhome loan\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "comparison",
      lines: ["Home loan funds purchase.", "LAP unlocks property equity."],
      defersToEnterpriseEngine: false,
      supportingDomains: ["product"],
    };
  }

  return {
    fragmentId: newId(),
    mode: "comparison",
    lines: ["Let's compare key differences.", "Engines confirm commercial terms."],
    defersToEnterpriseEngine: true,
    supportingDomains: ["product"],
  };
}
