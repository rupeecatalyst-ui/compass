/**
 * SARATHI Conversation Turn Orchestrator (CO-AI-111).
 * Every turn runs through the Enterprise AI Platform — no CRM/workflow execution.
 */

import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import { EAI_TONE_LIBRARY } from "@/constants/enterprise-ai-platform/tone-library";
import type {
  EaiConversationContinuityState,
  EaiConversationMessage,
  EaiConversationTurnRequest,
  EaiConversationTurnResult,
} from "@/types/enterprise-ai-conversation-experience";
import { ensureEaiBehaviourPackScaffolds } from "../behaviour-packs";
import { activateEaiWealthPartnerBehaviourPack } from "../wealth-partner-behaviour/activate";
import { runEaiAdvisoryReasoning } from "../advisory-reasoning/orchestrator";
import { listEaiActionProposalsBySession } from "../action-proposals";
import { runEaiConsultationIntelligence } from "../consultation-intelligence/orchestrator";
import { runEaiExplainabilityTrust } from "../explainability-trust/orchestrator";
import { runEaiLeadIntelligence } from "../lead-intelligence/orchestrator";
import { evaluateEaiPolicy } from "../policy-gate";
import { runEaiPlanner } from "../planner/orchestrator";
import { composeEaiResponse } from "../response-composer";
import {
  appendEaiTurn,
  createEaiSession,
  getEaiSession,
} from "../session-orchestrator";
import { createEaiConversationContinuityKey } from "./continuity";
import {
  enrichUtteranceForDomainGate,
  reasonSarathiConsultationResponse,
} from "./consultation-reasoning";
import {
  detectSarathiProductContext,
  deriveSarathiConsultationConfidence,
  extractUxFactsFromUtterance,
} from "./ux-flow";
import { resolveEaiToneAudience } from "../domain-governance/tone-library";
import { buildEaiMultilingualTurnContext } from "../multilingual/compose-turn";
import { getEaiOutsideDomainRefusalLocalised } from "../multilingual/localisation";
import {
  resolveEaiEnterpriseConversationMemory,
  updateEaiEnterpriseMemoryFromTurn,
} from "../conversation-memory";
import { scheduleEaoShadowAfterLiveTurn } from "@/lib/enterprise-ai-orchestrator/shadow";

