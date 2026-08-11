/**
 * Enterprise Context Intelligence Engine (CO-AI-103 / Sprint AI-3).
 * Sole preparer of AI-safe structured context. Never emits raw enterprise objects.
 */

import type { EaiPersonaPackId, EaiSanitizedFact } from "./enterprise-ai-platform";

/** Context domains that may appear in a Context Package (all optional). */
export type EaiContextDomain =
  | "customer"
  | "loan"
  | "partner"
  | "product"
  | "workflow"
  | "knowledge"
  | "conversation"
  | "financial"
  | "document"
  | "policy";

export type EaiContextPriority = "critical" | "high" | "normal" | "low" | "omit";

export interface EaiContextBudgetPolicy {
  /** Soft ceiling for approximate package size (chars). Architecture only — no tokenizer. */
  maxApproximateChars: number;
  /** Domain priority order — earlier = retained first under truncation. */
  priorityOrder: EaiContextDomain[];
  /** When over budget, replace low-priority sections with summaries. */
  enableSummaryReplacement: boolean;
  /** When over budget after summaries, drop lowest-priority domains. */
  enableTruncation: boolean;
}

export interface EaiConversationMemory {
  intent?: string;
  knownFacts: EaiSanitizedFact[];
  openQuestions: string[];
  previousRecommendations: string[];
  outstandingActions: string[];
  /** Compact summary — never full chat transcript. */
  summary?: string;
}

export interface EaiContextDomainSection {
  domain: EaiContextDomain;
  priority: EaiContextPriority;
  /** Sanitized business facts only. */
  facts: EaiSanitizedFact[];
  /** Opaque refs — never raw row dumps. */
  refs: Array<{ registry: string; entityId: string; label?: string }>;
  /** Optional short summary for budget replacement. */
  summary?: string;
  providerId: string;
  providerVersion: string;
  included: boolean;
  omitReason?: string;
}

export interface EaiContextPackageVersioning {
  packageVersion: string;
  builderVersion: string;
  providerVersions: Record<string, string>;
  builtAt: string;
  /** Reserved for future Enterprise AI Registry / audit linkage. */
  futureAuditRef?: string;
}

/**
 * Canonical Enterprise AI Context Package.
 * All domain sections optional; only included domains are reasoning-safe.
 */
export interface EaiContextPackage {
  packageId: string;
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  /** Original request hint used for prioritisation. */
  requestHint?: string;
  domainsRequested: EaiContextDomain[];
  domainsIncluded: EaiContextDomain[];
  sections: EaiContextDomainSection[];
  conversationMemory?: EaiConversationMemory;
  budget: {
    policy: EaiContextBudgetPolicy;
    approximateChars: number;
    truncated: boolean;
    summaryReplacedDomains: EaiContextDomain[];
    omittedDomains: EaiContextDomain[];
  };
  sanitisationNotes: string[];
  versioning: EaiContextPackageVersioning;
  /** AI-4 DIE: set when Domain Boundary blocked knowledge retrieval. */
  domainBoundaryBlocked?: boolean;
  domainRefusalText?: string;
}

export interface EaiContextBuildRequest {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  /** Natural-language or intent hint for prioritisation. */
  requestHint?: string;
  /** Explicit domain override — when omitted, prioritiser selects. */
  forceDomains?: EaiContextDomain[];
  conversationMemory?: EaiConversationMemory;
  budgetPolicy?: Partial<EaiContextBudgetPolicy>;
  futureAuditRef?: string;
  /** AI-4 entity refs for connector resolution. */
  entityRefs?: import("./enterprise-ai-read-connectors").EaiEntityRefs;
}

export interface EaiContextProviderRequest {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  domain: EaiContextDomain;
  requestHint?: string;
  /** AI-4 entity refs for connector resolution. */
  entityRefs?: import("./enterprise-ai-read-connectors").EaiEntityRefs;
}

export interface EaiContextProviderResult {
  domain: EaiContextDomain;
  providerId: string;
  providerVersion: string;
  /** Framework stubs return empty facts until AI-4 connectors. */
  facts: EaiSanitizedFact[];
  refs: Array<{ registry: string; entityId: string; label?: string }>;
  summary?: string;
  implemented: boolean;
}

/**
 * Provider interface — production registry connectors arrive in AI-4+.
 * Providers MUST return sanitized projections only.
 */
export interface EaiContextProvider {
  readonly providerId: string;
  readonly domain: EaiContextDomain;
  readonly providerVersion: string;
  readonly implemented: boolean;
  provide(request: EaiContextProviderRequest): Promise<EaiContextProviderResult>;
}

export interface EaiContextValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface EaiContextValidationResult {
  valid: boolean;
  issues: EaiContextValidationIssue[];
}

export interface EaiContextIntelligenceReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
