/**
 * Enterprise AI Platform (CO-AI-101 / Sprint AI-1) — domain types.
 *
 * Persona-agnostic foundation. Behaviour packs (SARATHI / future CHANAKYA chat)
 * plug in later. Engines decide; LLM explains. No CRM mutation in AI modules.
 */

/** Reserved behaviour packs — platform stays agnostic; packs activate later. */
export type EaiPersonaPackId =
  | "platform_none"
  | "sarathi_customer"
  | "sarathi_wealth_partner"
  | "chanakya_executive";

export type EaiSessionStatus = "active" | "paused" | "closed" | "expired";

/** Channel enum reserved for continuity; voice not implemented in AI-1. */
export type EaiChannel = "text" | "api" | "system" | "voice" | "voice_reserved";

export type EaiConfidenceBand = "low" | "moderate" | "high" | "unspecified";

export type EaiToolSideEffectClass = "read" | "propose" | "mutate";

export type EaiActionProposalKind =
  | "create_lead"
  | "create_opportunity"
  | "assign_wealth_partner"
  | "request_documents"
  | "schedule_callback"
  | "create_task"
  | "create_reminder"
  | "generic";

export type EaiActionProposalStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "cancelled"
  | "executed_reserved";

export type EaiInteractionOutcome =
  | "recorded"
  | "composed"
  | "blocked_by_policy"
  | "provider_unavailable"
  | "error";

/** Opaque registry reference — never a raw enterprise row dump for the LLM. */
export interface EaiRegistryRef {
  registry: string;
  entityId: string;
  label?: string;
}

export interface EaiSanitizedFact {
  key: string;
  value: string;
  provenance: "user_stated" | "registry_projection" | "system" | "unknown";
}

export interface EaiSessionDeviceHint {
  deviceId?: string;
  clientLabel?: string;
}

export interface EaiSession {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  status: EaiSessionStatus;
  channel: EaiChannel;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  /** Future multi-device continuity — stored, not enforced in AI-1. */
  continuityKey?: string;
  deviceHints: EaiSessionDeviceHint[];
  metadata: Record<string, string>;
}

export interface EaiConversationTurn {
  turnId: string;
  sessionId: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  /** Plain text turn content for orchestrator state — not LLM prompt assembly. */
  text: string;
  createdAt: string;
}

export interface EaiCompiledContext {
  contextId: string;
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  sanitizedFacts: EaiSanitizedFact[];
  registryRefs: EaiRegistryRef[];
  /** Explicit note that raw enterprise payloads were not included. */
  redactionNotes: string[];
  compiledAt: string;
  compilerVersion: string;
}

/** Future connector contract — AI-1 ships stubs only. */
export interface EaiContextSourceDescriptor {
  sourceId: string;
  registry: string;
  description: string;
  implemented: boolean;
}

export interface EaiPolicyRequest {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  requestedToolIds: string[];
  requestedDataScopes: string[];
  intentHint?: string;
  /** AI-4A: full user utterance for Domain Boundary (falls back to intentHint). */
  utterance?: string;
  /** AI-4A: force domain enforcement even for non-SARATHI packs. */
  enforceDomainBoundary?: boolean;
  /** AI-2: declarative capabilities requested for this turn. */
  requestedCapabilityIds?: import("./enterprise-ai-capability-layer").EaiCapabilityId[];
  /** AI-2: optional tool categories implied by the request. */
  requestedToolCategories?: import("./enterprise-ai-capability-layer").EaiToolCategoryId[];
}

export interface EaiPolicyDecision {
  decisionId: string;
  allowed: boolean;
  allowedToolIds: string[];
  deniedToolIds: string[];
  allowedDataScopes: string[];
  requireActionProposal: boolean;
  blockedReasons: string[];
  decidedAt: string;
  policyVersion: string;
  /** AI-2 capability evaluation results. */
  allowedCapabilityIds: import("./enterprise-ai-capability-layer").EaiCapabilityId[];
  deniedCapabilityIds: import("./enterprise-ai-capability-layer").EaiCapabilityId[];
  deniedToolCategories: import("./enterprise-ai-capability-layer").EaiToolCategoryId[];
  /** AI-4A Domain Boundary — mandatory before LLM reasoning when utterance present. */
  domainBoundary?: import("./enterprise-ai-domain-governance").EaiDomainBoundaryDecision;
  /** AI-4A polite refusal when domain blocks — not an LLM prompt. */
  safeRefusalText?: string;
}