function newMessageId(): string {
  return `eai_msg_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function ensureSession(
  continuity?: EaiConversationContinuityState,
  requestedPersonaPackId?: EaiConversationContinuityState["personaPackId"],
  channel: import("@/types/enterprise-ai-platform").EaiChannel = "text",
) {
  const personaPackId =
    requestedPersonaPackId ?? continuity?.personaPackId ?? "sarathi_customer";
  if (continuity?.sessionId) {
    const existing = getEaiSession(continuity.sessionId);
    if (existing && existing.status === "active") {
      return existing;
    }
  }
  return createEaiSession({
    personaPackId,
    channel,
    conversationId: continuity?.conversationId,
    continuityKey: continuity?.continuityKey ?? createEaiConversationContinuityKey(personaPackId),
    deviceHint: {
      deviceId:
        personaPackId === "sarathi_wealth_partner"
          ? "sarathi-wp-web"
          : channel === "voice"
            ? "sarathi-voice"
            : "sarathi-web",
      clientLabel:
        personaPackId === "sarathi_wealth_partner"
          ? "sarathi-wealth-partner"
          : channel === "voice"
            ? "sarathi-voice"
            : "sarathi-conversation",
    },
    metadata: {
      experience:
        personaPackId === "sarathi_wealth_partner"
          ? "sarathi_wealth_partner_ai12"
          : channel === "voice"
            ? "sarathi_voice_ai13"
            : "sarathi_conversation_ai11",
    },
  });
}

/**
 * Adaptive follow-ups and natural lending language stay in-domain.
 * Domain Gate still decides; conversation experience only enriches context text.
 */
function utteranceForDomainGate(
  utterance: string,
  continuity?: EaiConversationContinuityState,
): string {
  const priorUser = (continuity?.messages ?? [])
    .filter((m) => m.role === "user")
    .map((m) => m.text);
  return enrichUtteranceForDomainGate(
    utterance,
    priorUser,
    continuity?.consultationMemory,
  );
}

function facingSeedFromPlatform(input: {
  advisoryFragments: { lines: string[] }[];
  trustFacingLines: string[];
  consultationFacing?: string;
  personaPackId: EaiConversationContinuityState["personaPackId"];
}): string {
  const audience = resolveEaiToneAudience(input.personaPackId);
  const customerLines = new Set(
    EAI_TONE_LIBRARY.flatMap((e) => e.lines.map((l) => l.trim().toLowerCase())),
  );

  let advisoryBody = input.advisoryFragments
    .flatMap((f) => f.lines)
    .map((l) => l.trim())
    .filter(Boolean);

  // CO-SARATHI-UX-001: never seed chat with Tone Library slogans (repetition source)
  advisoryBody = advisoryBody.filter((l) => !customerLines.has(l.toLowerCase()));

  const trustBody = input.trustFacingLines
    .map((l) => l.trim())
    .filter((l) => l && !customerLines.has(l.toLowerCase()));

  if (advisoryBody.length > 0) return advisoryBody.join(" ");
  if (trustBody.length > 0) return trustBody.join(" ");
  if (input.consultationFacing?.trim()) return input.consultationFacing.trim();
  return audience === "partner"
    ? "Confirm case parameters next."
    : "Thank you. Could you share a little more detail?";
}

/**
 * Process one SARATHI conversation turn end-to-end via Enterprise AI Platform.
 */
export async function runEaiSarathiConversationTurn(
  request: EaiConversationTurnRequest,
): Promise<EaiConversationTurnResult> {
  ensureEaiBehaviourPackScaffolds();

  const requestedPersona =
    request.personaPackId ?? request.continuity?.personaPackId ?? "sarathi_customer";
  if (requestedPersona === "sarathi_wealth_partner") {
    activateEaiWealthPartnerBehaviourPack();
  }

  const utterance = (request.utterance ?? "").trim();
  const multilingual = buildEaiMultilingualTurnContext({
    utterance,
    explicitPreference: request.languagePreference,
    continuityPreference: request.continuity?.preferredLanguage,
  });
  const language = multilingual.facingLanguage;

  const session = ensureSession(
    request.continuity,
    requestedPersona,
    request.channel ?? "text",
  );
  const personaPackId = requestedPersona;
  const domainUtterance = utteranceForDomainGate(
    multilingual.canonicalUtterance,
    request.continuity,
  );

  const priorMessages = request.continuity?.messages ?? [];
  const continuityKey =
    request.continuity?.continuityKey ??
    session.continuityKey ??
    createEaiConversationContinuityKey(personaPackId);

  const enterpriseMemory = resolveEaiEnterpriseConversationMemory({
    memoryId: request.continuity?.enterpriseMemoryId,
    continuityKey,
    conversationId: session.conversationId,
    sessionId: session.sessionId,
    personaPackId,
    preferredLanguage: language,
  });
  const conversationMemory = enterpriseMemory.compactProjection;

  const userMessage: EaiConversationMessage = {
    messageId: newMessageId(),
    role: "user",
    text: utterance,
    createdAt: nowIso(),
  };
  appendEaiTurn({ sessionId: session.sessionId, role: "user", text: utterance });

  const policy = evaluateEaiPolicy({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    personaPackId,
    utterance: domainUtterance,
    intentHint: domainUtterance,
    requestedCapabilityIds: ["ask_questions", "generate_consultation", "generate_action_proposals"],
    requestedToolIds: [],
    requestedDataScopes: ["identity.public", "opportunity.summary"],
  });

  if (policy.domainBoundary?.blocksLlm || policy.domainBoundary?.policyDeny) {
    const composed = composeEaiResponse({
      sessionId: session.sessionId,
      conversationId: session.conversationId,
      personaPackId,
      llmOutput: "",
      enterpriseResults: [],
      policyDecision: policy,
      actionProposals: [],
      confidence: "low",
      language,
    });
    const facing =
      composed.text || getEaiOutsideDomainRefusalLocalised(language);
    appendEaiTurn({
      sessionId: session.sessionId,
      role: "assistant",
      text: facing,
    });
    const assistantMessage: EaiConversationMessage = {
      messageId: newMessageId(),
      role: "assistant",
      text: facing,
      createdAt: nowIso(),
      confidence: "low",
      actionProposalIds: [],
      suggestedQuestions: [],
    };
    const continuity: EaiConversationContinuityState = {
      continuityKey,
      conversationId: session.conversationId,
      sessionId: session.sessionId,
      personaPackId,
      messages: [...priorMessages, userMessage, assistantMessage],
      updatedAt: nowIso(),
      preferredLanguage: language,
      enterpriseMemoryId: enterpriseMemory.memoryId,
    };
    return {
      continuity,
      userMessage,
      assistantMessage,
      actionProposals: [],
      suggestedQuestions: [],
      blocked: true,
      // Policy/audit SSOT remains English; facingText is localised.
      refusalText: EAI_OUTSIDE_DOMAIN_REFUSAL,
      facingText: facing,
      language,
      memory: {
        memoryId: enterpriseMemory.memoryId,
        confidenceBand: enterpriseMemory.confidence.band,
        confidenceScoreHint: enterpriseMemory.confidence.scoreHint,
        knownFactCount: enterpriseMemory.knownFacts.length,
        outstandingQuestionCount: enterpriseMemory.outstandingQuestions.filter(
          (q) => q.status === "open",
        ).length,
        consultationHistoryCount: enterpriseMemory.consultationHistory.length,
        previousRecommendationCount: enterpriseMemory.previousRecommendations.length,
        previousActionProposalCount: enterpriseMemory.previousActionProposals.length,
      },
    };
  }

  const advisory = await runEaiAdvisoryReasoning({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    personaPackId,
    question: domainUtterance,
  });

  const plannerPlan = await runEaiPlanner({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    personaPackId,
    utterance: domainUtterance,
    emitActionProposals: false,
    conversationMemory,
  });

  const consultation = await runEaiConsultationIntelligence({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    personaPackId,
    utterance: domainUtterance,
    priorState: "gathering",
    conversationMemory,
  });

  const leadIntelligence = await runEaiLeadIntelligence({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    personaPackId,
    utterance: domainUtterance,
    consultation,
    emitActionProposals: request.emitActionProposals === true,
    conversationMemory,
  });

  const trust = await runEaiExplainabilityTrust({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    personaPackId,
    utterance: domainUtterance,
    consultation,
    leadIntelligence,
    plannerPlan,
    advisoryResult: advisory,
  });

  // Prefer advisory body lines — composer applies Tone + Micro Communication once
  const facingSeed = facingSeedFromPlatform({
    advisoryFragments: advisory.fragments ?? [],
    trustFacingLines: trust.recommendationExplanation.facingLines,
    consultationFacing: consultation.summary.facingText,
    personaPackId,
  });

  const proposals =
    request.emitActionProposals === true
      ? listEaiActionProposalsBySession(session.sessionId).filter(
          (p) => p.status === "draft" || p.status === "pending_review",
        )
      : [];

  const composed = composeEaiResponse({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    personaPackId,
    llmOutput: facingSeed,
    enterpriseResults: [],
    policyDecision: policy,
    actionProposals: proposals,
    confidence: trust.recommendationExplanation.confidenceExplanation.band,
    language,
  });

  const advising = request.emitActionProposals === true;
  const plannerQuestion = advising
    ? null
    : (plannerPlan.selectedQuestions?.[0]?.text ?? null);

  const priorAssistantTexts = priorMessages
    .filter((m) => m.role === "assistant")
    .map((m) => m.text);

  const product = detectSarathiProductContext(
    [...priorMessages.filter((m) => m.role === "user").map((m) => m.text), utterance].join(
      " ",
    ),
  );

  const keyFacts = (consultation.keyFacts ?? []).map((f) => ({
    key: f.key,
    value: f.value,
  }));
  const openMissingSlotIds = (consultation.missingInformation ?? [])
    .filter((m) => !m.alreadyKnown)
    .map((m) => m.slotId);
  const userTurnCount =
    priorMessages.filter((m) => m.role === "user").length + 1;
  const consultationConfidence = deriveSarathiConsultationConfidence({
    product,
    facts: [
      ...keyFacts,
      ...extractUxFactsFromUtterance(utterance, product),
      ...priorMessages
        .filter((m) => m.role === "user")
        .flatMap((m) => extractUxFactsFromUtterance(m.text, product)),
    ],
    openMissingSlotIds,
    userTurnCount,
    confidenceScoreHint: consultation.confidence?.scoreHint ?? 0,
  });

  // WAVE-1 + REASONING-001: Intelligent consultation response (not interview templates)
  const reasoned = reasonSarathiConsultationResponse({
    utterance,
    priorMemory: request.continuity?.consultationMemory,
    priorAssistantTexts,
    keyFacts,
    plannerQuestion,
    seedText: composed.text,
    advising,
    language,
  });
  const facingText = reasoned.facingText;

  appendEaiTurn({
    sessionId: session.sessionId,
    role: "assistant",
    text: facingText,
  });

  // Questionnaire chips retired (WAVE-1)
  const suggestedQuestions: string[] = [];

  const { memory: refreshedMemory } = updateEaiEnterpriseMemoryFromTurn({
    memory: enterpriseMemory,
    consultation,
    actionProposals: proposals,
    suggestedQuestions: plannerQuestion ? [plannerQuestion] : suggestedQuestions,
    facingText,
    preferredLanguage: language,
    recommendationLines: trust.recommendationExplanation.facingLines.slice(0, 3),
  });

  const assistantMessage: EaiConversationMessage = {
    messageId: newMessageId(),
    role: "assistant",
    text: facingText,
    createdAt: nowIso(),
    confidence: composed.confidence,
    actionProposalIds: advising ? composed.actionProposalIds : [],
    suggestedQuestions,
  };

  const continuity: EaiConversationContinuityState = {
    continuityKey,
    conversationId: session.conversationId,
    sessionId: session.sessionId,
    personaPackId,
    messages: [...priorMessages, userMessage, assistantMessage],
    updatedAt: nowIso(),
    preferredLanguage: language,
    enterpriseMemoryId: refreshedMemory.memoryId,
    consultationMemory: reasoned.memory,
  };

  // CO-AI-G2-W1: Shadow Mode — fire-and-forget when flag ON; never alters facingText.
  // Default flag OFF ⇒ immediate no-op (no capture, no model call).
  // Customer continues to receive only the live facingText below.
  scheduleEaoShadowAfterLiveTurn({
    live: {
      facingText,
      objectiveHint: reasoned.objective,
      sessionId: session.sessionId,
      conversationId: session.conversationId,
      utterance,
      capturedAt: nowIso(),
    },
  });

  return {
    continuity,
    userMessage,
    assistantMessage,
    actionProposals: proposals,
    suggestedQuestions,
    blocked: false,
    trustPackageId: trust.packageId,
    leadIntelligenceResultId: leadIntelligence.resultId,
    consultationId: consultation.consultationId,
    facingText,
    consultationSnapshot: {
      keyFacts,
      confidenceScoreHint: consultation.confidence?.scoreHint ?? 0,
      objectives: (consultation.customerObjectives ?? []).map((o) => o.text),
      consultationConfidence: consultationConfidence.score,
      confidenceMilestones: consultationConfidence.milestones,
      readyForSummary: consultationConfidence.readyForSummary,
      openMissingSlotIds,
      plannerNextQuestion: plannerQuestion,
      reasoningObjective: reasoned.objective,
      reasoningNotes: reasoned.reasoningNotes,
    },
    language,
    memory: {
      memoryId: refreshedMemory.memoryId,
      confidenceBand: refreshedMemory.confidence.band,
      confidenceScoreHint: refreshedMemory.confidence.scoreHint,
      knownFactCount: refreshedMemory.knownFacts.length,
      outstandingQuestionCount: refreshedMemory.outstandingQuestions.filter(
        (q) => q.status === "open",
      ).length,
      consultationHistoryCount: refreshedMemory.consultationHistory.length,
      previousRecommendationCount: refreshedMemory.previousRecommendations.length,
      previousActionProposalCount: refreshedMemory.previousActionProposals.length,
    },
  };
}
