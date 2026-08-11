/**
 * SARATHI Domain Boundary, Knowledge Governance & Communication (CO-AI-104 DIE).
 * Platform-enforced — the LLM does not decide domain membership alone.
 */

export type EaiKnowledgeZoneId = "zone_1_core" | "zone_2_adjacent" | "zone_3_outside";

export type EaiDomainBoundaryOutcome =
  | "allow_core"
  | "allow_adjacent"
  | "refuse_outside"
  | "refuse_unknown"
  | "allow_mixed_constrained";

export type EaiSarathiIntentClass =
  | "knowledge"
  | "advisory"
  | "discovery"
  | "workflow"
  | "unsupported";

export type EaiToneCategoryId =
  | "home_loan"
  | "balance_transfer"
  | "loan_against_property"
  | "business_loan"
  | "working_capital"
  | "personal_loan"
  | "eligibility"
  | "documents"
  | "waiting"
  | "recommendation"
  | "completion";

export interface EaiToneEntry {
  categoryId: EaiToneCategoryId;
  label: string;
  /** Curated lines — typically 1–2 short sentences. */
  lines: readonly string[];
}

export interface EaiKnowledgeTopicDef {
  topicId: string;
  label: string;
  zone: EaiKnowledgeZoneId;
  /** Case-insensitive keyword / phrase matchers */
  patterns: RegExp[];
}

export interface EaiKnowledgeSourceRegistration {
  sourceId: string;
  displayName: string;
  zone: EaiKnowledgeZoneId;
  description?: string;
  registeredAt: string;
}

export interface EaiDomainMatchHit {
  topicId: string;
  label: string;
  zone: EaiKnowledgeZoneId;
}

export interface EaiDomainBoundaryRequest {
  /** User utterance or request text to classify */
  utterance: string;
  personaPackId?: string;
  /**
   * When true, always enforce.
   * When false, never enforce.
   * When omitted, enforce for any non-empty utterance (identical across packs).
   */
  enforce?: boolean;
}

export interface EaiDomainBoundaryDecision {
  decisionId: string;
  decidedAt: string;
  governanceVersion: string;
  utterancePreview: string;
  zone: EaiKnowledgeZoneId | "unknown";
  outcome: EaiDomainBoundaryOutcome;
  /** True when LLM reasoning must not proceed */
  blocksLlm: boolean;
  /** True when knowledge / context retrieval must not proceed */
  blocksKnowledge: boolean;
  /** True when Policy Gate should deny the conversational request */
  policyDeny: boolean;
  intent: EaiSarathiIntentClass;
  matchedTopics: EaiDomainMatchHit[];
  mixedDomain: boolean;
  reasons: string[];
  /**
   * Outside / unknown: exactly `I'm not trained for this subject.`
   * Identical across every Behaviour Pack.
   */
  safeRefusalText?: string;
  /** Empty when outside-domain (no redirection). */
  redirectHints: string[];
  /** Suggested Tone Library category for in-domain replies. */
  toneCategoryId?: EaiToneCategoryId;
}

export interface EaiMicroCommunicationResult {
  text: string;
  lineCount: number;
  averageWordsPerLine: number;
  compliant: boolean;
  notes: string[];
}

export interface EaiDomainGovernanceReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
