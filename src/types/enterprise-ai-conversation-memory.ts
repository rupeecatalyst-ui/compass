/**
 * Enterprise Conversation Memory & Learning types (CO-AI-115 / Sprint AI-15).
 * Long-term continuity projection — never automatic online learning;
 * never modifies enterprise rules.
 */

import type { EaiConversationMemory } from "./enterprise-ai-context-intelligence";
import type { EaiLanguageCode } from "./enterprise-ai-multilingual";
import type {
  EaiActionProposalKind,
  EaiActionProposalStatus,
  EaiConfidenceBand,
  EaiPersonaPackId,
  EaiSanitizedFact,
} from "./enterprise-ai-platform";

/** Controlled learning only — automatic online learning is forbidden. */
export type EaiMemoryLearningMode = "controlled_explicit" | "disabled";

export type EaiMemoryLearningAction =
  | "create_memory"
  | "refresh_from_turn"
  | "upsert_fact"
  | "set_preference"
  | "record_consultation"
  | "record_recommendation"
  | "record_action_proposal"
  | "record_outstanding_question"
  | "expire_entries"
  | "validate_memory"
  | "human_review_note";

export type EaiMemoryConfidenceBand = "low" | "medium" | "high";

export interface EaiMemoryLearningAuditEntry {
  entryId: string;
  at: string;
  /** Always controlled — never unsupervised online learning */
  actor: "system_controlled" | "human_review";
  action: EaiMemoryLearningAction;
  note: string;
  /** Explicit confirmation that enterprise rules were not modified */
  enterpriseRulesUnchanged: true;
  /** Explicit confirmation that automatic online learning did not run */
  automaticOnlineLearning: false;
}

export interface EaiMemoryKnownFactEntry {
  factId: string;
  key: string;
  value: string;
  provenance: EaiSanitizedFact["provenance"];
  confidence: EaiConfidenceBand;
  capturedAt: string;
  expiresAt?: string;
  sourceTurnId?: string;
}

export interface EaiMemoryCustomerPreferenceEntry {
  preferenceId: string;
  key: string;
  value: string;
  /** e.g. language, product_interest, contact_channel */
  category: "language" | "product" | "communication" | "other";
  capturedAt: string;
  expiresAt?: string;
  confidence: EaiConfidenceBand;
}

export interface EaiMemoryOutstandingQuestionEntry {
  questionId: string;
  text: string;
  status: "open" | "answered" | "expired";
  capturedAt: string;
  expiresAt?: string;
  source: "planner" | "consultation" | "suggested" | "user";
}

export interface EaiMemoryRecommendationEntry {
  recommendationId: string;
  text: string;
  capturedAt: string;
  expiresAt?: string;
  consultationId?: string;
  confidence: EaiConfidenceBand;
}

export interface EaiMemoryActionProposalEntry {
  proposalId: string;
  kind: EaiActionProposalKind;
  status: EaiActionProposalStatus;
  title: string;
  summary: string;
  capturedAt: string;
  expiresAt?: string;
  /** Draft / pending only — never executed by memory layer */
  executionForbidden: true;
}

export interface EaiMemoryConsultationHistoryEntry {
  consultationId: string;
  lifecycleState: string;
  summaryFacing?: string;
  keyFactCount: number;
  capturedAt: string;
  expiresAt?: string;
}

export interface EaiMemoryConfidence {
  band: EaiMemoryConfidenceBand;
  /** 0–100 evidence completeness — not FOIR / eligibility math */
  scoreHint: number;
  reasons: string[];
  factCount: number;
  openQuestionCount: number;
  expiredEntryCount: number;
}

export interface EaiEnterpriseConversationMemory {
  memoryId: string;
  continuityKey: string;
  conversationId: string;
  sessionId?: string;
  personaPackId: EaiPersonaPackId;
  preferredLanguage?: EaiLanguageCode;
  learningMode: EaiMemoryLearningMode;
  consultationHistory: EaiMemoryConsultationHistoryEntry[];
  customerPreferences: EaiMemoryCustomerPreferenceEntry[];
  knownFacts: EaiMemoryKnownFactEntry[];
  outstandingQuestions: EaiMemoryOutstandingQuestionEntry[];
  previousRecommendations: EaiMemoryRecommendationEntry[];
  previousActionProposals: EaiMemoryActionProposalEntry[];
  confidence: EaiMemoryConfidence;
  /** Wall-clock expiry for the memory envelope (optional) */
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  auditTrail: EaiMemoryLearningAuditEntry[];
  /** Compact projection consumed by Context / Planner / Consultation */
  compactProjection: EaiConversationMemory;
}

export interface EaiMemoryValidationIssue {
  code:
    | "expired"
    | "invalid_structure"
    | "forbidden_learning_mode"
    | "enterprise_rule_mutation_attempt"
    | "automatic_online_learning_attempt"
    | "proposal_execution_attempt"
    | "stale_confidence"
    | "duplicate_fact";
  message: string;
  severity: "error" | "warning";
  entryId?: string;
}

export interface EaiMemoryValidationResult {
  valid: boolean;
  issues: EaiMemoryValidationIssue[];
  memoryId: string;
}

export interface EaiConversationMemoryEngineReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
