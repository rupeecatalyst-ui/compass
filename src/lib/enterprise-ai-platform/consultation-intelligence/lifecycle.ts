/**
 * Consultation Lifecycle helpers (CO-AI-108).
 */

import type { EaiConsultationLifecycleState } from "@/types/enterprise-ai-consultation";

export const EAI_CONSULTATION_LIFECYCLE_ORDER: readonly EaiConsultationLifecycleState[] = [
  "initiated",
  "gathering",
  "clarifying",
  "advising",
  "summarizing",
  "completed",
] as const;

export function isEaiConsultationTerminalState(state: EaiConsultationLifecycleState): boolean {
  return state === "completed" || state === "outside_refused";
}

export function describeEaiConsultationLifecycle(state: EaiConsultationLifecycleState): string {
  switch (state) {
    case "initiated":
      return "Consultation initiated";
    case "gathering":
      return "Gathering customer facts";
    case "clarifying":
      return "Clarifying missing information";
    case "advising":
      return "Advisory framing in progress";
    case "summarizing":
      return "Summarizing consultation";
    case "completed":
      return "Consultation structured and complete";
    case "paused":
      return "Consultation paused";
    case "outside_refused":
      return "Outside approved financial domain";
    default:
      return "Unknown consultation state";
  }
}
