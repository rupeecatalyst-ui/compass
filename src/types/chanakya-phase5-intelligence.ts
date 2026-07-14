/**
 * CF-CHANAKYA-015 — Phase 5 Foundation
 * Enterprise Intelligence & Overnight Reflection Engine contracts.
 *
 * Catalyst One = Enterprise Brain
 * CHANAKYA = Enterprise Chief of Staff
 * ChatGPT = Enterprise Reasoning Partner (never business truth)
 */

import type { EtePredefinedDescription } from "@/types/enterprise-task-engine";

// ---------------------------------------------------------------------------
// Architecture principle roles
// ---------------------------------------------------------------------------

export type ChanakyaPhase5Role = "enterprise_brain" | "chief_of_staff" | "reasoning_partner";

export type ChanakyaMemoryEventKind =
  | "customer_dialogue"
  | "banker_dialogue"
  | "loan_stage_movement"
  | "opportunity_update"
  | "task"
  | "document"
  | "internal_note"
  | "user_activity"
  | "workflow_decision"
  | "appreciation"
  | "pending_action";

export interface ChanakyaMemoryEvent {
  id: string;
  kind: ChanakyaMemoryEventKind;
  businessDay: string; // YYYY-MM-DD (local enterprise day)
  occurredAt: string;
  actorId: string;
  summary: string;
  /** Structured business context — never raw DB rows. */
  context: Record<string, string | number | boolean | null | undefined>;
  customerName?: string;
  product?: string;
  lender?: string;
  stage?: string;
  loanFileId?: string;
  opportunityId?: string;
  taskId?: string;
}

export interface ChanakyaDayMemory {
  businessDay: string;
  events: ChanakyaMemoryEvent[];
  eventCount: number;
}

// ---------------------------------------------------------------------------
// Nightly reflection package
// ---------------------------------------------------------------------------

export interface ChanakyaDailyReflectionPackage {
  packageId: string;
  businessDay: string;
  preparedAt: string;
  scheduledForLocalTime: string; // e.g. "21:00"
  enterpriseSummary: string;
  userSummary: string;
  transactionSummaries: string[];
  customerConversations: string[];
  bankerConversations: string[];
  taskStatus: {
    completed: number;
    pending: number;
    overdue: number;
    highlights: string[];
  };
  filesAtRisk: Array<{
    customerName: string;
    product: string;
    lender?: string;
    stage: string;
    whyAtRisk: string;
    loanFileId?: string;
    href: string;
  }>;
  appreciations: string[];
  pendingActions: string[];
  /** Feedback loop inputs for tomorrow. */
  feedbackSignals: {
    completedTaskIds: string[];
    pendingTaskIds: string[];
    overdueTaskIds: string[];
  };
}

// ---------------------------------------------------------------------------
// ChatGPT contract (frozen)
// ---------------------------------------------------------------------------

export type ChatGptForbiddenOperation =
  | "calculate_foir"
  | "calculate_dbr"
  | "calculate_commissions"
  | "calculate_profitability"
  | "determine_eligibility"
  | "modify_workflow"
  | "modify_stages"
  | "update_enterprise_data"
  | "send_email";

export type ChatGptAllowedOperation =
  | "reasoning"
  | "storytelling"
  | "coaching"
  | "prioritisation"
  | "executive_briefing"
  | "proposal_drafting"
  | "business_communication";

export interface ChanakyaChatGptContract {
  role: "reasoning_partner";
  isSourceOfBusinessTruth: false;
  forbiddenOperations: readonly ChatGptForbiddenOperation[];
  allowedOperations: readonly ChatGptAllowedOperation[];
  note: string;
}

// ---------------------------------------------------------------------------
// Morning briefing
// ---------------------------------------------------------------------------

export interface ChanakyaMorningBriefingItem {
  id: string;
  customerName: string;
  product: string;
  lender: string;
  currentStage: string;
  whyAttentionRequired: string;
  suggestedNextAction: string;
  navigationLabel: string;
  href: string;
  loanFileId?: string;
  opportunityId?: string;
  priority: 1 | 2 | 3;
}

export interface ChanakyaMorningBriefing {
  briefingId: string;
  businessDay: string;
  presentedAt: string;
  salutation: string;
  items: ChanakyaMorningBriefingItem[];
  narrative?: ChanakyaEnterpriseNarrative;
}

