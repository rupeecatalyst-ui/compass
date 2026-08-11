/**
 * Follow-up Planning (CO-AI-107).
 * Plans future clarifying moves — never schedules CRM execution.
 */

import type {
  EaiPlannerFollowUp,
  EaiPlannerMissingInfo,
  EaiPlannerQuestion,
} from "@/types/enterprise-ai-planner";

function newId(): string {
  return `eai_fu_${crypto.randomUUID().slice(0, 8)}`;
}

export function planEaiFollowUps(input: {
  missing: EaiPlannerMissingInfo[];
  selectedQuestions: EaiPlannerQuestion[];
  utterance: string;
}): EaiPlannerFollowUp[] {
  const followUps: EaiPlannerFollowUp[] = [];

  const deferredGaps = input.missing.filter(
    (m) => !m.alreadyKnown && !input.selectedQuestions.some((q) => q.slotId === m.slotId),
  );

  for (const gap of deferredGaps.slice(0, 3)) {
    followUps.push({
      followUpId: newId(),
      trigger: `After ${input.selectedQuestions[0]?.slotId ?? "current"} answer`,
      suggestedQuestion:
        gap.slotId === "required_amount"
          ? "What amount are you looking for?"
          : gap.slotId === "employment_or_income"
            ? "Are you salaried or self-employed?"
            : `Share ${gap.label.toLowerCase()} when ready.`,
      suggestedActionKind: "ask_question",
      deferUntilHint: "Next conversational turn",
    });
  }

  if (/\bcallback|follow[\s-]?up\b/i.test(input.utterance)) {
    followUps.push({
      followUpId: newId(),
      trigger: "After human approves callback proposal",
      suggestedActionKind: "propose_callback",
      deferUntilHint: "Pending Action Proposal approval — Planner will not call",
    });
  }

  if (/\bdocument|kyc\b/i.test(input.utterance)) {
    followUps.push({
      followUpId: newId(),
      trigger: "After documents uploaded",
      suggestedActionKind: "continue_advisory",
      deferUntilHint: "Document registry status via Read Connectors",
    });
  }

  return followUps.slice(0, 5);
}
