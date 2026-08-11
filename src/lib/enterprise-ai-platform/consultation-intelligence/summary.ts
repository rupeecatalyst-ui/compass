/**
 * Consultation Summary — Micro Communication shaped (CO-AI-108).
 */

import type {
  EaiConsultationConcern,
  EaiConsultationKeyFact,
  EaiConsultationLifecycleState,
  EaiConsultationObjective,
  EaiConsultationSummary,
} from "@/types/enterprise-ai-consultation";
import type { EaiPlannerMissingInfo } from "@/types/enterprise-ai-planner";
import { applyEaiMicroCommunication } from "../domain-governance/micro-communication";
import { describeEaiConsultationLifecycle } from "./lifecycle";

function newId(): string {
  return `eai_sum_${crypto.randomUUID().slice(0, 8)}`;
}

export function buildEaiConsultationSummary(input: {
  lifecycleState: EaiConsultationLifecycleState;
  objectives: EaiConsultationObjective[];
  keyFacts: EaiConsultationKeyFact[];
  concerns: EaiConsultationConcern[];
  missing: EaiPlannerMissingInfo[];
  blocked?: boolean;
  refusalText?: string;
}): EaiConsultationSummary {
  if (input.blocked && input.refusalText) {
    return {
      summaryId: newId(),
      lines: [input.refusalText],
      facingText: input.refusalText,
      consultantNotes: ["Outside domain — no consultation structured"],
    };
  }

  const unknown = input.missing.filter((m) => !m.alreadyKnown);
  const rawLines: string[] = [];

  if (input.objectives[0]) {
    rawLines.push(`Goal: ${input.objectives[0].text}.`);
  } else {
    rawLines.push("Let's clarify your lending goal.");
  }

  if (input.keyFacts.length > 0) {
    const preview = input.keyFacts
      .slice(0, 2)
      .map((f) => f.value)
      .join(", ");
    rawLines.push(`Noted: ${preview}.`);
  }

  if (unknown.length > 0) {
    rawLines.push(`Still needed: ${unknown[0]!.label}.`);
  } else if (input.concerns[0]) {
    rawLines.push(`We'll address: ${input.concerns[0].text}.`);
  } else {
    rawLines.push("Engines will confirm the numbers.");
  }

  // Micro Communication keeps facing text short (max ~2 sentences)
  const combined = rawLines.slice(0, 2).join(" ");
  const micro = applyEaiMicroCommunication(combined);

  return {
    summaryId: newId(),
    lines: micro.text.split("\n").filter(Boolean),
    facingText: micro.text,
    consultantNotes: [
      describeEaiConsultationLifecycle(input.lifecycleState),
      `Facts: ${input.keyFacts.length}`,
      `Gaps: ${unknown.length}`,
      `Concerns: ${input.concerns.length}`,
      "No CRM records created",
    ],
  };
}
