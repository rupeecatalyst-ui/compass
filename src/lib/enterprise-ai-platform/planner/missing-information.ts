/**
 * Missing Information Detection (CO-AI-107).
 * Detects gaps — never invents answers.
 */

import { EAI_PLANNER_INFO_SLOTS } from "@/constants/enterprise-ai-platform/planner";
import type { EaiConversationMemory, EaiContextPackage } from "@/types/enterprise-ai-context-intelligence";
import type { EaiPlannerMissingInfo } from "@/types/enterprise-ai-planner";

function knownBlob(input: {
  utterance: string;
  conversationMemory?: EaiConversationMemory;
  contextPackage?: EaiContextPackage;
}): string {
  const parts: string[] = [input.utterance];
  const mem = input.conversationMemory;
  if (mem) {
    if (mem.intent) parts.push(mem.intent);
    if (mem.summary) parts.push(mem.summary);
    for (const f of mem.knownFacts) {
      parts.push(`${f.key} ${f.value}`);
    }
  }
  if (input.contextPackage) {
    for (const section of input.contextPackage.sections ?? []) {
      if (!section.included) continue;
      for (const f of section.facts) {
        parts.push(`${f.key} ${f.value}`);
      }
      if (section.summary) parts.push(section.summary);
    }
  }
  return parts.join("\n");
}

export function detectEaiMissingInformation(input: {
  utterance: string;
  conversationMemory?: EaiConversationMemory;
  contextPackage?: EaiContextPackage;
}): EaiPlannerMissingInfo[] {
  const blob = knownBlob(input);
  const results: EaiPlannerMissingInfo[] = [];

  for (const slot of EAI_PLANNER_INFO_SLOTS) {
    const relevant = slot.relevancePatterns.some((p) => p.test(input.utterance) || p.test(blob));
    if (!relevant) continue;

    const alreadyKnown = slot.knownPatterns.some((p) => p.test(blob));
    results.push({
      slotId: slot.slotId,
      label: slot.label,
      reason: alreadyKnown
        ? "Already present in conversation memory or context"
        : "Required for a useful next step and not yet known",
      priority: slot.priority,
      alreadyKnown,
    });
  }

  return results.sort((a, b) => a.priority - b.priority);
}
