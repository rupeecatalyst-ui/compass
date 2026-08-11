/**
 * Knowledge & Advisory Reasoning Orchestrator (CO-AI-106).
 * Answers: "What advice should SARATHI provide?"
 */

import {
  EAI_ADVISORY_DISCLAIMERS,
  EAI_ADVISORY_REASONING_VERSION,
} from "@/constants/enterprise-ai-platform/advisory-reasoning";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type {
  EaiAdvisoryFragment,
  EaiAdvisoryMode,
  EaiAdvisoryReasoningRequest,
  EaiAdvisoryReasoningResult,
} from "@/types/enterprise-ai-advisory-reasoning";
import { ensureEaiBehaviourPackScaffolds } from "../behaviour-packs";
import { buildEaiContextPackage } from "../context-intelligence/package-builder";
import { evaluateEaiDomainBoundary } from "../domain-governance/domain-boundary";
import { runEaiFinancialDecisionIntelligence } from "../financial-decision-intelligence/decision-engine";
import { reasonEaiBenefitTradeoff } from "./benefit-tradeoff";
import { reasonEaiComparison } from "./comparison";
import { composeEaiAdvisoryFacingText } from "./compose-advice";
import { resolveEaiToneAudience } from "../domain-governance/tone-library";
import { reasonEaiCustomerGuidance } from "./customer-guidance";
import { reasonEaiEducationalResponse } from "./educational";
import { reasonEaiJourneyGuidance } from "./journey-guidance";
import { reasonEaiKnowledgeAdvice } from "./knowledge-reasoning";
import { reasonEaiLoanAdvisory } from "./loan-advisory";
import { reasonEaiProductExplanation } from "./product-explanation";
import { validateEaiAdvisoryReasoningResult } from "./validation";

function newId(): string {
  return `eai_adv_${crypto.randomUUID()}`;
}

function collectFragments(input: {
  question: string;
  contextPackage?: EaiAdvisoryReasoningRequest["contextPackage"];
}): EaiAdvisoryFragment[] {
  const fragments: EaiAdvisoryFragment[] = [];
  const push = (f: EaiAdvisoryFragment | null) => {
    if (f) fragments.push(f);
  };

  push(reasonEaiKnowledgeAdvice({ question: input.question, contextPackage: input.contextPackage }));
  push(reasonEaiLoanAdvisory(input.question));
  push(
    reasonEaiProductExplanation({
      question: input.question,
      contextPackage: input.contextPackage,
    }),
  );
  push(reasonEaiComparison(input.question));
  push(reasonEaiBenefitTradeoff(input.question));
  push(reasonEaiEducationalResponse(input.question));
  push(reasonEaiCustomerGuidance(input.question));
  push(
    reasonEaiJourneyGuidance({
      question: input.question,
      contextPackage: input.contextPackage,
    }),
  );

  return fragments;
}

/**
 * Run Knowledge & Advisory Reasoning for a customer question.
 */
export async function runEaiAdvisoryReasoning(
  request: EaiAdvisoryReasoningRequest,
): Promise<EaiAdvisoryReasoningResult> {
  ensureEaiBehaviourPackScaffolds();

  const question = (request.question ?? "").trim();
  const domainBoundary = evaluateEaiDomainBoundary({
    utterance: question,
    personaPackId: request.personaPackId,
  });

  if (domainBoundary.blocksLlm || domainBoundary.policyDeny) {
    const draft = {
      resultId: newId(),
      version: EAI_ADVISORY_REASONING_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      question,
      builtAt: new Date().toISOString(),
      modesUsed: ["outside_refused" as EaiAdvisoryMode],
      fragments: [] as EaiAdvisoryFragment[],
      facingText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      confidence: "low" as const,
      domainBoundary,
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      disclaimers: [...EAI_ADVISORY_DISCLAIMERS],
    };
    return { ...draft, validation: validateEaiAdvisoryReasoningResult(draft) };
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

  if (contextPackage.domainBoundaryBlocked) {
    const draft = {
      resultId: newId(),
      version: EAI_ADVISORY_REASONING_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      question,
      builtAt: new Date().toISOString(),
      modesUsed: ["outside_refused" as EaiAdvisoryMode],
      fragments: [] as EaiAdvisoryFragment[],
      facingText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      confidence: "low" as const,
      domainBoundary,
      contextPackageId: contextPackage.packageId,
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      disclaimers: [...EAI_ADVISORY_DISCLAIMERS],
    };
    return { ...draft, validation: validateEaiAdvisoryReasoningResult(draft) };
  }

  const fdiPackage =
    request.fdiPackage ??
    (await runEaiFinancialDecisionIntelligence({
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      question,
      contextPackage,
      entityRefs: request.entityRefs,
    }));

  const fragments = collectFragments({ question, contextPackage });

  // If nothing matched but domain allowed, provide minimal guidance
  const audience = resolveEaiToneAudience(request.personaPackId);
  if (fragments.length === 0) {
    fragments.push({
      fragmentId: `eai_adv_fb_${crypto.randomUUID().slice(0, 8)}`,
      mode: "customer_guidance",
      lines:
        audience === "partner"
          ? ["Eligibility inputs required.", "Confirm product and amount."]
          : ["Let me check a few details.", "Ask about loans or EMI."],
      toneCategoryId: "eligibility",
      defersToEnterpriseEngine: false,
      supportingDomains: ["conversation"],
    });
  }

  const { facingText } = composeEaiAdvisoryFacingText(fragments, audience);
  const modesUsed = [...new Set(fragments.map((f) => f.mode))];

  const confidence =
    fdiPackage.confidence.band !== "unspecified"
      ? fdiPackage.confidence.band
      : fragments.some((f) => f.defersToEnterpriseEngine)
        ? "moderate"
        : "moderate";

  const draft = {
    resultId: newId(),
    version: EAI_ADVISORY_REASONING_VERSION,
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    personaPackId: request.personaPackId,
    question,
    builtAt: new Date().toISOString(),
    modesUsed,
    fragments,
    facingText,
    confidence,
    domainBoundary,
    fdiPackageId: fdiPackage.packageId,
    contextPackageId: contextPackage.packageId,
    blocked: false,
    disclaimers: [...EAI_ADVISORY_DISCLAIMERS],
  };

  return { ...draft, validation: validateEaiAdvisoryReasoningResult(draft) };
}
