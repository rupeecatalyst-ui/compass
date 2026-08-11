/**
 * Educational Responses (CO-AI-106).
 * Short teaching lines for lending literacy.
 */

import type { EaiAdvisoryFragment } from "@/types/enterprise-ai-advisory-reasoning";

function newId(): string {
  return `eai_adv_edu_${crypto.randomUUID().slice(0, 8)}`;
}

export function reasonEaiEducationalResponse(question: string): EaiAdvisoryFragment | null {
  const q = question.toLowerCase();
  if (!/\blearn\b|\beducat\b|\bbasics?\b|\bfor beginners?\b|\bhelp me understand\b/.test(q)) {
    return null;
  }

  return {
    fragmentId: newId(),
    mode: "educational",
    lines: ["Lending starts with clarity.", "Ask about EMI, BT, or eligibility."],
    defersToEnterpriseEngine: false,
    supportingDomains: ["knowledge"],
  };
}
