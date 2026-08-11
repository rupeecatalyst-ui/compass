/**
 * Loan Journey Guidance (CO-AI-106).
 * Orient customers in the journey — not workflow execution.
 */

import type { EaiContextPackage } from "@/types/enterprise-ai-context-intelligence";
import type { EaiAdvisoryFragment } from "@/types/enterprise-ai-advisory-reasoning";

function newId(): string {
  return `eai_adv_jny_${crypto.randomUUID().slice(0, 8)}`;
}

export function reasonEaiJourneyGuidance(input: {
  question: string;
  contextPackage?: EaiContextPackage;
}): EaiAdvisoryFragment | null {
  const q = input.question.toLowerCase();
  const hasWorkflow = input.contextPackage?.domainsIncluded.includes("workflow");

  if (
    !/\bjourney\b|\bstage\b|\bprocess\b|\bwhere am i\b|\bnext stage\b|\bapplication\b/.test(q) &&
    !hasWorkflow
  ) {
    return null;
  }

  return {
    fragmentId: newId(),
    mode: "journey_guidance",
    lines: ["Your loan journey has clear stages.", "We move one step at a time."],
    toneCategoryId: "completion",
    defersToEnterpriseEngine: false,
    supportingDomains: hasWorkflow ? ["workflow"] : ["knowledge"],
  };
}
