/**
 * Financial Decision Engine Framework (CO-AI-105).
 * Orchestrates FDI: Policy Gate → CIE → recommend / explain / confidence / alternatives / scenarios.
 * Never calculates eligibility, FOIR, DBR, pricing, or approvals.
 */

import {
  EAI_FDI_DISCLAIMERS,
  EAI_FDI_VERSION,
} from "@/constants/enterprise-ai-platform/financial-decision-intelligence";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type {
  EaiFdiDecisionPackage,
  EaiFdiDecisionRequest,
} from "@/types/enterprise-ai-financial-decision";
import { buildEaiContextPackage } from "../context-intelligence/package-builder";
import { evaluateEaiDomainBoundary } from "../domain-governance/domain-boundary";
import { ensureEaiBehaviourPackScaffolds } from "../behaviour-packs";
import { evaluateEaiPolicy } from "../policy-gate";
import { buildEaiFdiAlternatives } from "./alternatives";
import { assessEaiFdiConfidence } from "./confidence";
import { buildEaiFdiExplanation } from "./explainability";
import { buildEaiFdiRecommendations } from "./recommendation";
import { selectEaiFdiScenarios } from "./scenarios";
import { validateEaiFdiDecisionPackage } from "./validation";

function newId(): string {
  return `eai_fdi_${crypto.randomUUID()}`;
}

/**
 * Run Financial Decision Intelligence for a question.
 * Consumes CIE + Policy Gate. Does not invoke calculation engines.
 */
export async function runEaiFinancialDecisionIntelligence(
  request: EaiFdiDecisionRequest,
): Promise<EaiFdiDecisionPackage> {
  ensureEaiBehaviourPackScaffolds();

  const question = (request.question ?? "").trim();
  const domainBoundary = evaluateEaiDomainBoundary({
    utterance: question,
    personaPackId: request.personaPackId,
  });

  const policyDecision = evaluateEaiPolicy({
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    personaPackId: request.personaPackId,
    requestedToolIds: [],
    requestedDataScopes: ["product.catalog_public", "opportunity.summary"],
    intentHint: question,
    utterance: question,
    requestedCapabilityIds: ["ask_questions", "explain_products"],
  });

  const blocked = domainBoundary.blocksLlm || domainBoundary.policyDeny;

  if (blocked) {
    const confidence = assessEaiFdiConfidence({
      engineFacts: [],
      blocked: true,
      mixedDomain: false,
    });
    const explanation = buildEaiFdiExplanation({
      question,
      engineFacts: [],
      blocked: true,
    });
    const recommendations = buildEaiFdiRecommendations({
      question,
      engineFacts: [],
      confidence: confidence.band,
      blocked: true,
    });
    const draft = {
      packageId: newId(),
      version: EAI_FDI_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      question,
      builtAt: new Date().toISOString(),
      domainBoundary,
      policyDecision,
      recommendations,
      explanation,
      confidence,
      alternatives: [],
      scenarios: [],
      engineFactsUsed: [],
      disclaimers: [...EAI_FDI_DISCLAIMERS],
      blocked: true,
      refusalText: domainBoundary.safeRefusalText ?? EAI_OUTSIDE_DOMAIN_REFUSAL,
    };
    return { ...draft, validation: validateEaiFdiDecisionPackage(draft) };
  }

  const contextPackage =
    request.contextPackage ??
    (await buildEaiContextPackage({
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      requestHint: question,
      entityRefs: request.entityRefs,
    }));

  // If CIE blocked outside-domain mid-flight, honour refusal
  if (contextPackage.domainBoundaryBlocked) {
    const confidence = assessEaiFdiConfidence({
      engineFacts: [],
      blocked: true,
      mixedDomain: false,
    });
    const draft = {
      packageId: newId(),
      version: EAI_FDI_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      question,
      builtAt: new Date().toISOString(),
      domainBoundary,
      policyDecision,
      contextPackageId: contextPackage.packageId,
      recommendations: buildEaiFdiRecommendations({
        question,
        engineFacts: [],
        confidence: "low",
        blocked: true,
      }),
      explanation: buildEaiFdiExplanation({
        question,
        contextPackage,
        engineFacts: [],
        blocked: true,
      }),
      confidence,
      alternatives: [],
      scenarios: [],
      engineFactsUsed: [],
      disclaimers: [...EAI_FDI_DISCLAIMERS],
      blocked: true,
      refusalText: contextPackage.domainRefusalText ?? EAI_OUTSIDE_DOMAIN_REFUSAL,
    };
    return { ...draft, validation: validateEaiFdiDecisionPackage(draft) };
  }

  const engineFacts = (request.engineFacts ?? []).filter(
    (f) => f.provenance === "enterprise_engine" && f.engineId.trim(),
  );

  const confidence = assessEaiFdiConfidence({
    contextPackage,
    engineFacts,
    blocked: false,
    mixedDomain: domainBoundary.mixedDomain,
  });

  const recommendations = buildEaiFdiRecommendations({
    question,
    contextPackage,
    engineFacts,
    confidence: confidence.band,
    blocked: false,
  });

  const explanation = buildEaiFdiExplanation({
    question,
    contextPackage,
    engineFacts,
    blocked: false,
  });

  const alternatives = buildEaiFdiAlternatives({ question, blocked: false });
  const scenarios = selectEaiFdiScenarios(question, false);

  const draft = {
    packageId: newId(),
    version: EAI_FDI_VERSION,
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    personaPackId: request.personaPackId,
    question,
    builtAt: new Date().toISOString(),
    domainBoundary,
    policyDecision,
    contextPackageId: contextPackage.packageId,
    recommendations,
    explanation,
    confidence,
    alternatives,
    scenarios,
    engineFactsUsed: engineFacts,
    disclaimers: [...EAI_FDI_DISCLAIMERS],
    blocked: false,
  };

  return { ...draft, validation: validateEaiFdiDecisionPackage(draft) };
}
