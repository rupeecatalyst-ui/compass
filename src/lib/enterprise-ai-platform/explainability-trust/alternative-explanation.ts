/**
 * Alternative recommendation explanations (CO-AI-110).
 */

import type { EaiLeadIntelligenceResult } from "@/types/enterprise-ai-lead-intelligence";
import type { EaiAlternativeRecommendationExplanation } from "@/types/enterprise-ai-explainability";

function newId(): string {
  return `eai_alt_${crypto.randomUUID().slice(0, 8)}`;
}

export function explainEaiAlternativeRecommendations(
  leadIntelligence?: EaiLeadIntelligenceResult,
): EaiAlternativeRecommendationExplanation[] {
  if (!leadIntelligence || leadIntelligence.blocked) return [];

  const alternatives: EaiAlternativeRecommendationExplanation[] = [];
  const primary = leadIntelligence.nextBestActions[0];

  for (const action of leadIntelligence.nextBestActions.slice(1, 4)) {
    alternatives.push({
      alternativeId: newId(),
      title: action.title,
      summary: action.summary,
      whyNotPrimary: primary
        ? `Lower priority than "${primary.title}" (priority ${action.priorityScore} vs ${primary.priorityScore})`
        : "Not selected as primary next best action",
      reasonCodes:
        action.kind === "propose_request_documents"
          ? ["RC_ALTERNATIVE_REQUEST_DOCUMENTS", "RC_DOCUMENTS_GAP"]
          : action.kind === "continue_consultation"
            ? ["RC_ALTERNATIVE_CONTINUE_CONSULTATION", "RC_INFORMATION_GAPS"]
            : ["RC_HUMAN_APPROVAL_REQUIRED"],
      statementClass: "recommendation",
    });
  }

  // Always surface continue-consultation as alternative when primary is a CRM proposal
  if (
    primary &&
    (primary.kind === "propose_create_lead" || primary.kind === "propose_create_opportunity") &&
    !alternatives.some((a) => a.reasonCodes.includes("RC_ALTERNATIVE_CONTINUE_CONSULTATION"))
  ) {
    alternatives.push({
      alternativeId: newId(),
      title: "Continue consultation",
      summary: "Gather remaining facts before stronger CRM proposals.",
      whyNotPrimary: "Primary path proposes CRM Action Proposal drafts; continuing consultation remains safer when gaps exist",
      reasonCodes: ["RC_ALTERNATIVE_CONTINUE_CONSULTATION"],
      statementClass: "recommendation",
    });
  }

  return alternatives.slice(0, 4);
}
