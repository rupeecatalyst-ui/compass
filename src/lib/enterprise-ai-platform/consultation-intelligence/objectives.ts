/**
 * Customer Objectives extraction (CO-AI-108).
 */

import type { EaiConversationMemory } from "@/types/enterprise-ai-context-intelligence";
import type { EaiConsultationObjective } from "@/types/enterprise-ai-consultation";

function newId(): string {
  return `eai_obj_${crypto.randomUUID().slice(0, 8)}`;
}

export function extractEaiCustomerObjectives(input: {
  utterance: string;
  conversationMemory?: EaiConversationMemory;
}): EaiConsultationObjective[] {
  const objectives: EaiConsultationObjective[] = [];
  const q = input.utterance.toLowerCase();

  const push = (text: string, source: EaiConsultationObjective["source"], priority: number) => {
    if (objectives.some((o) => o.text.toLowerCase() === text.toLowerCase())) return;
    objectives.push({ objectiveId: newId(), text, source, priority });
  };

  if (/\bbalance\s*transfer\b|\breduce\s+(my\s+)?emi\b|\bbt\b/.test(q)) {
    push("Reduce borrowing cost via Balance Transfer", "utterance", 10);
  }
  if (/\bhome\s*loan\b|\bbuy(?:ing)?\s+(a\s+)?(?:home|house|property)\b/.test(q)) {
    push("Obtain a home loan for property purchase", "utterance", 10);
  }
  if (/\btop[\s-]?up\b/.test(q)) {
    push("Explore top-up funds on existing loan", "utterance", 20);
  }
  if (/\beligib|\bqualify\b/.test(q)) {
    push("Understand loan eligibility", "utterance", 15);
  }
  if (/\bdocument|kyc\b/.test(q)) {
    push("Complete documentation readiness", "utterance", 30);
  }
  if (/\bEMI\b|\bafford\b/.test(input.utterance) && !/\breduce\s+(my\s+)?emi\b/.test(q)) {
    push("Assess EMI affordability with engines", "utterance", 20);
  }
  if (/\bcallback|call me|speak to\b/.test(q)) {
    push("Arrange a callback discussion", "utterance", 40);
  }

  if (input.conversationMemory?.intent) {
    push(input.conversationMemory.intent.slice(0, 160), "memory", 50);
  }

  if (objectives.length === 0 && input.utterance.trim()) {
    push("Explore suitable lending options", "utterance", 90);
  }

  return objectives.sort((a, b) => a.priority - b.priority).slice(0, 6);
}
