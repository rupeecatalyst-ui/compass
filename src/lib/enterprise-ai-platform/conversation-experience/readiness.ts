/**
 * Conversation Experience readiness (CO-AI-111).
 */

import { EAI_CONVERSATION_EXPERIENCE_VERSION } from "@/constants/enterprise-ai-platform/conversation-experience";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type { EaiConversationExperienceReadinessResult } from "@/types/enterprise-ai-conversation-experience";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { updateEaiActionProposalStatus } from "../action-proposals";
import { listEaiTurns } from "../session-orchestrator";
import { runEaiSarathiConversationTurn } from "./turn-orchestrator";
import { resolveEaiSarathiSuggestedQuestions } from "./suggested-questions";

export async function runEaiConversationExperienceReadiness(): Promise<EaiConversationExperienceReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();

  const starters = resolveEaiSarathiSuggestedQuestions({});
  // CO-SARATHI-VISION-001 WAVE-1: questionnaire chips retired — empty is correct
  if (starters.length > 0) {
    warnings.push("Suggested question chips should remain retired (WAVE-1)");
  }
  const outside = await runEaiSarathiConversationTurn({
    utterance: "Tell me a joke about politics",
    emitActionProposals: true,
  });
  if (!outside.blocked || outside.facingText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Outside domain must return fixed refusal via conversation turn");
  }
  if (outside.actionProposals.length > 0) {
    errors.push("Outside domain must not surface action proposals");
  }

  const first = await runEaiSarathiConversationTurn({
    utterance: "I want a Balance Transfer to reduce my EMI",
    emitActionProposals: true,
  });
  if (first.blocked) errors.push("BT conversation must not be blocked");
  if (!first.assistantMessage.text.trim()) errors.push("Assistant must reply with facing text");
  if (first.continuity.messages.length < 2) errors.push("History must retain user + assistant");
  if (!first.continuity.sessionId || !first.continuity.conversationId) {
    errors.push("Session continuity ids required");
  }

  const turns = listEaiTurns(first.continuity.sessionId!);
  if (turns.length < 2) errors.push("Platform turns must be recorded");

  // Session continuity — second turn on same continuity
  const second = await runEaiSarathiConversationTurn({
    utterance: "I am salaried and need 25 lakh",
    continuity: first.continuity,
    emitActionProposals: true,
  });
  if (second.continuity.conversationId !== first.continuity.conversationId) {
    errors.push("Conversation id must continue across turns");
  }
  if (second.continuity.messages.length < 4) {
    errors.push("History must accumulate across turns");
  }
  if (second.suggestedQuestions.length === 0) {
    // CO-SARATHI-UX-001: customer path embeds Planner question in facing text — chips optional
  }

  // Proposal cards are drafts only — execution blocked
  if (second.actionProposals.length > 0) {
    const p = second.actionProposals[0]!;
    if (p.status !== "draft" && p.status !== "pending_review") {
      errors.push("Conversation proposals must be draft or pending_review");
    }
    const blocked = updateEaiActionProposalStatus(p.proposalId, "executed_reserved");
    if (blocked?.status === "executed_reserved") {
      errors.push("Must never execute proposals from conversation experience");
    }
  } else {
    warnings.push("No action proposals on rich BT path — cards may be empty");
  }

  // Facing text should stay relatively short (micro communication)
  if (second.facingText.split(/\n\s*\n/).filter(Boolean).length > 2) {
    errors.push("Facing text must follow micro communication (no long paragraphs)");
  }

  const blockedBoiler =
    /let's support your business growth|i can explain lending concepts/i.test(
      `${first.facingText} ${second.facingText}`,
    );
  if (blockedBoiler) {
    errors.push("Facing text must not repeat Tone Library slogans");
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      conversationExperienceVersion: EAI_CONVERSATION_EXPERIENCE_VERSION,
      outsideBlocked: outside.blocked,
      firstFacingPreview: first.facingText.slice(0, 120),
      historyLength: second.continuity.messages.length,
      suggestedCount: second.suggestedQuestions.length,
      proposalCount: second.actionProposals.length,
      proposalStatuses: second.actionProposals.map((p) => p.status),
      sessionContinued: second.continuity.sessionId === first.continuity.sessionId,
      consultationConfidence: second.consultationSnapshot?.consultationConfidence,
      readyForSummary: second.consultationSnapshot?.readyForSummary,
    },
  };
}