// ---------------------------------------------------------------------------
// Narrative
// ---------------------------------------------------------------------------

export interface ChanakyaEnterpriseNarrative {
  narrativeId: string;
  businessDay: string;
  whatHappened: string;
  whyItMatters: string;
  currentSituation: string;
  nextRecommendation: string;
  factBased: true;
}

// ---------------------------------------------------------------------------
// Action intelligence
// ---------------------------------------------------------------------------

export interface ChanakyaActionRecommendation {
  id: string;
  actionText: string;
  predefinedDescription: EtePredefinedDescription;
  priority: "high" | "medium" | "low";
  dueOn: string;
  customerName?: string;
  loanFileId?: string;
  opportunityRef?: string;
  currentStage?: string;
  assigneeRef: string;
  createdBy: string;
}

export interface ChanakyaActionTaskResult {
  taskId: string;
  created: boolean;
  message: string;
  recommendationId: string;
}

// ---------------------------------------------------------------------------
// Enterprise learning (foundation)
// ---------------------------------------------------------------------------

export interface ChanakyaLearningSignal {
  id: string;
  category:
    | "preferred_lender"
    | "communication_style"
    | "successful_follow_up"
    | "productivity_pattern"
    | "coaching_opportunity";
  observation: string;
  explainability: string;
  sampleSize: number;
  readyForInference: boolean;
  learningThresholdFiles: number;
}

export interface ChanakyaLearningFoundation {
  processedFileThresholdMin: number;
  processedFileThresholdIdeal: number;
  signals: ChanakyaLearningSignal[];
  status: "foundation_only" | "collecting" | "explainable_inference";
}

// ---------------------------------------------------------------------------
// Proposal intelligence
// ---------------------------------------------------------------------------

export type ChanakyaStatedInformationDomain =
  | "stated_financial_information"
  | "stated_business_information"
  | "stated_property_information"
  | "stated_income_information";

/** Forbidden terminology — never use in Phase 5 proposal readiness. */
export type ChanakyaForbiddenInformationLabel =
  | "verified_information"
  | "user_provided_information"
  | "declared_information";

export interface ChanakyaProposalProductRule {
  productId: string;
  productName: string;
  enabled: boolean;
  minimumLoanAmount: number;
}

export interface ChanakyaProposalConfig {
  buttonLabel: "MAKE PROPOSAL";
  /** Never use SEND PROPOSAL as the button. */
  forbiddenButtonLabels: readonly ["SEND PROPOSAL"];
  products: ChanakyaProposalProductRule[];
  readinessThresholdPct: number;
}

export interface ChanakyaProposalReadinessField {
  key: string;
  domain: ChanakyaStatedInformationDomain;
  label: string;
  whyRequired: string;
  statedValue?: string | number | null;
  complete: boolean;
}

export interface ChanakyaProposalReadinessReview {
  loanFileId?: string;
  productName: string;
  loanAmount: number;
  fields: ChanakyaProposalReadinessField[];
  completenessPct: number;
  ready: boolean;
  conversationalPrompt: string;
}

export type ChanakyaProposalArtifactKind =
  | "executive_summary"
  | "credit_proposal"
  | "business_narrative"
  | "lender_ready_proposal";

export interface ChanakyaProposalDraft {
  draftId: string;
  productName: string;
  loanAmount: number;
  artifacts: Partial<Record<ChanakyaProposalArtifactKind, string>>;
  status: "draft" | "preview" | "approved" | "sent";
  /** Outbound email is always owned by Catalyst One — never ChatGPT. */
  emailOutboundOwner: "catalyst_one";
}

export interface ChanakyaPhase5RegistrySnapshot {
  frameworkVersion: string;
  certificationFinding: string;
  frozenAt: string;
  enterprisePrinciple: string;
  architectureRoles: Array<{ role: ChanakyaPhase5Role; owner: string; responsibility: string }>;
  chatgptContract: ChanakyaChatGptContract;
  nightlyReflectionDefaultLocalTime: string;
  proposalConfig: ChanakyaProposalConfig;
  learningFoundation: ChanakyaLearningFoundation;
  capabilities: string[];
  nonNegotiables: string[];
}
