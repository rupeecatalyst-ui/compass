/**
 * Financial Concerns extraction (CO-AI-108).
 */

import type { EaiConversationMemory } from "@/types/enterprise-ai-context-intelligence";
import type { EaiConsultationConcern } from "@/types/enterprise-ai-consultation";

function newId(): string {
  return `eai_con_${crypto.randomUUID().slice(0, 8)}`;
}

export function extractEaiFinancialConcerns(input: {
  utterance: string;
  conversationMemory?: EaiConversationMemory;
}): EaiConsultationConcern[] {
  const concerns: EaiConsultationConcern[] = [];
  const q = input.utterance.toLowerCase();

  const push = (
    text: string,
    category: EaiConsultationConcern["category"],
    source: EaiConsultationConcern["source"],
  ) => {
    if (concerns.some((c) => c.text.toLowerCase() === text.toLowerCase())) return;
    concerns.push({ concernId: newId(), text, category, source });
  };

  if (/\bafford|high emi|emi.*(high|heavy)|burden\b/.test(q)) {
    push("Concerned about EMI affordability", "affordability", "utterance");
  }
  if (/\brate|interest|pricing\b/.test(q)) {
    push("Concerned about interest rate / pricing", "rate", "utterance");
  }
  if (/\bdocument|kyc|paper|missing doc\b/.test(q)) {
    push("Concerned about documentation readiness", "documents", "utterance");
  }
  if (/\bhow long|timeline|delay|urgent|asap\b/.test(q)) {
    push("Concerned about processing timeline", "timeline", "utterance");
  }
  if (/\beligib|qualify|reject|declin\b/.test(q)) {
    push("Concerned about eligibility outcome", "eligibility", "utterance");
  }
  if (/\bworr|risk|unsure|confus\b/.test(q)) {
    push("General financial uncertainty expressed", "other", "utterance");
  }

  for (const line of input.conversationMemory?.openQuestions ?? []) {
    if (/emi|amount|income|document/i.test(line)) {
      push(`Open question: ${line.slice(0, 120)}`, "other", "memory");
    }
  }

  return concerns.slice(0, 8);
}
