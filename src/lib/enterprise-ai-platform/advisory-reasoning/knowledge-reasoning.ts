/**
 * Knowledge Reasoning — short educational knowledge advice (CO-AI-106).
 */

import type { EaiContextPackage } from "@/types/enterprise-ai-context-intelligence";
import type { EaiAdvisoryFragment } from "@/types/enterprise-ai-advisory-reasoning";

function newId(): string {
  return `eai_adv_kn_${crypto.randomUUID().slice(0, 8)}`;
}

export function reasonEaiKnowledgeAdvice(input: {
  question: string;
  contextPackage?: EaiContextPackage;
}): EaiAdvisoryFragment | null {
  const q = input.question.toLowerCase();
  const hasKnowledge = input.contextPackage?.domainsIncluded.includes("knowledge");

  if (!/\bwhat is\b|\bexplain\b|\bmean\b|\bdefine\b|\bhow does\b/.test(q) && !hasKnowledge) {
    return null;
  }

  if (/\bbalance transfer\b|\bbt\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "knowledge",
      lines: ["Balance Transfer moves your loan.", "It can lower borrowing cost."],
      toneCategoryId: "balance_transfer",
      defersToEnterpriseEngine: false,
      supportingDomains: hasKnowledge ? ["knowledge"] : [],
    };
  }

  if (/\bfoir\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "knowledge",
      lines: ["FOIR measures obligation load.", "Engines calculate your FOIR."],
      toneCategoryId: "eligibility",
      defersToEnterpriseEngine: true,
      supportingDomains: hasKnowledge ? ["knowledge"] : [],
    };
  }

  if (/\bdbr\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "knowledge",
      lines: ["DBR reflects debt burden.", "Engines own the calculation."],
      toneCategoryId: "eligibility",
      defersToEnterpriseEngine: true,
      supportingDomains: hasKnowledge ? ["knowledge"] : [],
    };
  }

  if (/\bemi\b/.test(q) && /\bwhat is\b|\bexplain\b|\bmean\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "knowledge",
      lines: ["EMI is your monthly instalment.", "Engines compute exact EMI."],
      toneCategoryId: "eligibility",
      defersToEnterpriseEngine: true,
      supportingDomains: hasKnowledge ? ["knowledge"] : [],
    };
  }

  if (/\bhome loan\b|\bhousing loan\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "knowledge",
      lines: ["A home loan funds your property.", "Let's explore your options."],
      toneCategoryId: "home_loan",
      defersToEnterpriseEngine: false,
      supportingDomains: hasKnowledge ? ["knowledge"] : [],
    };
  }

  if (/\bwhat is\b|\bexplain\b/.test(q) || hasKnowledge) {
    return {
      fragmentId: newId(),
      mode: "knowledge",
      lines: ["I can explain lending concepts.", "Ask about loans or EMI."],
      defersToEnterpriseEngine: false,
      supportingDomains: hasKnowledge ? ["knowledge"] : [],
    };
  }

  return null;
}
