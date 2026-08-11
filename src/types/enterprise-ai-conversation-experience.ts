/**
 * SARATHI Conversation Experience (CO-AI-111 / Sprint AI-11).
 * Text-only customer-facing conversation — operates via Enterprise AI Platform only.
 * No Voice. No CRM execution. No workflow execution.
 */

import type { EaiLanguageCode } from "./enterprise-ai-multilingual";
import type {
  EaiActionProposal,
  EaiChannel,
  EaiConfidenceBand,
  EaiPersonaPackId,
} from "./enterprise-ai-platform";

export type EaiConversationMessageRole = "user" | "assistant" | "system";

export interface EaiConversationMessage {
  messageId: string;
  role: EaiConversationMessageRole;
  text: string;
  createdAt: string;
  confidence?: EaiConfidenceBand;
  /** Linked draft proposal ids for this assistant turn */
  actionProposalIds?: string[];
  /** Adaptive clarifying questions suggested after this turn */
  suggestedQuestions?: string[];
}

export interface EaiConversationContinuityState {
  continuityKey: string;
  conversationId: string;
  sessionId?: string;
  personaPackId: EaiPersonaPackId;
  messages: EaiConversationMessage[];
  updatedAt: string;
  /** AI-14: preferred conversation language (en | hi | mr) */
  preferredLanguage?: EaiLanguageCode;
  /** AI-15: long-term enterprise conversation memory id */
  enterpriseMemoryId?: string;
  /** CO-SARATHI-REASONING-001 — consultation facts remembered across turns */
  consultationMemory?: SarathiConsultationMemory;
}

/** Experience-layer consultation memory (REASONING-001) */
export interface SarathiConsultationMemory {
  loanType?: string;
  purpose?: string;
  fundingAmount?: string;
  employment?: string;
  businessType?: string;
  propertyType?: string;
  location?: string;
  income?: string;
  existingLoan?: string;
  existingLender?: string;
  existingEmi?: string;
  documents?: string;
  customerGoals: string[];
  product:
    | "home_loan"
    | "balance_transfer"
    | "lap"
    | "business_loan"
    | "working_capital"
    | "personal_loan"
    | "general";
  lastAssistantQuestion?: string;
  lastCustomerUtterance?: string;
  askedKeys: string[];
  knownKeys: string[];
  turnCount: number;
}

export interface EaiConversationTurnRequest {
  utterance: string;
  continuity?: EaiConversationContinuityState;
  personaPackId?: EaiPersonaPackId;
  emitActionProposals?: boolean;
  /** AI-13: voice interface uses channel "voice"; intelligence path unchanged */
  channel?: EaiChannel;
  /** AI-14: explicit language preference (overrides detection when set) */
  languagePreference?: EaiLanguageCode;
}

export interface EaiConversationTurnResult {
  continuity: EaiConversationContinuityState;
  userMessage: EaiConversationMessage;
  assistantMessage: EaiConversationMessage;
  /** Draft / pending_review proposals only — never executed */
  actionProposals: EaiActionProposal[];
  suggestedQuestions: string[];
  blocked: boolean;
  refusalText?: string;
  trustPackageId?: string;
  leadIntelligenceResultId?: string;
  consultationId?: string;
  facingText: string;
  /** Consultation facts + UX confidence (CO-SARATHI-UX-001) */
  consultationSnapshot?: {
    keyFacts: Array<{ key: string; value: string }>;
    confidenceScoreHint: number;
    objectives: string[];
    consultationConfidence?: number;
    confidenceMilestones?: string[];
    readyForSummary?: boolean;
    openMissingSlotIds?: string[];
    plannerNextQuestion?: string | null;
    reasoningObjective?: string;
    reasoningNotes?: string[];
  };
  /** AI-14 */
  language?: EaiLanguageCode;
  /** AI-15: enterprise memory snapshot (controlled learning) */
  memory?: {
    memoryId: string;
    confidenceBand: string;
    confidenceScoreHint: number;
    knownFactCount: number;
    outstandingQuestionCount: number;
    consultationHistoryCount: number;
    previousRecommendationCount: number;
    previousActionProposalCount: number;
  };
}


export interface EaiConversationExperienceReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
