/**
 * Conversation Planner (CO-AI-107).
 * Shapes the next conversational moves from gaps + questions.
 */

import type { EaiConversationMemory } from "@/types/enterprise-ai-context-intelligence";
import type {
  EaiPlannerMissingInfo,
  EaiPlannerQuestion,
} from "@/types/enterprise-ai-planner";
import { normaliseEaiConversationMemory } from "../context-intelligence/conversation-memory";

export function planEaiConversation(input: {
  utterance: string;
  missing: EaiPlannerMissingInfo[];
  selectedQuestions: EaiPlannerQuestion[];
  conversationMemory?: EaiConversationMemory;
  recommendationLines?: string[];
}): EaiConversationMemory {
  const prior = input.conversationMemory;
  const openQuestions = [
    ...input.selectedQuestions.map((q) => q.text),
    ...(prior?.openQuestions ?? []).filter(
      (q) => !input.selectedQuestions.some((s) => s.text.toLowerCase() === q.toLowerCase()),
    ),
  ].slice(0, 20);

  const stillMissing = input.missing.filter((m) => !m.alreadyKnown).map((m) => m.label);
  const summaryParts = [
    input.utterance.trim().slice(0, 160),
    stillMissing.length > 0 ? `Still needed: ${stillMissing.slice(0, 4).join(", ")}` : "Minimum information covered",
  ];

  return (
    normaliseEaiConversationMemory({
      intent: prior?.intent ?? input.utterance.slice(0, 240),
      knownFacts: prior?.knownFacts ?? [],
      openQuestions,
      previousRecommendations: [
        ...(input.recommendationLines ?? []),
        ...(prior?.previousRecommendations ?? []),
      ].slice(0, 20),
      outstandingActions: prior?.outstandingActions ?? [],
      summary: summaryParts.filter(Boolean).join(" · ").slice(0, 1200),
    }) ?? {
      knownFacts: [],
      openQuestions: [],
      previousRecommendations: [],
      outstandingActions: [],
    }
  );
}
