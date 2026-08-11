/**
 * Product Explanation Engine (CO-AI-106).
 * Explains product families — never invents pricing.
 */

import type { EaiContextPackage } from "@/types/enterprise-ai-context-intelligence";
import type { EaiAdvisoryFragment } from "@/types/enterprise-ai-advisory-reasoning";

function newId(): string {
  return `eai_adv_prod_${crypto.randomUUID().slice(0, 8)}`;
}

export function reasonEaiProductExplanation(input: {
  question: string;
  contextPackage?: EaiContextPackage;
}): EaiAdvisoryFragment | null {
  const q = input.question.toLowerCase();
  const hasProduct = input.contextPackage?.domainsIncluded.includes("product");

  if (!/\bproduct\b|\bhome loan\b|\blap\b|\bbusiness loan\b|\bpersonal loan\b|\bworking capital\b/.test(q) && !hasProduct) {
    return null;
  }

  if (/\blap\b|\bloan against property\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "product_explanation",
      lines: ["LAP uses property as security.", "Let's support your business growth."],
      toneCategoryId: "loan_against_property",
      defersToEnterpriseEngine: false,
      supportingDomains: hasProduct ? ["product"] : [],
    };
  }

  if (/\bbusiness loan\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "product_explanation",
      lines: ["Business loans fund operations.", "Let's grow your business finance."],
      toneCategoryId: "business_loan",
      defersToEnterpriseEngine: false,
      supportingDomains: hasProduct ? ["product"] : [],
    };
  }

  if (/\bworking capital\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "product_explanation",
      lines: ["Working capital supports cash flow.", "Let's strengthen liquidity planning."],
      toneCategoryId: "working_capital",
      defersToEnterpriseEngine: false,
      supportingDomains: hasProduct ? ["product"] : [],
    };
  }

  if (/\bpersonal loan\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "product_explanation",
      lines: ["Personal loans are unsecured.", "Let's review personal loan options."],
      toneCategoryId: "personal_loan",
      defersToEnterpriseEngine: false,
      supportingDomains: hasProduct ? ["product"] : [],
    };
  }

  if (/\bhome loan\b|\bproduct\b/.test(q) || hasProduct) {
    return {
      fragmentId: newId(),
      mode: "product_explanation",
      lines: ["Buying a home matters.", "Let's explore your options."],
      toneCategoryId: "home_loan",
      defersToEnterpriseEngine: false,
      supportingDomains: hasProduct ? ["product"] : [],
    };
  }

  return null;
}
