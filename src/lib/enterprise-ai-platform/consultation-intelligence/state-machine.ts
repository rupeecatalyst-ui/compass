/**
 * Consultation State Machine (CO-AI-108).
 * Deterministic lifecycle transitions — no CRM side effects.
 */

import { EAI_CONSULTATION_TRANSITIONS } from "@/constants/enterprise-ai-platform/consultation-intelligence";
import type {
  EaiConsultationLifecycleEvent,
  EaiConsultationLifecycleState,
  EaiConsultationTransition,
} from "@/types/enterprise-ai-consultation";

export function canEaiConsultationTransition(
  from: EaiConsultationLifecycleState,
  event: EaiConsultationLifecycleEvent,
): EaiConsultationLifecycleState | undefined {
  const exact = EAI_CONSULTATION_TRANSITIONS.find((t) => t.from === from && t.event === event);
  if (exact) return exact.to;
  const wildcard = EAI_CONSULTATION_TRANSITIONS.find((t) => t.from === "*" && t.event === event);
  return wildcard?.to;
}

export function applyEaiConsultationTransition(input: {
  from: EaiConsultationLifecycleState;
  event: EaiConsultationLifecycleEvent;
  reason: string;
}): { state: EaiConsultationLifecycleState; transition?: EaiConsultationTransition; ok: boolean } {
  const to = canEaiConsultationTransition(input.from, input.event);
  if (!to) {
    return { state: input.from, ok: false };
  }
  return {
    state: to,
    ok: true,
    transition: {
      from: input.from,
      event: input.event,
      to,
      at: new Date().toISOString(),
      reason: input.reason,
    },
  };
}

/**
 * Derive the next lifecycle event from consultation signals.
 */
export function deriveEaiConsultationLifecycleEvent(input: {
  blocked: boolean;
  priorState?: EaiConsultationLifecycleState;
  missingUnknownCount: number;
  keyFactCount: number;
  objectiveCount: number;
  completionScore: number;
}): { event: EaiConsultationLifecycleEvent; reason: string } {
  if (input.blocked) {
    return { event: "refuse_outside", reason: "Domain Boundary blocked consultation" };
  }

  const prior = input.priorState ?? "initiated";

  if (prior === "initiated") {
    return { event: "start", reason: "Consultation started" };
  }

  if (input.completionScore >= 85 && input.missingUnknownCount === 0) {
    return { event: "complete", reason: "Consultation completeness threshold met" };
  }

  if (input.completionScore >= 70 && input.keyFactCount >= 2) {
    return { event: "summarize", reason: "Enough structure to summarize" };
  }

  if (input.missingUnknownCount > 0 && input.keyFactCount > 0) {
    return { event: "gap_detected", reason: "Missing information still required" };
  }

  if (input.objectiveCount > 0 && input.missingUnknownCount === 0 && input.keyFactCount >= 2) {
    return { event: "advise", reason: "Objectives and facts sufficient for advisory framing" };
  }

  if (input.keyFactCount > 0) {
    return { event: "fact_captured", reason: "Key facts captured from conversation" };
  }

  if (input.missingUnknownCount > 0) {
    return { event: "gap_detected", reason: "Gaps detected at start of gathering" };
  }

  return { event: "fact_captured", reason: "Continue gathering" };
}
