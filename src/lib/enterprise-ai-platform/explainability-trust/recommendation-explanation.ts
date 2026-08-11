/**
 * Recommendation Explanation builder (CO-AI-110).
 */

import type { EaiLeadIntelligenceResult } from "@/types/enterprise-ai-lead-intelligence";
import type {
  EaiAlternativeRecommendationExplanation,
  EaiConfidenceExplanation,
  EaiRecommendationExplanation,
  EaiTrustAssumption,
  EaiTrustMissingInfo,
  EaiTrustReasonCode,
  EaiTrustSupportingFact,
} from "@/types/enterprise-ai-explainability";
import { applyEaiMicroCommunication } from "../domain-governance/micro-communication";

function newId(): string {
  return `eai_rexp_${crypto.randomUUID().slice(0, 8)}`;
}

export function buildEaiRecommendationExplanation(input: {
  blocked?: boolean;
  refusalText?: string;
  leadIntelligence?: EaiLeadIntelligenceResult;
  reasonCodes: EaiTrustReasonCode[];
  supportingFacts: EaiTrustSupportingFact[];
  assumptions: EaiTrustAssumption[];
  missingInformation: EaiTrustMissingInfo[];
  confidenceExplanation: EaiConfidenceExplanation;
  alternatives: EaiAlternativeRecommendationExplanation[];
}): EaiRecommendationExplanation {
  if (input.blocked) {
    const text = input.refusalText ?? "I'm not trained for this subject.";
    return {
      explanationId: newId(),
      recommendationTitle: "Outside domain",
      recommendationSummary: text,
      statementClass: "recommendation",
      reasonCodes: input.reasonCodes,
      supportingFacts: [],
      assumptions: [],
      missingInformation: [],
      confidenceExplanation: input.confidenceExplanation,
      alternatives: [],
      facingLines: [text],
    };
  }

  const primary = input.leadIntelligence?.nextBestActions[0];
  const ranked = input.leadIntelligence?.rankedProposals[0];

  const recommendationTitle = primary?.title ?? ranked?.title ?? "Continue consultation";
  const recommendationSummary =
    primary?.summary ??
    ranked?.summary ??
    "Insufficient readiness for CRM proposals — continue gathering facts.";

  const factLine =
    input.supportingFacts.length > 0
      ? `Facts: ${input.supportingFacts
          .slice(0, 2)
          .map((f) => f.value)
          .join(", ")}.`
      : "Facts: limited evidence captured.";
  const uncertaintyLine =
    input.confidenceExplanation.uncertaintyLines[0] ?? "Uncertainty remains.";

  const micro = applyEaiMicroCommunication(`${recommendationTitle}. ${uncertaintyLine}`);

  return {
    explanationId: newId(),
    recommendationTitle,
    recommendationSummary,
    statementClass: "recommendation",
    reasonCodes: input.reasonCodes,
    supportingFacts: input.supportingFacts,
    assumptions: input.assumptions,
    missingInformation: input.missingInformation.filter((m) => !m.alreadyKnown),
    confidenceExplanation: input.confidenceExplanation,
    alternatives: input.alternatives,
    facingLines: [micro.text, factLine].filter(Boolean),
  };
}
