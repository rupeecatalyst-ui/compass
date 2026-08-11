/**
 * Planner & Next Best Action Engine (CO-AI-107 / Sprint AI-7).
 * Answers: "What information is still required?" and "What should happen next?"
 * Never executes CRM / workflow / email side effects.
 */

import type { EaiConfidenceBand, EaiPersonaPackId, EaiActionProposalKind } from "./enterprise-ai-platform";
import type { EaiConversationMemory, EaiContextPackage } from "./enterprise-ai-context-intelligence";
import type { EaiDomainBoundaryDecision } from "./enterprise-ai-domain-governance";
import type { EaiFdiDecisionPackage } from "./enterprise-ai-financial-decision";
import type { EaiAdvisoryReasoningResult } from "./enterprise-ai-advisory-reasoning";

/** Information slots the Planner may request — curated lending minimums. */
export type EaiPlannerInfoSlotId =
  | "product_interest"
  | "required_amount"
  | "employment_or_income"
  | "city_or_location"
  | "existing_emi"
  | "outstanding_loan"
  | "document_readiness"
  | "callback_preference";

export type EaiPlannerNextActionKind =
  | "ask_question"
  | "propose_document_request"
  | "propose_callback"
  | "propose_task"
  | "propose_reminder"
  | "continue_advisory"
  | "defer_to_engine"
  | "outside_refused";

export interface EaiPlannerMissingInfo {
  slotId: EaiPlannerInfoSlotId;
  label: string;
  reason: string;
  priority: number;
  alreadyKnown: boolean;
}

export interface EaiPlannerQuestion {
  questionId: string;
  slotId: EaiPlannerInfoSlotId;
  text: string;
  /** Ordering — lower first */
  order: number;
  skipReason?: string;
}

export interface EaiPlannerNextBestAction {
  actionId: string;
  kind: EaiPlannerNextActionKind;
  title: string;
  summary: string;
  /** Opaque recommendation only — never an execution command */
  proposalKind?: EaiActionProposalKind;
  confidence: EaiConfidenceBand;
  sequence: number;
}

export interface EaiPlannerFollowUp {
  followUpId: string;
  trigger: string;
  suggestedQuestion?: string;
  suggestedActionKind?: EaiPlannerNextActionKind;
  deferUntilHint?: string;
}

export interface EaiPlannerRequest {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  /** Current customer utterance / goal */
  utterance: string;
  conversationMemory?: EaiConversationMemory;
  contextPackage?: EaiContextPackage;
  fdiPackage?: EaiFdiDecisionPackage;
  advisoryResult?: EaiAdvisoryReasoningResult;
  entityRefs?: import("./enterprise-ai-read-connectors").EaiEntityRefs;
  /** When true, emit Action Proposal drafts for NBA items that require them */
  emitActionProposals?: boolean;
}

export interface EaiPlannerPlan {
  planId: string;
  version: string;
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  utterance: string;
  builtAt: string;
  blocked: boolean;
  refusalText?: string;
  domainBoundary?: EaiDomainBoundaryDecision;
  contextPackageId?: string;
  fdiPackageId?: string;
  advisoryResultId?: string;
  missingInformation: EaiPlannerMissingInfo[];
  selectedQuestions: EaiPlannerQuestion[];
  skippedQuestions: EaiPlannerQuestion[];
  nextBestActions: EaiPlannerNextBestAction[];
  sequencedRecommendations: string[];
  followUps: EaiPlannerFollowUp[];
  /** Proposal ids created this run — draft only */
  actionProposalIds: string[];
  /** Updated memory projection for CIE (not persisted by Planner) */
  memoryProjection: EaiConversationMemory;
  confidence: EaiConfidenceBand;
  disclaimers: string[];
  validation: EaiPlannerValidationResult;
}

export interface EaiPlannerValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface EaiPlannerValidationResult {
  valid: boolean;
  issues: EaiPlannerValidationIssue[];
}

export interface EaiPlannerReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
