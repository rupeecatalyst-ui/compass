/**
 * Benefit / Trade-off Engine (CO-AI-106).
 * Explains trade-offs qualitatively — never computes savings.
 */

import type { EaiAdvisoryFragment } from "@/types/enterprise-ai-advisory-reasoning";

function newId(): string {
  return `eai_adv_btf_${crypto.randomUUID().slice(0, 8)}`;
}

export function reasonEaiBenefitTradeoff(question: string): EaiAdvisoryFragment | null {
  const q = question.toLowerCase();
  if (
    !/\bbenefit\b|\btrade[\s-]?off\b|\bpros?\b|\bcons?\b|\badvantage\b|\bdisadvantage\b|\blonger tenure\b|\bshorter tenure\b/.test(
      q,
    )
  ) {
    return null;
  }

  if (/\btenure\b|\bemi\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "benefit_tradeoff",
      lines: ["Longer tenure lowers EMI.", "Total interest may rise."],
      defersToEnterpriseEngine: true,
      supportingDomains: ["financial"],
    };
  }

  if (/\bbalance transfer\b|\bbt\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "benefit_tradeoff",
      lines: ["BT may reduce rate burden.", "Fees and tenure still matter."],
      toneCategoryId: "balance_transfer",
      defersToEnterpriseEngine: true,
      supportingDomains: ["financial"],
    };
  }

  return {
    fragmentId: newId(),
    mode: "benefit_tradeoff",
    lines: ["Every option has trade-offs.", "Engines quantify the impact."],
    defersToEnterpriseEngine: true,
    supportingDomains: ["financial"],
  };
}
