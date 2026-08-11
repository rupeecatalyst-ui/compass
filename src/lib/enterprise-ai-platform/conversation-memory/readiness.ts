/**
 * Conversation Memory Engine readiness (CO-AI-115).
 */

import { EAI_CONVERSATION_MEMORY_ENGINE_VERSION } from "@/constants/enterprise-ai-platform/conversation-memory";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "@/constants/enterprise-ai-platform/domain-governance";
import type { EaiConversationMemoryEngineReadinessResult } from "@/types/enterprise-ai-conversation-memory";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { runEaiSarathiConversationTurn } from "../conversation-experience/turn-orchestrator";
import { resolveEaiEnterpriseConversationMemory } from "./create";
import { expireEaiEnterpriseConversationMemory } from "./expiry";
import { resetEaiConversationMemoryStore } from "./store";
import { validateEaiEnterpriseConversationMemory } from "./validation";
import { getEaiEnterpriseConversationMemory } from "./store";

export async function runEaiConversationMemoryEngineReadiness(): Promise<EaiConversationMemoryEngineReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();
  resetEaiConversationMemoryStore();

  // Outside domain — memory may exist but must not invent business answers
  const outside = await runEaiSarathiConversationTurn({
    utterance: "Tell me a joke about politics",
    personaPackId: "sarathi_customer",
    languagePreference: "en",
  });
  if (!outside.blocked || outside.facingText !== EAI_OUTSIDE_DOMAIN_REFUSAL) {
    errors.push("Outside domain must remain fixed refusal (memory must not override)");
  }

  // In-domain turn builds long-term memory
  const first = await runEaiSarathiConversationTurn({
    utterance: "I want a Balance Transfer to reduce my EMI",
    personaPackId: "sarathi_customer",
    languagePreference: "en",
    emitActionProposals: true,
  });
  if (first.blocked) errors.push("BT turn must not block");
  if (!first.continuity.enterpriseMemoryId) {
    errors.push("Continuity must carry enterpriseMemoryId");
  }
  if (!first.memory?.memoryId) {
    errors.push("Turn result must include enterprise memory summary");
  }

  const mem1 = first.continuity.enterpriseMemoryId
    ? getEaiEnterpriseConversationMemory(first.continuity.enterpriseMemoryId)
    : undefined;
  if (!mem1) {
    errors.push("Memory store must retain turn memory");
  } else {
    if (mem1.learningMode !== "controlled_explicit") {
      errors.push("Learning mode must be controlled_explicit");
    }
    if (mem1.knownFacts.length === 0 && mem1.consultationHistory.length === 0) {
      errors.push("Memory must capture consultation history or known facts");
    }
    if (!mem1.auditTrail.some((a) => a.action === "refresh_from_turn")) {
      errors.push("Audit trail must record controlled refresh_from_turn");
    }
    if (mem1.auditTrail.some((a) => a.automaticOnlineLearning !== false)) {
      errors.push("Automatic online learning must never be claimed in audit");
    }
    if (mem1.auditTrail.some((a) => a.enterpriseRulesUnchanged !== true)) {
      errors.push("Audit must affirm enterprise rules unchanged");
    }

    const validation = validateEaiEnterpriseConversationMemory(mem1);
    if (!validation.valid) {
      errors.push(
        `Fresh memory must validate: ${validation.issues.map((i) => i.message).join("; ")}`,
      );
    }
  }

  // Continuity — second turn reuses memory
  const second = await runEaiSarathiConversationTurn({
    utterance: "I am salaried and need 25 lakh",
    continuity: first.continuity,
    emitActionProposals: true,
  });
  if (second.continuity.enterpriseMemoryId !== first.continuity.enterpriseMemoryId) {
    errors.push("Long-term memory id must persist across turns");
  }
  const mem2 = second.continuity.enterpriseMemoryId
    ? getEaiEnterpriseConversationMemory(second.continuity.enterpriseMemoryId)
    : undefined;
  if (mem2 && mem2.knownFacts.length < (mem1?.knownFacts.length ?? 0)) {
    warnings.push("Fact count did not grow on follow-up (may still be OK)");
  }
  if (mem2 && mem2.outstandingQuestions.length === 0 && second.suggestedQuestions.length > 0) {
    warnings.push("Suggested questions were not mirrored into outstanding questions");
  }
  if (mem2) {
    const hasProposalMemory =
      mem2.previousActionProposals.length > 0 || second.actionProposals.length === 0;
    if (!hasProposalMemory && second.actionProposals.length > 0) {
      errors.push("Draft action proposals must be recorded in memory");
    }
    for (const p of mem2.previousActionProposals) {
      if (!p.executionForbidden) {
        errors.push("Memory proposals must remain execution-forbidden");
      }
    }
    if (mem2.confidence.band !== "low" && mem2.confidence.band !== "medium" && mem2.confidence.band !== "high") {
      errors.push("Memory confidence band required");
    }
  }

  // Expiry path
  if (mem2) {
    const expired = expireEaiEnterpriseConversationMemory({
      ...mem2,
      outstandingQuestions: mem2.outstandingQuestions.map((q) => ({
        ...q,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      })),
    });
    if (
      expired.outstandingQuestions.some((q) => q.status === "open") &&
      expired.outstandingQuestions.every((q) => q.expiresAt && Date.parse(q.expiresAt) < Date.now())
    ) {
      errors.push("Expiry must mark past-due open questions as expired");
    }
  }

  // Resolve creates when missing
  const created = resolveEaiEnterpriseConversationMemory({
    continuityKey: "sarathi_readiness_orphan",
    conversationId: "conv_orphan",
    personaPackId: "sarathi_customer",
  });
  if (!created.memoryId) errors.push("resolve must create memory when missing");

  // Forbidden: automatic online learning / rule mutation — structural guarantee
  if (EAI_CONVERSATION_MEMORY_ENGINE_VERSION.includes("online")) {
    errors.push("Engine version must not imply online learning");
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    details: {
      conversationMemoryEngineVersion: EAI_CONVERSATION_MEMORY_ENGINE_VERSION,
      memoryId: first.continuity.enterpriseMemoryId,
      factCount: mem2?.knownFacts.length ?? 0,
      consultationCount: mem2?.consultationHistory.length ?? 0,
      preferenceCount: mem2?.customerPreferences.length ?? 0,
      recommendationCount: mem2?.previousRecommendations.length ?? 0,
      proposalCount: mem2?.previousActionProposals.length ?? 0,
      confidence: mem2?.confidence,
      auditActions: mem2?.auditTrail.map((a) => a.action).slice(-8),
      outsideBlocked: outside.blocked,
    },
  };
}
