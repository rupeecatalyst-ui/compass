/**
 * Consultation Intelligence Orchestrator (CO-AI-108).
 * Transforms conversations into structured Consultation Objects.
 * Never creates CRM records or executes workflows.
 */

import {
  EAI_CONSULTATION_DISCLAIMERS,
  EAI_CONSULTATION_VERSION,
} from "@/constants/enterprise-ai-platform/consultation-intelligence";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type {
  EaiConsultationObject,
  EaiConsultationRequest,
  EaiConsultationTransition,
} from "@/types/enterprise-ai-consultation";
import { ensureEaiBehaviourPackScaffolds } from "../behaviour-packs";
import { normaliseEaiConversationMemory } from "../context-intelligence/conversation-memory";
import { buildEaiContextPackage } from "../context-intelligence/package-builder";
import { evaluateEaiDomainBoundary } from "../domain-governance/domain-boundary";
import { detectEaiMissingInformation } from "../planner/missing-information";
import { assessEaiConsultationConfidence } from "./confidence";
import { scoreEaiConsultationCompletion } from "./completion-score";
import { extractEaiFinancialConcerns } from "./concerns";
import { extractEaiConsultationKeyFacts } from "./key-facts";
import { extractEaiCustomerObjectives } from "./objectives";
import {
  applyEaiConsultationTransition,
  deriveEaiConsultationLifecycleEvent,
} from "./state-machine";
import { buildEaiConsultationSummary } from "./summary";
import { validateEaiConsultationObject } from "./validation";

function newId(): string {
  return `eai_consult_${crypto.randomUUID()}`;
}

/**
 * Run Consultation Intelligence — returns a structured Consultation Object only.
 */