export interface EaiToolDefinition {
  toolId: string;
  name: string;
  description: string;
  sideEffectClass: EaiToolSideEffectClass;
  /** Reserved registry / engine id this tool will wrap later. */
  targetEngine?: string;
  /** AI-2 tool category — architecture grouping only. */
  category?: import("./enterprise-ai-capability-layer").EaiToolCategoryId;
  registeredAt: string;
}

export interface EaiToolInvocationRequest {
  toolId: string;
  sessionId: string;
  conversationId: string;
  input: Record<string, unknown>;
}

export interface EaiToolInvocationResult {
  toolId: string;
  ok: boolean;
  /** Structured engine result placeholder — never free-form LLM invention. */
  payload: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export interface EaiActionProposal {
  proposalId: string;
  sessionId: string;
  conversationId: string;
  kind: EaiActionProposalKind;
  status: EaiActionProposalStatus;
  title: string;
  summary: string;
  /** Structured payload for a future executor — not executed in AI-1. */
  payload: Record<string, unknown>;
  confidence: EaiConfidenceBand;
  requiresHumanApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EaiLlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface EaiLlmCompletionRequest {
  requestId: string;
  sessionId: string;
  conversationId: string;
  messages: EaiLlmMessage[];
  /** Sanitized context only — callers must pass compiler output, not raw registries. */
  compiledContextId?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface EaiLlmCompletionResult {
  requestId: string;
  providerId: string;
  modelId: string;
  content: string;
  finishReason: "stop" | "length" | "error" | "blocked";
  usage?: { promptTokens?: number; completionTokens?: number };
  rawProviderMeta?: Record<string, string>;
}

export interface EaiComposeInput {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  llmOutput: string;
  enterpriseResults: EaiToolInvocationResult[];
  policyDecision: EaiPolicyDecision;
  actionProposals: EaiActionProposal[];
  confidence: EaiConfidenceBand;
  /** AI-14: facing language for Tone / Micro / Domain Boundary localisation */
  language?: import("./enterprise-ai-multilingual").EaiLanguageCode;
}

export interface EaiComposedResponse {
  responseId: string;
  sessionId: string;
  conversationId: string;
  /** Sole customer/partner-facing text surface from the platform. */
  text: string;
  confidence: EaiConfidenceBand;
  actionProposalIds: string[];
  policyDecisionId: string;
  citations: EaiRegistryRef[];
  composedAt: string;
  composerVersion: string;
}

export interface EaiInteractionRecord {
  interactionId: string;
  conversationId: string;
  sessionId: string;
  personaPackId: EaiPersonaPackId;
  intentHint?: string;
  contextSnapshotRef?: string;
  recommendation?: string;
  confidence: EaiConfidenceBand;
  actionProposalIds: string[];
  outcome: EaiInteractionOutcome;
  audit: {
    recordedAt: string;
    actorId?: string;
    notes?: string[];
  };
}

export interface EaiRegistrySnapshot {
  frameworkVersion: string;
  sessionCount: number;
  interactionCount: number;
  proposalCount: number;
  registeredToolCount: number;
  personaPacksReserved: EaiPersonaPackId[];
  llmProviderId: string;
  /** AI-2 */
  capabilityLayerVersion?: string;
  registeredBehaviourPackCount?: number;
  toolCategoryCount?: number;
  capabilityCatalogueCount?: number;
  /** AI-3 */
  contextIntelligenceVersion?: string;
  contextProviderCount?: number;
  /** AI-4 */
  readConnectorsVersion?: string;
  readConnectorCount?: number;
  readToolCount?: number;
  /** AI-4A */
  domainGovernanceVersion?: string;
  knowledgeSourceCount?: number;
  /** AI-5 */
  financialDecisionIntelligenceVersion?: string;
  /** AI-6 */
  advisoryReasoningVersion?: string;
  /** AI-7 */
  plannerVersion?: string;
  /** AI-8 */
  consultationIntelligenceVersion?: string;
  /** AI-9 */
  leadIntelligenceVersion?: string;
  /** AI-10 */
  explainabilityTrustVersion?: string;
  /** AI-11 */
  conversationExperienceVersion?: string;
  /** AI-12 */
  wealthPartnerBehaviourVersion?: string;
  /** AI-13 */
  voiceEngineVersion?: string;
  /** AI-14 */
  multilingualEngineVersion?: string;
  /** AI-15 */
  conversationMemoryEngineVersion?: string;
  /** AI-16 */
  validationPerformanceVersion?: string;
}

/** Ports-facing LLM provider contract — no vendor SDK types. */
export interface EaiLlmProvider {
  readonly providerId: string;
  complete(request: EaiLlmCompletionRequest): Promise<EaiLlmCompletionResult>;
}
