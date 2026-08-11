/**
 * Consultation Intelligence constants (CO-AI-108 / Sprint AI-8).
 */

import type {
  EaiConsultationLifecycleEvent,
  EaiConsultationLifecycleState,
} from "@/types/enterprise-ai-consultation";

export const EAI_CONSULTATION_VERSION = "1.0.0-ai8";

export const EAI_CONSULTATION_DISCLAIMERS = [
  "Consultation Objects structure the conversation — they are not CRM records.",
  "The Consultation Intelligence Engine never executes workflows or creates leads/opportunities.",
  "Eligibility, FOIR, DBR, pricing, and approvals remain enterprise engines.",
  "Side effects, if ever required later, must use Action Proposals (SB-06).",
] as const;

/** Allowed state-machine edges. */
export const EAI_CONSULTATION_TRANSITIONS: readonly {
  from: EaiConsultationLifecycleState | "*";
  event: EaiConsultationLifecycleEvent;
  to: EaiConsultationLifecycleState;
}[] = [
  { from: "*", event: "refuse_outside", to: "outside_refused" },
  { from: "initiated", event: "start", to: "gathering" },
  { from: "initiated", event: "fact_captured", to: "gathering" },
  { from: "gathering", event: "fact_captured", to: "gathering" },
  { from: "gathering", event: "gap_detected", to: "clarifying" },
  { from: "gathering", event: "advise", to: "advising" },
  { from: "clarifying", event: "fact_captured", to: "gathering" },
  { from: "clarifying", event: "gap_detected", to: "clarifying" },
  { from: "clarifying", event: "advise", to: "advising" },
  { from: "advising", event: "summarize", to: "summarizing" },
  { from: "advising", event: "gap_detected", to: "clarifying" },
  { from: "summarizing", event: "complete", to: "completed" },
  { from: "gathering", event: "summarize", to: "summarizing" },
  { from: "clarifying", event: "summarize", to: "summarizing" },
  { from: "*", event: "pause", to: "paused" },
  { from: "paused", event: "resume", to: "gathering" },
  { from: "paused", event: "complete", to: "completed" },
] as const;

/** Completion checklist weights (sum = 100). */
export const EAI_CONSULTATION_COMPLETION_WEIGHTS = {
  hasObjective: 20,
  hasKeyFacts: 25,
  concernsCapturedOrNoneNeeded: 15,
  missingInfoAssessed: 15,
  summaryPresent: 15,
  lifecycleAdvanced: 10,
} as const;

export const EAI_CONSULTATION_FORBIDDEN_CLAIMS = [
  "lead created",
  "opportunity created",
  "crm updated",
  "workflow executed",
  "email sent",
  "record created",
] as const;
