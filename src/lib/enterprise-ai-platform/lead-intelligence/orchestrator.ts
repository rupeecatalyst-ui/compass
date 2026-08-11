/**
 * Lead Intelligence & Action Proposal Orchestrator (CO-AI-109).
 * Converts consultations into recommendations + draft Action Proposals only.
 */

import {
  EAI_LEAD_INTELLIGENCE_DISCLAIMERS,
  EAI_LEAD_INTELLIGENCE_VERSION,
} from "@/constants/enterprise-ai-platform/lead-intelligence";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type {
  EaiLeadIntelligenceRequest,
  EaiLeadIntelligenceResult,
} from "@/types/enterprise-ai-lead-intelligence";
import { ensureEaiBehaviourPackScaffolds } from "../behaviour-packs";
import { runEaiConsultationIntelligence } from "../consultation-intelligence/orchestrator";
import { evaluateEaiDomainBoundary } from "../domain-governance/domain-boundary";
import { assessEaiLeadIntelligenceConfidence } from "./confidence";
import { assessEaiCustomerReadiness } from "./customer-readiness";
import { assessEaiDocumentReadiness } from "./document-readiness";
import { assessEaiLeadReadiness } from "./lead-readiness";
import { deriveEaiLeadIntelligenceNba } from "./next-best-action";
import { assessEaiOpportunityReadiness } from "./opportunity-readiness";
import { recommendEaiPartner } from "./partner-recommendation";
import { scoreEaiLeadIntelligencePriority } from "./priority-scoring";
import { emitEaiLeadIntelligenceProposals } from "./proposal-emitter";
import { attachEaiProposalIds, rankEaiActionProposals } from "./proposal-ranking";
import { validateEaiLeadIntelligenceResult } from "./validation";

function newId(): string {
  return `eai_li_${crypto.randomUUID()}`;
}

function emptyReadiness(
  dimension: "lead" | "opportunity" | "document" | "customer",
): EaiLeadIntelligenceResult["leadReadiness"] {
  return {
    dimension,
    score: 0,
    band: "not_ready",
    reasons: ["Outside domain"],
    blockers: ["Domain boundary blocked"],
    recommendedNextStep: "No recommendation outside approved domain",
  };
}

/**
 * Run Lead Intelligence — recommendations and optional draft proposals only.
 */
