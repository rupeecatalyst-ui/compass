/**
 * CO-AI-G1-001 — Enterprise AI Orchestrator Contracts (Phase 1)
 *
 * Architecture-definition contract layer ONLY.
 * Not wired into live SARATHI turn path. No Hybrid Cutover. No UX.
 *
 * Governing ADR: ADR-022
 * Principle: Conversation → Reasoning Model · Authority → Orchestrator
 * Engines remain SSOT for calculations, eligibility, policies, workflow, CRM, audit, actions.
 */

import type { EaiVoiceLanguageCode } from "@/types/enterprise-ai-voice";
import type {
  EaiActionProposalKind,
  EaiActionProposalStatus,
  EaiConfidenceBand,
  EaiPersonaPackId,
} from "@/types/enterprise-ai-platform";

/** Frozen contract suite version for G1. */
export const EAI_ORCHESTRATOR_CONTRACTS_VERSION = "1.0.0-g1-001" as const;

export type EaoProvenanceKind =
  | "enterprise_registry"
  | "enterprise_engine"
  | "enterprise_memory"
  | "consultation_readiness"
  | "user_utterance"
  | "system_metadata"
  | "model_inference_untrusted";

/** Every fact offered to the model carries provenance (CAD-2026-001 aligned). */
export interface EaoProvenancedFact {
  key: string;
  value: string | number | boolean | null;
  provenance: EaoProvenanceKind;
  sourceId?: string;
  /** ISO timestamp when observed / computed */
  observedAt?: string;
  /** If true, model may narrate but must not treat as final business authority */
  advisoryOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Enterprise Context Contract
// ─────────────────────────────────────────────────────────────────────────────

export interface EaoEnterpriseContextContract {
  contractId: "eao.context.v1";
  packId: string;
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  assembledAt: string;
  /** Opaque hash of pack contents for audit correlation */
  contentHash: string;
  customerFacts: EaoProvenancedFact[];
  opportunityFacts: EaoProvenancedFact[];
  dealFacts: EaoProvenancedFact[];
  productFacts: EaoProvenancedFact[];
  policyHints: EaoProvenancedFact[];
  /** CRE outputs — readiness only, not dialogue scripts */
  readiness: EaoConsultationReadinessSnapshot | null;
  redactionNotes: string[];
  /** Explicit: engines/registries are SSOT; this pack is a read projection */
  authorityNote: "enterprise_engines_are_ssot";
}

/** Consultation Readiness Engine snapshot (repositioned planner). */
export interface EaoConsultationReadinessSnapshot {
  consultationConfidence: number;
  confidenceBand: EaiConfidenceBand;
  missingInformation: Array<{
    slotId: string;
    label: string;
    reason: string;
    priority: number;
  }>;
  proposalReadiness: "not_ready" | "soft_ready" | "ready";
  actionReadiness: "not_ready" | "soft_ready" | "ready";
  creVersion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Conversation Request Contract
// ─────────────────────────────────────────────────────────────────────────────

export type EaoChannel = "text" | "voice_stt" | "system";

export interface EaoConversationRequestContract {
  contractId: "eao.request.v1";
  requestId: string;
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  utterance: string;
  channel: EaoChannel;
  language: EaiVoiceLanguageCode;
  /** Prior turns (roles + text only) — bounded by orchestrator policy */
  history: Array<{ role: "user" | "assistant" | "system"; text: string; at: string }>;
  contextPackId: string;
  /** Allowed tool ids after Policy Gate (may be empty until gate runs) */
  allowedToolIds: string[];
  /** CRE hints — model may ignore for dialogue pacing */
  readinessHints: EaoConsultationReadinessSnapshot | null;
  requestedAt: string;
  /** Never instruct model to execute CRM/workflow */
  sideEffectPolicy: "propose_only";
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Conversation Response Contract
// ─────────────────────────────────────────────────────────────────────────────

export type EaoDialogueObjective =
  | "answer"
  | "educate"
  | "clarify"
  | "ask"
  | "recommend"
  | "refuse"
  | "escalate";

export interface EaoConversationResponseContract {
  contractId: "eao.response.v1";
  requestId: string;
  responseId: string;
  /** Primary conversational move — exactly one */
  objective: EaoDialogueObjective;
  /** Customer-facing natural language — dialogue ownership */
  facingText: string;
  language: EaiVoiceLanguageCode;
  /** Untrusted until Response Validation Contract passes */
  trustState: "unvalidated" | "validated" | "rejected";
  memoryWriteIntents: EaoMemoryWriteIntent[];
  proposalIntents: EaoActionProposalIntent[];
  toolCallsRequested: EaoToolInvocationRequestContract[];
  refusal?: {
    code: string;
    safeFacingText: string;
  };
  modelProviderId: string;
  modelConfigVersion: string;
  completedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Tool Invocation Contract
// ─────────────────────────────────────────────────────────────────────────────

export type EaoToolSideEffectClass =
  | "read_only"
  | "compute_only"
  | "propose_side_effect"
  | "forbidden_execute";

export interface EaoToolDefinitionContract {
  toolId: string;
  name: string;
  description: string;
  sideEffectClass: EaoToolSideEffectClass;
  /** Engine / registry that is SSOT for results */
  targetEngine: string;
  inputSchemaRef: string;
  outputSchemaRef: string;
}

export interface EaoToolInvocationRequestContract {
  contractId: "eao.tool.request.v1";
  invocationId: string;
  toolId: string;
  sessionId: string;
  conversationId: string;
  input: Record<string, unknown>;
  requestedBy: "reasoning_model" | "orchestrator";
}

export interface EaoToolInvocationResultContract {
  contractId: "eao.tool.result.v1";
  invocationId: string;
  toolId: string;
  ok: boolean;
  /** Structured engine payload — never free-form model invention */
  payload: Record<string, unknown>;
  provenance: "enterprise_engine";
  errorCode?: string;
  errorMessage?: string;
  completedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Policy Gate Contract
// ─────────────────────────────────────────────────────────────────────────────

export interface EaoPolicyGateRequestContract {
  contractId: "eao.policy.request.v1";
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  utterance: string;
  requestedToolIds: string[];
  requestedDataScopes: string[];
  enforceDomainBoundary: true;
}

export interface EaoPolicyGateDecisionContract {
  contractId: "eao.policy.decision.v1";
  decisionId: string;
  allowed: boolean;
  allowedToolIds: string[];
  deniedToolIds: string[];
  allowedDataScopes: string[];
  domainInScope: boolean;
  safeRefusalText?: string;
  blockedReasons: string[];
  requireActionProposalForSideEffects: true;
  policyVersion: string;
  decidedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Enterprise Memory Contract
// ─────────────────────────────────────────────────────────────────────────────

export interface EaoMemoryWriteIntent {
  key: string;
  value: string;
  /** Model proposes; Orchestrator validates before persist */
  confidence: EaiConfidenceBand;
}

export interface EaoEnterpriseMemoryContract {
  contractId: "eao.memory.v1";
  memoryId: string;
  sessionId: string;
  conversationId: string;
  knownFacts: EaoProvenancedFact[];
  customerGoals: string[];
  /** Writes accepted only after validation */
  pendingWriteIntents: EaoMemoryWriteIntent[];
  updatedAt: string;
  /** Memory is consultation state — not CRM SSOT */
  authorityNote: "consultation_memory_not_crm_ssot";
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Action Proposal Contract
// ─────────────────────────────────────────────────────────────────────────────

export interface EaoActionProposalIntent {
  kind: EaiActionProposalKind;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  confidence: EaiConfidenceBand;
  requiresHumanApproval: true;
}

export interface EaoActionProposalContract {
  contractId: "eao.action_proposal.v1";
  proposalId: string;
  sessionId: string;
  conversationId: string;
  kind: EaiActionProposalKind;
  status: EaiActionProposalStatus;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  confidence: EaiConfidenceBand;
  requiresHumanApproval: true;
  /** Frozen: Orchestrator never auto-executes */
  executionPolicy: "never_auto_execute";
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Response Validation Contract
// ─────────────────────────────────────────────────────────────────────────────

export type EaoValidationFailureCode =
  | "empty_facing"
  | "schema_invalid"
  | "invented_calculation"
  | "invented_eligibility"
  | "invented_rate_or_emi"
  | "crm_execute_attempt"
  | "workflow_execute_attempt"
  | "policy_egress_deny"
  | "domain_egress_deny"
  | "unsupported_language_claim"
  | "generic_banned_phrase"
  | "unapproved_tool_call";

export interface EaoResponseValidationContract {
  contractId: "eao.validation.v1";
  requestId: string;
  responseId: string;
  passed: boolean;
  failures: Array<{ code: EaoValidationFailureCode; detail: string }>;
  /** Allowed: strip claims / force refusal / request one regenerate */
  remediation: "accept" | "strip_claims" | "force_refusal" | "regenerate_once" | "fallback_dialogue";
  validatedAt: string;
  validatorVersion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Audit Contract
// ─────────────────────────────────────────────────────────────────────────────

export interface EaoAuditContract {
  contractId: "eao.audit.v1";
  auditId: string;
  requestId: string;
  sessionId: string;
  conversationId: string;
  utteranceHash: string;
  contextPackHash: string;
  policyDecisionId: string | null;
  modelProviderId: string | null;
  modelConfigVersion: string | null;
  toolInvocationIds: string[];
  proposalIds: string[];
  validationPassed: boolean | null;
  facingTextHash: string | null;
  objective: EaoDialogueObjective | null;
  /** CRE snapshot ids / confidence for forensic readiness */
  readinessConfidence: number | null;
  recordedAt: string;
  orchestratorContractsVersion: typeof EAI_ORCHESTRATOR_CONTRACTS_VERSION;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Model Provider Abstraction Contract
// ─────────────────────────────────────────────────────────────────────────────

export interface EaoModelProviderCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  languages: EaiVoiceLanguageCode[];
}

/**
 * Provider-independent port — Orchestrator must not import vendor SDKs.
 * Implementations are out of G1 scope (no live wiring).
 */
export interface EaoModelProviderPort {
  providerId: string;
  configVersion: string;
  capabilities: EaoModelProviderCapabilities;
  complete(request: EaoConversationRequestContract): Promise<EaoConversationResponseContract>;
}

export interface EaoModelProviderAbstractionContract {
  contractId: "eao.model_provider.v1";
  /** Registered providers (ids only at contract freeze) */
  registeredProviderIds: string[];
  /** Active selection is configuration, not code hard-bind */
  selectionPolicy: "config_driven";
  /** Model output always untrusted until validation */
  trustPolicy: "untrusted_until_validated";
  /** Forbidden: model as SSOT for listed enterprise domains */
  neverAuthoritativeFor: Array<
    | "calculations"
    | "eligibility"
    | "product_rules"
    | "credit_policies"
    | "workflow"
    | "crm"
    | "audit"
    | "business_actions"
  >;
}
