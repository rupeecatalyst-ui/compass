/**
 * Customer Guidance Framework (CO-AI-106).
 * Next-step guidance — never CRM mutations.
 */

import type { EaiAdvisoryFragment } from "@/types/enterprise-ai-advisory-reasoning";

function newId(): string {
  return `eai_adv_cg_${crypto.randomUUID().slice(0, 8)}`;
}

export function reasonEaiCustomerGuidance(question: string): EaiAdvisoryFragment | null {
  const q = question.toLowerCase();

  if (/\bdocument|kyc|paper|upload\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "customer_guidance",
      lines: ["One document remaining.", "Upload it to keep momentum."],
      toneCategoryId: "documents",
      defersToEnterpriseEngine: false,
      supportingDomains: ["document"],
    };
  }

  if (/\bwhat (should|do) i (do|next)\b|\bnext step\b|\bguide me\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "customer_guidance",
      lines: ["Let me check a few details.", "Then we choose the next step."],
      toneCategoryId: "eligibility",
      defersToEnterpriseEngine: false,
      supportingDomains: ["conversation"],
    };
  }

  if (/\bwait|pending|how long\b/.test(q)) {
    return {
      fragmentId: newId(),
      mode: "customer_guidance",
      lines: ["Preparing your recommendation.", "Thank you for your patience."],
      toneCategoryId: "waiting",
      defersToEnterpriseEngine: false,
      supportingDomains: ["conversation"],
    };
  }

  return null;
}
