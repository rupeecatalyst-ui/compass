/**
 * Explainability & Trust Orchestrator (CO-AI-110).
 * Explains recommendations without fabricating reasons or hiding uncertainty.
 */

import {
  EAI_EXPLAINABILITY_DISCLAIMERS,
  EAI_EXPLAINABILITY_VERSION,
} from "@/constants/enterprise-ai-platform/explainability";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type {
  EaiExplainabilityRequest,
  EaiTrustPackage,
} from "@/types/enterprise-ai-explainability";
import { ensureEaiBehaviourPackScaffolds } from "../behaviour-packs";
import { evaluateEaiDomainBoundary } from "../domain-governance/domain-boundary";
import { runEaiLeadIntelligence } from "../lead-intelligence/orchestrator";
import { explainEaiAlternativeRecommendations } from "./alternative-explanation";
import { explainEaiTrustConfidence } from "./confidence-explanation";
import { buildEaiDecisionTrace } from "./decision-trace";
import { buildEaiRecommendationExplanation } from "./recommendation-explanation";
import { deriveEaiTrustReasonCodes } from "./reason-codes";
import {
  collectEaiTrustMissingInformation,
  collectEaiTrustSupportingFacts,
  deriveEaiTrustAssumptions,
} from "./supporting-facts";
import { validateEaiTrustPackage } from "./validation";

function newId(): string {
  return `eai_trust_${crypto.randomUUID()}`;
}

/**
 * Run Explainability & Trust Engine — returns a Trust Package.
 */
export async function runEaiExplainabilityTrust(
  request: EaiExplainabilityRequest,
): Promise<EaiTrustPackage> {
  ensureEaiBehaviourPackScaffolds();

  const resolvedUtterance =
    request.consultation?.utterance?.trim() ||
    request.utterance?.trim() ||
    "Explain recommendation";

  const domainBoundary = evaluateEaiDomainBoundary({
    utterance: resolvedUtterance,
    personaPackId: request.personaPackId,
  });

  if (
    domainBoundary.blocksLlm ||
    domainBoundary.policyDeny ||
    request.consultation?.blocked ||
    request.leadIntelligence?.blocked
  ) {
    const reasonCodes = deriveEaiTrustReasonCodes({ blocked: true });
    const confidenceExplanation = explainEaiTrustConfidence({
      blocked: true,
      reasonCodes,
    });
    const recommendationExplanation = buildEaiRecommendationExplanation({
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      reasonCodes,
      supportingFacts: [],
      assumptions: [],
      missingInformation: [],
      confidenceExplanation,
      alternatives: [],
    });
    const decisionTrace = buildEaiDecisionTrace({ blocked: true });
    const draft = {
      packageId: newId(),
      version: EAI_EXPLAINABILITY_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      builtAt: new Date().toISOString(),
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      domainBoundary,
      leadIntelligenceResultId: request.leadIntelligence?.resultId,
      consultationId: request.consultation?.consultationId,
      recommendationExplanation,
      decisionTrace,
      facts: [],
      assumptions: [],
      recommendations: [
        {
          title: "Outside domain",
          summary: EAI_OUTSIDE_DOMAIN_REFUSAL,
          statementClass: "recommendation" as const,
        },
      ],
      disclaimers: [...EAI_EXPLAINABILITY_DISCLAIMERS],
    };
    return { ...draft, validation: validateEaiTrustPackage(draft) };
  }

  const leadIntelligence =
    request.leadIntelligence ??
    (await runEaiLeadIntelligence({
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      utterance: resolvedUtterance,
      consultation: request.consultation,
      emitActionProposals: false,
    }));

  // If LI blocked after build, return outside package
  if (leadIntelligence.blocked) {
    const reasonCodes = deriveEaiTrustReasonCodes({ blocked: true });
    const confidenceExplanation = explainEaiTrustConfidence({
      blocked: true,
      reasonCodes,
    });
    const recommendationExplanation = buildEaiRecommendationExplanation({
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      reasonCodes,
      supportingFacts: [],
      assumptions: [],
      missingInformation: [],
      confidenceExplanation,
      alternatives: [],
    });
    const draft = {
      packageId: newId(),
      version: EAI_EXPLAINABILITY_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      builtAt: new Date().toISOString(),
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      domainBoundary: leadIntelligence.domainBoundary ?? domainBoundary,
      leadIntelligenceResultId: leadIntelligence.resultId,
      consultationId: leadIntelligence.consultationId ?? request.consultation?.consultationId,
      recommendationExplanation,
      decisionTrace: buildEaiDecisionTrace({ blocked: true }),
      facts: [],
      assumptions: [],
      recommendations: [
        {
          title: "Outside domain",
          summary: EAI_OUTSIDE_DOMAIN_REFUSAL,
          statementClass: "recommendation" as const,
        },
      ],
      disclaimers: [...EAI_EXPLAINABILITY_DISCLAIMERS],
    };
    return { ...draft, validation: validateEaiTrustPackage(draft) };
  }

  const consultation = request.consultation;
  const reasonCodes = deriveEaiTrustReasonCodes({
    leadIntelligence,
    consultation,
  });
  const supportingFacts = collectEaiTrustSupportingFacts(consultation);
  const missingInformation = collectEaiTrustMissingInformation(consultation);
  const assumptions = deriveEaiTrustAssumptions(reasonCodes, leadIntelligence);
  const confidenceExplanation = explainEaiTrustConfidence({
    leadIntelligence,
    consultation,
    reasonCodes,
  });
  const alternatives = explainEaiAlternativeRecommendations(leadIntelligence);
  const recommendationExplanation = buildEaiRecommendationExplanation({
    leadIntelligence,
    reasonCodes,
    supportingFacts,
    assumptions,
    missingInformation,
    confidenceExplanation,
    alternatives,
  });
  const decisionTrace = buildEaiDecisionTrace({
    consultation,
    leadIntelligence,
    fdiPackage: request.fdiPackage,
    plannerPlan: request.plannerPlan,
    advisoryResult: request.advisoryResult,
  });

  const recommendations = [
    {
      title: recommendationExplanation.recommendationTitle,
      summary: recommendationExplanation.recommendationSummary,
      statementClass: "recommendation" as const,
    },
    ...alternatives.map((a) => ({
      title: a.title,
      summary: a.summary,
      statementClass: "recommendation" as const,
    })),
  ];

  const draft = {
    packageId: newId(),
    version: EAI_EXPLAINABILITY_VERSION,
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    personaPackId: request.personaPackId,
    builtAt: new Date().toISOString(),
    blocked: false,
    domainBoundary,
    leadIntelligenceResultId: leadIntelligence.resultId,
    consultationId: consultation?.consultationId ?? leadIntelligence.consultationId,
    recommendationExplanation,
    decisionTrace,
    facts: supportingFacts,
    assumptions,
    recommendations,
    disclaimers: [...EAI_EXPLAINABILITY_DISCLAIMERS],
  };

  return { ...draft, validation: validateEaiTrustPackage(draft) };
}
