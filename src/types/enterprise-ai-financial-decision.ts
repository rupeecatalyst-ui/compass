/**
 * Financial Decision Intelligence Foundation (CO-AI-105 / Sprint AI-5).
 * FDI reasons, explains, and recommends.
 * Enterprise engines calculate. FDI never calculates eligibility, FOIR, DBR, pricing, or approvals.
 */

import type { EaiConfidenceBand, EaiPersonaPackId } from "./enterprise-ai-platform";
import type { EaiContextDomain, EaiContextPackage } from "./enterprise-ai-context-intelligence";
import type { EaiDomainBoundaryDecision } from "./enterprise-ai-domain-governance";
import type { EaiPolicyDecision } from "./enterprise-ai-platform";

/** Pre-computed facts supplied by enterprise engines — never invented by FDI. */
export interface EaiFdiEngineFact {
  key: string;
  value: string;
  /** Owning enterprise engine / calculator id */
  engineId: string;
  provenance: "enterprise_engine";
}

export type EaiFdiRecommendationKind =
  | "explain"
  | "clarify"
  | "explore_scenario"
  | "defer_to_engine"
  | "outside_domain_refused";

export interface EaiFdiRecommendation {
  recommendationId: string;
  kind: EaiFdiRecommendationKind;
  title: string;
  /** Short facing summary — not an approval or eligibility result */
  summary: string;
  confidence: EaiConfidenceBand;
  /** Opaque refs to context / engine facts that support the recommendation */
  supportingFactKeys: string[];
  /** Explicit: FDI did not calculate these */
  notCalculatedByFdi: string[];
  requiresHumanReview: boolean;
  requiresEnterpriseEngine: boolean;
}

export interface EaiFdiExplanation {
  explanationId: string;
  questionSummary: string;
  /** Domains / evidence considered */
  considered: string[];
  /** What FDI deliberately did not decide */
  notDecidedByFdi: string[];
  /** Plain-language explainability for LLM / Composer */
  narrativeLines: string[];
  engineOwnershipNotes: string[];
}

export interface EaiFdiAlternativeOption {
  optionId: string;
  label: string;
  description: string;
  /** Not a ranked score — informational only */
  conditionHint?: string;
  requiresEnterpriseEngineConfirmation: boolean;
}

export type EaiFdiScenarioId =
  | "affordability_explore"
  | "balance_transfer_explore"
  | "tenure_tradeoff"
  | "top_up_explore"
  | "documentation_gap";

export interface EaiFdiScenario {
  scenarioId: EaiFdiScenarioId;
  label: string;
  purpose: string;
  /** Inputs that must come from enterprise engines — FDI never fills these */
  requiredEngineInputs: string[];
  /** Framing questions for Conversation — not calculations */
  explorationQuestions: string[];
}

export interface EaiFdiConfidenceAssessment {
  band: EaiConfidenceBand;
  scoreHint: number;
  reasons: string[];
  /** Evidence completeness only — not FOIR/eligibility math */
  evidenceDomains: EaiContextDomain[];
  engineFactCount: number;
}

export interface EaiFdiDecisionRequest {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  question: string;
  /** Optional pre-built Context Package; otherwise FDI builds via CIE */
  contextPackage?: EaiContextPackage;
  /** Facts already calculated by enterprise engines */
  engineFacts?: EaiFdiEngineFact[];
  entityRefs?: import("./enterprise-ai-read-connectors").EaiEntityRefs;
}

export interface EaiFdiDecisionPackage {
  packageId: string;
  version: string;
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  question: string;
  builtAt: string;
  domainBoundary?: EaiDomainBoundaryDecision;
  policyDecision?: EaiPolicyDecision;
  contextPackageId?: string;
  recommendations: EaiFdiRecommendation[];
  explanation: EaiFdiExplanation;
  confidence: EaiFdiConfidenceAssessment;
  alternatives: EaiFdiAlternativeOption[];
  scenarios: EaiFdiScenario[];
  engineFactsUsed: EaiFdiEngineFact[];
  disclaimers: string[];
  blocked: boolean;
  refusalText?: string;
  validation: EaiFdiValidationResult;
}

export interface EaiFdiValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface EaiFdiValidationResult {
  valid: boolean;
  issues: EaiFdiValidationIssue[];
}

export interface EaiFdiReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