export async function runEaiLeadIntelligence(
  request: EaiLeadIntelligenceRequest,
): Promise<EaiLeadIntelligenceResult> {
  ensureEaiBehaviourPackScaffolds();

  const utterance =
    (request.utterance ?? request.consultation?.utterance ?? "").trim() ||
    "Lead intelligence review";

  const domainBoundary = evaluateEaiDomainBoundary({
    utterance,
    personaPackId: request.personaPackId,
  });

  if (domainBoundary.blocksLlm || domainBoundary.policyDeny) {
    const draft = {
      resultId: newId(),
      version: EAI_LEAD_INTELLIGENCE_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      builtAt: new Date().toISOString(),
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      domainBoundary,
      leadReadiness: emptyReadiness("lead"),
      opportunityReadiness: emptyReadiness("opportunity"),
      documentReadiness: emptyReadiness("document"),
      customerReadiness: emptyReadiness("customer"),
      nextBestActions: deriveEaiLeadIntelligenceNba({
        blocked: true,
        lead: emptyReadiness("lead"),
        opportunity: emptyReadiness("opportunity"),
        document: emptyReadiness("document"),
        customer: emptyReadiness("customer"),
        priorityScore: 0,
      }),
      rankedProposals: [],
      priorityScore: 0,
      confidence: assessEaiLeadIntelligenceConfidence({
        lead: emptyReadiness("lead"),
        opportunity: emptyReadiness("opportunity"),
        priorityScore: 0,
        blocked: true,
      }),
      actionProposalIds: [],
      leadsCreated: false as const,
      opportunitiesCreated: false as const,
      crmModified: false as const,
      workflowsTriggered: false as const,
      disclaimers: [...EAI_LEAD_INTELLIGENCE_DISCLAIMERS],
    };
    return { ...draft, validation: validateEaiLeadIntelligenceResult(draft) };
  }

  const consultation =
    request.consultation ??
    (await runEaiConsultationIntelligence({
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      utterance,
      conversationMemory: request.conversationMemory,
      contextPackage: request.contextPackage,
    }));

  if (consultation.blocked) {
    const draft = {
      resultId: newId(),
      version: EAI_LEAD_INTELLIGENCE_VERSION,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      personaPackId: request.personaPackId,
      builtAt: new Date().toISOString(),
      blocked: true,
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      domainBoundary: consultation.domainBoundary ?? domainBoundary,
      consultationId: consultation.consultationId,
      leadReadiness: emptyReadiness("lead"),
      opportunityReadiness: emptyReadiness("opportunity"),
      documentReadiness: emptyReadiness("document"),
      customerReadiness: emptyReadiness("customer"),
      nextBestActions: deriveEaiLeadIntelligenceNba({
        blocked: true,
        lead: emptyReadiness("lead"),
        opportunity: emptyReadiness("opportunity"),
        document: emptyReadiness("document"),
        customer: emptyReadiness("customer"),
        priorityScore: 0,
      }),
      rankedProposals: [],
      priorityScore: 0,
      confidence: assessEaiLeadIntelligenceConfidence({
        consultation,
        lead: emptyReadiness("lead"),
        opportunity: emptyReadiness("opportunity"),
        priorityScore: 0,
        blocked: true,
      }),
      actionProposalIds: [],
      leadsCreated: false as const,
      opportunitiesCreated: false as const,
      crmModified: false as const,
      workflowsTriggered: false as const,
      disclaimers: [...EAI_LEAD_INTELLIGENCE_DISCLAIMERS],
    };
    return { ...draft, validation: validateEaiLeadIntelligenceResult(draft) };
  }

  const leadReadiness = assessEaiLeadReadiness(consultation);
  const opportunityReadiness = assessEaiOpportunityReadiness(consultation);
  const documentReadiness = assessEaiDocumentReadiness(consultation);
  const customerReadiness = assessEaiCustomerReadiness(consultation);
  const partnerRecommendation = recommendEaiPartner(consultation);
  const priorityScore = scoreEaiLeadIntelligencePriority({
    lead: leadReadiness,
    opportunity: opportunityReadiness,
    document: documentReadiness,
    customer: customerReadiness,
  });
  const confidence = assessEaiLeadIntelligenceConfidence({
    consultation,
    lead: leadReadiness,
    opportunity: opportunityReadiness,
    priorityScore,
  });

  const nextBestActions = deriveEaiLeadIntelligenceNba({
    lead: leadReadiness,
    opportunity: opportunityReadiness,
    document: documentReadiness,
    customer: customerReadiness,
    partner: partnerRecommendation,
    priorityScore,
  });

  let rankedProposals = rankEaiActionProposals(nextBestActions);
  const actionProposalIds = emitEaiLeadIntelligenceProposals({
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    ranked: rankedProposals,
    emit: request.emitActionProposals === true,
    consultationId: consultation.consultationId,
  });
  rankedProposals = attachEaiProposalIds(rankedProposals, actionProposalIds);

  const draft = {
    resultId: newId(),
    version: EAI_LEAD_INTELLIGENCE_VERSION,
    sessionId: request.sessionId,
    conversationId: request.conversationId,
    personaPackId: request.personaPackId,
    builtAt: new Date().toISOString(),
    blocked: false,
    domainBoundary,
    consultationId: consultation.consultationId,
    leadReadiness,
    opportunityReadiness,
    documentReadiness,
    customerReadiness,
    partnerRecommendation,
    nextBestActions,
    rankedProposals,
    priorityScore,
    confidence,
    actionProposalIds,
    leadsCreated: false as const,
    opportunitiesCreated: false as const,
    crmModified: false as const,
    workflowsTriggered: false as const,
    disclaimers: [...EAI_LEAD_INTELLIGENCE_DISCLAIMERS],
  };

  return { ...draft, validation: validateEaiLeadIntelligenceResult(draft) };
}
