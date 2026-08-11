/**
 * Consultation Intelligence Engine (CO-AI-108 / Sprint AI-8).
 * Transforms conversations into structured financial consultations.
 * Never creates CRM records or executes workflows.
 */

import type { EaiConfidenceBand, EaiPersonaPackId, EaiSanitizedFact } from "./enterprise-ai-platform";
import type { EaiConversationMemory, EaiContextPackage } from "./enterprise-ai-context-intelligence";
import type { EaiDomainBoundaryDecision } from "./enterprise-ai-domain-governance";
import type { EaiPlannerMissingInfo, EaiPlannerPlan } from "./enterprise-ai-planner";
import type { EaiFdiDecisionPackage } from "./enterprise-ai-financial-decision";
import type { EaiAdvisoryReasoningResult } from "./enterprise-ai-advisory-reasoning";

/** Consultation lifecycle stages (state machine nodes). */
export type EaiConsultationLifecycleState =
  | "initiated"
  | "gathering"
  | "clarifying"
  | "advising"
  | "summarizing"
  | "completed"
  | "paused"
  | "outside_refused";

export type EaiConsultationLifecycleEvent =
  | "start"
  | "fact_captured"
  | "gap_detected"
  | "clarify"
  | "advise"
  | "summarize"
  | "complete"
  | "pause"
  | "refuse_outside"
  | "resume";

export interface EaiConsultationObjective {
  objectiveId: string;
  text: string;
  /** Derived from utterance / memory — never invented eligibility outcomes */
  source: "utterance" | "memory" | "context";
  priority: number;
}

export interface EaiConsultationConcern {
  concernId: string;
  text: string;
  category: "affordability" | "rate" | "documents" | "timeline" | "eligibility" | "other";
  source: "utterance" | "memory" | "context";
}

export interface EaiConsultationKeyFact {
  factId: string;
  key: string;
  value: string;
  provenance: EaiSanitizedFact["provenance"];
  slotHint?: string;
}

export interface EaiConsultationConfidence {
  band: EaiConfidenceBand;
  /** 0–100 evidence completeness — not FOIR/eligibility math */
  scoreHint: number;
  reasons: string[];
  evidenceFactCount: number;
  missingSlotCount: number;
}

export interface EaiConsultationCompletionScore {
  /** 0–100 structured completeness of the consultation object */
  score: number;
  band: "low" | "moderate" | "high" | "complete";
  checklist: Array<{ item: string; met: boolean; weight: number }>;
}

export interface EaiConsultationSummary {
  summaryId: string;
  /** Short facing lines — Micro Communication shaped */
  lines: string[];
  facingText: string;
  consultantNotes: string[];
}

export interface EaiConsultationTransition {
  from: EaiConsultationLifecycleState;
  event: EaiConsultationLifecycleEvent;
  to: EaiConsultationLifecycleState;
  at: string;
  reason: string;
}

export interface EaiConsultationRequest {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  utterance: string;
  /** Optional prior consultation state for state-machine continuity */
  priorState?: EaiConsultationLifecycleState;
  conversationMemory?: EaiConversationMemory;
  contextPackage?: EaiContextPackage;
  plannerPlan?: EaiPlannerPlan;
  fdiPackage?: EaiFdiDecisionPackage;
  advisoryResult?: EaiAdvisoryReasoningResult;
  entityRefs?: import("./enterprise-ai-read-connectors").EaiEntityRefs;
}

/**
 * Structured Consultation Object — sole output of this engine.
 * Not a CRM record. Not a workflow execution.
 */
export interface EaiConsultationObject {
  consultationId: string;
  version: string;
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  utterance: string;
  builtAt: string;
  blocked: boolean;
  refusalText?: string;
  domainBoundary?: EaiDomainBoundaryDecision;
  lifecycleState: EaiConsultationLifecycleState;
  transitions: EaiConsultationTransition[];
  summary: EaiConsultationSummary;
  keyFacts: EaiConsultationKeyFact[];
  customerObjectives: EaiConsultationObjective[];
  financialConcerns: EaiConsultationConcern[];
  missingInformation: EaiPlannerMissingInfo[];
  confidence: EaiConsultationConfidence;
  completionScore: EaiConsultationCompletionScore;
  contextPackageId?: string;
  plannerPlanId?: string;
  fdiPackageId?: string;
  advisoryResultId?: string;
  /** Explicit: no CRM / workflow side effects produced */
  crmRecordsCreated: false;
  workflowsExecuted: false;
  disclaimers: string[];
  validation: EaiConsultationValidationResult;
}

export interface EaiConsultationValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface EaiConsultationValidationResult {
  valid: boolean;
  issues: EaiConsultationValidationIssue[];
}

export interface EaiConsultationReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
