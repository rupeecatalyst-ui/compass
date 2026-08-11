/**
 * Question Selection (CO-AI-107).
 * Ask only the minimum required; skip known; avoid duplicates.
 */

import {
  EAI_PLANNER_INFO_SLOTS,
  EAI_PLANNER_MAX_QUESTIONS,
} from "@/constants/enterprise-ai-platform/planner";
import type { EaiConversationMemory } from "@/types/enterprise-ai-context-intelligence";
import type {
  EaiPlannerMissingInfo,
  EaiPlannerQuestion,
} from "@/types/enterprise-ai-planner";

function newId(): string {
  return `eai_pq_${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeQuestion(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function selectEaiPlannerQuestions(input: {
  missing: EaiPlannerMissingInfo[];
  conversationMemory?: EaiConversationMemory;
  maxQuestions?: number;
}): { selected: EaiPlannerQuestion[]; skipped: EaiPlannerQuestion[] } {
  const max = input.maxQuestions ?? EAI_PLANNER_MAX_QUESTIONS;
  const openExisting = new Set(
    (input.conversationMemory?.openQuestions ?? []).map(normalizeQuestion),
  );
  const selected: EaiPlannerQuestion[] = [];
  const skipped: EaiPlannerQuestion[] = [];
  const seenSlots = new Set<string>();
  const seenTexts = new Set<string>();

  const ordered = [...input.missing].sort((a, b) => a.priority - b.priority);

  for (const gap of ordered) {
    const slot = EAI_PLANNER_INFO_SLOTS.find((s) => s.slotId === gap.slotId);
    if (!slot) continue;

    const text = slot.question;
    const norm = normalizeQuestion(text);
    const base: EaiPlannerQuestion = {
      questionId: newId(),
      slotId: gap.slotId,
      text,
      order: gap.priority,
    };

    if (gap.alreadyKnown) {
      skipped.push({ ...base, skipReason: "Already known — do not re-ask" });
      continue;
    }
    if (seenSlots.has(gap.slotId) || seenTexts.has(norm) || openExisting.has(norm)) {
      skipped.push({ ...base, skipReason: "Duplicate question suppressed" });
      continue;
    }

    if (selected.length >= max) {
      skipped.push({ ...base, skipReason: "Beyond minimum question budget" });
      continue;
    }

    seenSlots.add(gap.slotId);
    seenTexts.add(norm);
    selected.push(base);
  }

  // Stable order by priority
  selected.sort((a, b) => a.order - b.order);
  selected.forEach((q, i) => {
    q.order = i + 1;
  });

  return { selected, skipped };
}
