/**
 * Planner & Next Best Action Orchestrator (CO-AI-107).
 * Answers: what information is still required? what should happen next?
 * Never executes actions.
 */

import {
  EAI_PLANNER_DISCLAIMERS,
  EAI_PLANNER_VERSION,
} from "@/constants/enterprise-ai-platform/planner";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type {
  EaiPlannerPlan,
  EaiPlannerRequest,
} from "@/types/enterprise-ai-planner";
import { ensureEaiBehaviourPackScaffolds } from "../behaviour-packs";
import { normaliseEaiConversationMemory } from "../context-intelligence/conversation-memory";
import { buildEaiContextPackage } from "../context-intelligence/package-builder";
import { evaluateEaiDomainBoundary } from "../domain-governance/domain-boundary";
import { runEaiFinancialDecisionIntelligence } from "../financial-decision-intelligence/decision-engine";
import { generateEaiPlannerActionProposals } from "./action-proposal-generator";
import { planEaiConversation } from "./conversation-planner";
import { planEaiFollowUps } from "./follow-up-planning";
import { detectEaiMissingInformation } from "./missing-information";
import { deriveEaiNextBestActions } from "./next-best-action";
import { selectEaiPlannerQuestions } from "./question-selection";
import { sequenceEaiPlannerRecommendations } from "./recommendation-sequencing";
import { validateEaiPlannerPlan } from "./validation";

function newId(): string {
  return `eai_plan_${crypto.randomUUID()}`;
}

/**
 * Run the Planner & Next Best Action Engine.
 */
export async function runEaiPlanner(request: EaiPlannerRequest): Promise<EaiPlannerPlan> {
  ensureEaiBehaviourPackScaffolds();

  const utterance = (request.utterance ?? "").trim();
  const conversationMemory = normaliseEaiConversationMemory(request.conversationMemory);

  const domainBoundary = evaluateEaiDomainBoundary({
    utterance,
    personaPackId: request.personaPackId,
  });

  if (domainBoundary.blocksLlm || domainBoundary.policyDeny) {
    const draft = {
      planId: newId(),
      version: EAI_PLANNER_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      utterance,
      builtAt: new Date().toISOString(),
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      domainBoundary,
      missingInformation: [],
      selectedQuestions: [],
      skippedQuestions: [],
      nextBestActions: deriveEaiNextBestActions({
        utterance,
        missing: [],
        selectedQuestions: [],
        blocked: true,
      }),
      sequencedRecommendations: [],
      followUps: [],
      actionProposalIds: [],
      memoryProjection: conversationMemory ?? {
        knownFacts: [],
        openQuestions: [],
        previousRecommendations: [],
        outstandingActions: [],
      },
      confidence: "high" as const,
      disclaimers: [...EAI_PLANNER_DISCLAIMERS],
    };
    return { ...draft, validation: validateEaiPlannerPlan(draft) };
  }

  const contextPackage =
    request.contextPackage ??
    (await buildEaiContextPackage({
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      requestHint: utterance,
      conversationMemory,
      entityRefs: request.entityRefs,
    }));

  if (contextPackage.domainBoundaryBlocked) {
    const draft = {
      planId: newId(),
      version: EAI_PLANNER_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      utterance,
      builtAt: new Date().toISOString(),
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      domainBoundary,
      contextPackageId: contextPackage.packageId,
      missingInformation: [],
      selectedQuestions: [],
      skippedQuestions: [],
      nextBestActions: deriveEaiNextBestActions({
        utterance,
        missing: [],
        selectedQuestions: [],
        blocked: true,
      }),
      sequencedRecommendations: [],
      followUps: [],
      actionProposalIds: [],
      memoryProjection: conversationMemory ?? {
        knownFacts: [],
        openQuestions: [],
        previousRecommendations: [],
        outstandingActions: [],
      },
      confidence: "high" as const,
      disclaimers: [...EAI_PLANNER_DISCLAIMERS],
    };
    return { ...draft, validation: validateEaiPlannerPlan(draft) };
  }

  const fdiPackage =
    request.fdiPackage ??
    (await runEaiFinancialDecisionIntelligence({
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      question: utterance,
      contextPackage,
      entityRefs: request.entityRefs,
    }));

  const missing = detectEaiMissingInformation({
    utterance,
    conversationMemory: conversationMemory ?? contextPackage.conversationMemory,
    contextPackage,
  });

  const { selected, skipped } = selectEaiPlannerQuestions({
    missing,
    conversationMemory: conversationMemory ?? contextPackage.conversationMemory,
  });

  const rawActions = deriveEaiNextBestActions({
    utterance,
    missing,
    selectedQuestions: selected,
  });

  const { sequenced, lines } = sequenceEaiPlannerRecommendations(rawActions);

  const followUps = planEaiFollowUps({
    missing,
    selectedQuestions: selected,
    utterance,
  });

  const memoryProjection = planEaiConversation({
    utterance,
    missing,
    selectedQuestions: selected,
    conversationMemory: conversationMemory ?? contextPackage.conversationMemory,
    recommendationLines: lines,
  });

  const actionProposalIds = generateEaiPlannerActionProposals({
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    actions: sequenced,
    emit: request.emitActionProposals === true,
  });

  // Reflect outstanding proposal actions into memory projection
  if (actionProposalIds.length > 0) {
    memoryProjection.outstandingActions = [
      ...actionProposalIds.map((id) => `proposal:${id}`),
      ...memoryProjection.outstandingActions,
    ].slice(0, 20);
  }

  const confidence =
    selected.length > 0
      ? ("moderate" as const)
      : fdiPackage.confidence.band !== "unspecified"
        ? fdiPackage.confidence.band
        : ("moderate" as const);

  const draft = {
    planId: newId(),
    version: EAI_PLANNER_VERSION,
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    personaPackId: request.personaPackId,
    utterance,
    builtAt: new Date().toISOString(),
    blocked: false,
    domainBoundary,
    contextPackageId: contextPackage.packageId,
    fdiPackageId: fdiPackage.packageId,
    advisoryResultId: request.advisoryResult?.resultId,
    missingInformation: missing,
    selectedQuestions: selected,
    skippedQuestions: skipped,
    nextBestActions: sequenced,
    sequencedRecommendations: lines,
    followUps,
    actionProposalIds,
    memoryProjection,
    confidence,
    disclaimers: [...EAI_PLANNER_DISCLAIMERS],
  };

  return { ...draft, validation: validateEaiPlannerPlan(draft) };
}
