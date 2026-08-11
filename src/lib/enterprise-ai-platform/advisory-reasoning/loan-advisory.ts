/**
 * Loan Advisory Engine — advisory framing only (CO-AI-106).
 * Never calculates eligibility or EMI.
 */

import type { EaiAdvisoryFragment } from "@/types/enterprise-ai-advisory-reasoning";

function newId(): string {
  return `eai_adv_loan_${crypto.randomUUID().slice(0, 8)}`;
}

export function reasonEaiLoanAdvisory(question: string): EaiAdvisoryFragment | null {
  const q = question.toLowerCase();

  if (/\bemi\b|\bafford|\breduce my emi\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "loan_advisory",
      lines: ["Let's review your EMI options.", "Engines will compute the numbers."],
      toneCategoryId: "eligibility",
      defersToEnterpriseEngine: true,
      supportingDomains: ["loan", "financial"],
    };
  }

  if (/\btop[\s-]?up\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "loan_advisory",
      lines: ["Top-up can unlock extra funds.", "Eligibility stays with engines."],
      defersToEnterpriseEngine: true,
      supportingDomains: ["loan"],
    };
  }

  if (/\bbalance transfer\b|\bbt\b/.test(q) && /\bshould\b|\bcan i\b|\bworth\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "loan_advisory",
      lines: ["Let's reduce your borrowing cost.", "Share outstanding details next."],
      toneCategoryId: "balance_transfer",
      defersToEnterpriseEngine: true,
      supportingDomains: ["loan", "financial"],
    };
  }

  if (/\bloan\b|\bborrow\b|\blending\b/.test(q) && /\bshould\b|\badvise\b|\brecommend\b|\bcan i\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "loan_advisory",
      lines: ["Let me check a few details.", "Engines decide eligibility later."],
      toneCategoryId: "eligibility",
      defersToEnterpriseEngine: true,
      supportingDomains: ["loan"],
    };
  }

  return null;
}