export async function runEaiConsultationIntelligence(
  request: EaiConsultationRequest,
): Promise<EaiConsultationObject> {
  ensureEaiBehaviourPackScaffolds();

  const utterance = (request.utterance ?? "").trim();
  const conversationMemory = normaliseEaiConversationMemory(request.conversationMemory);
  const priorState = request.priorState ?? "initiated";

  const domainBoundary = evaluateEaiDomainBoundary({
    utterance,
    personaPackId: request.personaPackId,
  });

  if (domainBoundary.blocksLlm || domainBoundary.policyDeny) {
    const refused = applyEaiConsultationTransition({
      from: priorState,
      event: "refuse_outside",
      reason: "Domain Boundary blocked",
    });
    const summary = buildEaiConsultationSummary({
      lifecycleState: "outside_refused",
      objectives: [],
      keyFacts: [],
      concerns: [],
      missing: [],
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
    });
    const confidence = assessEaiConsultationConfidence({
      keyFacts: [],
      objectives: [],
      missing: [],
      blocked: true,
    });
    const completionScore = scoreEaiConsultationCompletion({
      objectives: [],
      keyFacts: [],
      concerns: [],
      missing: [],
      summary,
      lifecycleState: "outside_refused",
    });
    const draft = {
      consultationId: newId(),
      version: EAI_CONSULTATION_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      utterance,
      builtAt: new Date().toISOString(),
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      domainBoundary,
      lifecycleState: "outside_refused" as const,
      transitions: refused.transition ? [refused.transition] : [],
      summary,
      keyFacts: [],
      customerObjectives: [],
      financialConcerns: [],
      missingInformation: [],
      confidence,
      completionScore,
      crmRecordsCreated: false as const,
      workflowsExecuted: false as const,
      disclaimers: [...EAI_CONSULTATION_DISCLAIMERS],
    };
    return { ...draft, validation: validateEaiConsultationObject(draft) };
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
    const refused = applyEaiConsultationTransition({
      from: priorState,
      event: "refuse_outside",
      reason: "Context package domain blocked",
    });
    const summary = buildEaiConsultationSummary({
      lifecycleState: "outside_refused",
      objectives: [],
      keyFacts: [],
      concerns: [],
      missing: [],
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
    });
    const draft = {
      consultationId: newId(),
      version: EAI_CONSULTATION_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      utterance,
      builtAt: new Date().toISOString(),
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      domainBoundary,
      contextPackageId: contextPackage.packageId,
      lifecycleState: "outside_refused" as const,
      transitions: refused.transition ? [refused.transition] : [],
      summary,
      keyFacts: [],
      customerObjectives: [],
      financialConcerns: [],
      missingInformation: [],
      confidence: assessEaiConsultationConfidence({
        keyFacts: [],
        objectives: [],
        missing: [],
        blocked: true,
      }),
      completionScore: scoreEaiConsultationCompletion({
        objectives: [],
        keyFacts: [],
        concerns: [],
        missing: [],
        summary,
        lifecycleState: "outside_refused",
      }),
      crmRecordsCreated: false as const,
      workflowsExecuted: false as const,
      disclaimers: [...EAI_CONSULTATION_DISCLAIMERS],
    };
    return { ...draft, validation: validateEaiConsultationObject(draft) };
  }

  const keyFacts = extractEaiConsultationKeyFacts({
    utterance,
    conversationMemory: conversationMemory ?? contextPackage.conversationMemory,
    contextPackage,
  });
  const customerObjectives = extractEaiCustomerObjectives({
    utterance,
    conversationMemory: conversationMemory ?? contextPackage.conversationMemory,
  });
  const financialConcerns = extractEaiFinancialConcerns({
    utterance,
    conversationMemory: conversationMemory ?? contextPackage.conversationMemory,
  });
  const missingInformation =
    request.plannerPlan?.missingInformation ??
    detectEaiMissingInformation({
      utterance,
      conversationMemory: conversationMemory ?? contextPackage.conversationMemory,
      contextPackage,
    });

  const transitions: EaiConsultationTransition[] = [];
  let state = priorState;

  // Ensure we leave initiated
  if (state === "initiated") {
    const started = applyEaiConsultationTransition({
      from: state,
      event: "start",
      reason: "Consultation started",
    });
    if (started.transition) transitions.push(started.transition);
    state = started.state;
  }

  const provisionalCompletion = scoreEaiConsultationCompletion({
    objectives: customerObjectives,
    keyFacts,
    concerns: financialConcerns,
    missing: missingInformation,
    lifecycleState: state,
  });

  const derived = deriveEaiConsultationLifecycleEvent({
    blocked: false,
    priorState: state,
    missingUnknownCount: missingInformation.filter((m) => !m.alreadyKnown).length,
    keyFactCount: keyFacts.length,
    objectiveCount: customerObjectives.length,
    completionScore: provisionalCompletion.score,
  });

  const advanced = applyEaiConsultationTransition({
    from: state,
    event: derived.event,
    reason: derived.reason,
  });
  if (advanced.ok && advanced.transition) {
    transitions.push(advanced.transition);
    state = advanced.state;
  }

  // Optionally move to summarizing/completed when thresholds met
  if (state === "advising" || state === "gathering" || state === "clarifying") {
    if (provisionalCompletion.score >= 70 && keyFacts.length >= 2) {
      const sum = applyEaiConsultationTransition({
        from: state,
        event: "summarize",
        reason: "Structure ready for consultation summary",
      });
      if (sum.ok && sum.transition) {
        transitions.push(sum.transition);
        state = sum.state;
      }
    }
  }
  if (state === "summarizing" && provisionalCompletion.score >= 85) {
    const done = applyEaiConsultationTransition({
      from: state,
      event: "complete",
      reason: "Consultation object complete",
    });
    if (done.ok && done.transition) {
      transitions.push(done.transition);
      state = done.state;
    }
  }

  const summary = buildEaiConsultationSummary({
    lifecycleState: state,
    objectives: customerObjectives,
    keyFacts,
    concerns: financialConcerns,
    missing: missingInformation,
  });

  const confidence = assessEaiConsultationConfidence({
    keyFacts,
    objectives: customerObjectives,
    missing: missingInformation,
  });

  const completionScore = scoreEaiConsultationCompletion({
    objectives: customerObjectives,
    keyFacts,
    concerns: financialConcerns,
    missing: missingInformation,
    summary,
    lifecycleState: state,
  });

  const draft = {
    consultationId: newId(),
    version: EAI_CONSULTATION_VERSION,
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    personaPackId: request.personaPackId,
    utterance,
    builtAt: new Date().toISOString(),
    blocked: false,
    domainBoundary,
    contextPackageId: contextPackage.packageId,
    plannerPlanId: request.plannerPlan?.planId,
    fdiPackageId: request.fdiPackage?.packageId ?? request.plannerPlan?.fdiPackageId,
    advisoryResultId: request.advisoryResult?.resultId,
    lifecycleState: state,
    transitions,
    summary,
    keyFacts,
    customerObjectives,
    financialConcerns,
    missingInformation,
    confidence,
    completionScore,
    crmRecordsCreated: false as const,
    workflowsExecuted: false as const,
    disclaimers: [...EAI_CONSULTATION_DISCLAIMERS],
  };

  return { ...draft, validation: validateEaiConsultationObject(draft) };
}
