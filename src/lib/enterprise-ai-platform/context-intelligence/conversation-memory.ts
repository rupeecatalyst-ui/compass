/**
 * Conversation memory — structured summaries, never full chat history (CO-AI-103).
 */

import type { EaiConversationMemory } from "@/types/enterprise-ai-context-intelligence";
import { sanitiseEaiFact } from "./sanitisation";

export function normaliseEaiConversationMemory(
  memory?: EaiConversationMemory,
): EaiConversationMemory | undefined {
  if (!memory) return undefined;
  const knownFacts = (memory.knownFacts ?? [])
    .map((f) => sanitiseEaiFact(f))
    .filter((f): f is NonNullable<typeof f> => !!f)
    .slice(0, 40);

  return {
    intent: memory.intent ? String(memory.intent).slice(0, 240) : undefined,
    knownFacts,
    openQuestions: (memory.openQuestions ?? []).map((q) => String(q).slice(0, 240)).slice(0, 20),
    previousRecommendations: (memory.previousRecommendations ?? [])
      .map((r) => String(r).slice(0, 240))
      .slice(0, 20),
    outstandingActions: (memory.outstandingActions ?? [])
      .map((a) => String(a).slice(0, 240))
      .slice(0, 20),
    summary: memory.summary ? String(memory.summary).slice(0, 1200) : undefined,
  };
}

export function conversationMemoryToFacts(
  memory: EaiConversationMemory,
): { key: string; value: string; provenance: "system" }[] {
  const facts: { key: string; value: string; provenance: "system" }[] = [];
  if (memory.intent) {
    facts.push({ key: "conversation.intent", value: memory.intent, provenance: "system" });
  }
  if (memory.summary) {
    facts.push({ key: "conversation.summary", value: memory.summary, provenance: "system" });
  }
  memory.openQuestions.forEach((q, i) => {
    facts.push({ key: `conversation.open_question.${i + 1}`, value: q, provenance: "system" });
  });
  memory.previousRecommendations.forEach((r, i) => {
    facts.push({
      key: `conversation.previous_recommendation.${i + 1}`,
      value: r,
      provenance: "system",
    });
  });
  memory.outstandingActions.forEach((a, i) => {
    facts.push({
      key: `conversation.outstanding_action.${i + 1}`,
      value: a,
      provenance: "system",
    });
  });
  for (const f of memory.knownFacts) {
    facts.push({ key: `conversation.fact.${f.key}`, value: f.value, provenance: "system" });
  }
  return facts;
}
