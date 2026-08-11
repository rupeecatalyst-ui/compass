/**
 * Key Facts Extraction (CO-AI-108).
 * Extracts structured facts from utterance + memory + context — never invents eligibility.
 */

import type { EaiConversationMemory, EaiContextPackage } from "@/types/enterprise-ai-context-intelligence";
import type { EaiConsultationKeyFact } from "@/types/enterprise-ai-consultation";

function newId(): string {
  return `eai_cf_${crypto.randomUUID().slice(0, 8)}`;
}

const EXTRACTORS: Array<{
  slotHint: string;
  key: string;
  pattern: RegExp;
  valueFrom?: (m: RegExpMatchArray) => string;
}> = [
  {
    slotHint: "product_interest",
    key: "product_interest",
    pattern: /\b(home\s*loan|balance\s*transfer|LAP|business\s*loan|personal\s*loan|working\s*capital)\b/i,
  },
  {
    slotHint: "required_amount",
    key: "required_amount",
    pattern: /\b(\d+(?:\.\d+)?\s*(?:lakh|lac|crore)|₹\s*[\d,]+|Rs\.?\s*[\d,]+)\b/i,
  },
  {
    slotHint: "employment_or_income",
    key: "employment_type",
    pattern: /\b(salaried|self[\s-]?employed)\b/i,
  },
  {
    slotHint: "existing_emi",
    key: "existing_emi",
    pattern: /\b(?:current\s*)?EMI\s*(?:is|=|:)?\s*([\d,]+)/i,
    valueFrom: (m) => m[1] ?? m[0]!,
  },
  {
    slotHint: "outstanding_loan",
    key: "outstanding_loan",
    pattern: /\boutstanding\b[^.!?]{0,40}?([\d,]+(?:\s*(?:lakh|lac|crore))?)/i,
    valueFrom: (m) => m[1] ?? m[0]!,
  },
  {
    slotHint: "city_or_location",
    key: "city",
    pattern: /\b(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
  },
];

export function extractEaiConsultationKeyFacts(input: {
  utterance: string;
  conversationMemory?: EaiConversationMemory;
  contextPackage?: EaiContextPackage;
}): EaiConsultationKeyFact[] {
  const facts: EaiConsultationKeyFact[] = [];
  const seen = new Set<string>();

  const push = (fact: EaiConsultationKeyFact) => {
    const k = `${fact.key}:${fact.value.toLowerCase()}`;
    if (seen.has(k)) return;
    seen.add(k);
    facts.push(fact);
  };

  for (const ex of EXTRACTORS) {
    const m = input.utterance.match(ex.pattern);
    if (m) {
      push({
        factId: newId(),
        key: ex.key,
        value: (ex.valueFrom ? ex.valueFrom(m) : m[1] ?? m[0]!).trim(),
        provenance: "user_stated",
        slotHint: ex.slotHint,
      });
    }
  }

  for (const f of input.conversationMemory?.knownFacts ?? []) {
    push({
      factId: newId(),
      key: f.key,
      value: f.value,
      provenance: f.provenance,
      slotHint: f.key,
    });
  }

  for (const section of input.contextPackage?.sections ?? []) {
    if (!section.included) continue;
    for (const f of section.facts.slice(0, 8)) {
      push({
        factId: newId(),
        key: f.key,
        value: f.value,
        provenance: f.provenance,
      });
    }
  }

  return facts.slice(0, 24);
}
