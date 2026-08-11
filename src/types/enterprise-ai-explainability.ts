/**
 * Explainability & Trust Engine (CO-AI-110 / Sprint AI-10).
 * Every recommendation must be explainable.
 * Never fabricates reasons. Never hides uncertainty.
 * Clearly distinguishes Facts · Assumptions · Recommendations.
 */

import type { EaiConfidenceBand, EaiPersonaPackId } from "./enterprise-ai-platform";
import type { EaiConsultationObject } from "./enterprise-ai-consultation";
import type { EaiDomainBoundaryDecision } from "./enterprise-ai-domain-governance";
import type { EaiLeadIntelligenceResult } from "./enterprise-ai-lead-intelligence";
import type { EaiFdiDecisionPackage } from "./enterprise-ai-financial-decision";
import type { EaiPlannerPlan } from "./enterprise-ai-planner";
import type { EaiAdvisoryReasoningResult } from "./enterprise-ai-advisory-reasoning";

/** Epistemic class — mandatory labelling for trust. */
export type EaiTrustStatementClass = "fact" | "assumption" | "recommendation";

/** Curated reason code catalogue ids — never free-text invented codes. */
export type EaiTrustReasonCodeId =
  | "RC_OUTSIDE_DOMAIN"
  | "RC_OBJECTIVE_PRESENT"
  | "RC_OBJECTIVE_MISSING"
  | "RC_PRODUCT_KNOWN"
  | "RC_PRODUCT_UNKNOWN"
  | "RC_AMOUNT_KNOWN"
  | "RC_AMOUNT_UNKNOWN"
  | "RC_EMPLOYMENT_KNOWN"
  | "RC_DOCUMENTS_READY"
  | "RC_DOCUMENTS_GAP"
  | "RC_CONSULTATION_COMPLETE"
  | "RC_CONSULTATION_INCOMPLETE"
  | "RC_LEAD_READY"
  | "RC_LEAD_NOT_READY"
  | "RC_OPPORTUNITY_READY"
  | "RC_OPPORTUNITY_NOT_READY"
  | "RC_CUSTOMER_READY"
  | "RC_INFORMATION_GAPS"
  | "RC_PARTNER_SIGNAL"
  | "RC_ENGINE_DECISION_REQUIRED"
  | "RC_HUMAN_APPROVAL_REQUIRED"
  | "RC_LOW_EVIDENCE"
  | "RC_MODERATE_EVIDENCE"
  | "RC_HIGH_EVIDENCE"
  | "RC_ALTERNATIVE_CONTINUE_CONSULTATION"
  | "RC_ALTERNATIVE_REQUEST_DOCUMENTS"
  | "RC_PROPOSAL_DRAFT_ONLY";

export interface EaiTrustReasonCode {
  code: EaiTrustReasonCodeId;
  label: string;
  /** Why this code applied — must be grounded in observed signals */
  rationale: string;
  statementClass: EaiTrustStatementClass;
}

export interface EaiTrustSupportingFact {
  factId: string;
  key: string;
  value: string;
  provenance: string;
  /** Always fact — supporting evidence only */
  statementClass: "fact";
}

export interface EaiTrustAssumption {
  assumptionId: string;
  text: string;
  /** Explicit uncertainty — never presented as fact */
  statementClass: "assumption";
  relatedReasonCodes: EaiTrustReasonCodeId[];
}

export interface EaiTrustMissingInfo {
  slotId: string;
  label: string;
  reason: string;
  alreadyKnown: boolean;
}

export interface EaiConfidenceExplanation {
  band: EaiConfidenceBand;
  scoreHint: number;
  explanationLines: string[];
  /** Uncertainty that must remain visible */
  uncertaintyLines: string[];
  reasonCodes: EaiTrustReasonCodeId[];
}

export interface EaiAlternativeRecommendationExplanation {
  alternativeId: string;
  title: string;
  summary: string;
  whyNotPrimary: string;
  reasonCodes: EaiTrustReasonCodeId[];
  statementClass: "recommendation";
}

export interface EaiDecisionTraceStep {
  stepId: string;
  sequence: number;
  stage: string;
  inputSummary: string;
  outputSummary: string;
  reasonCodes: EaiTrustReasonCodeId[];
  at: string;
}

export interface EaiRecommendationExplanation {
  explanationId: string;
  recommendationTitle: string;
  recommendationSummary: string;
  statementClass: "recommendation";
  reasonCodes: EaiTrustReasonCode[];
  supportingFacts: EaiTrustSupportingFact[];
  assumptions: EaiTrustAssumption[];
  missingInformation: EaiTrustMissingInfo[];
  confidenceExplanation: EaiConfidenceExplanation;
  alternatives: EaiAlternativeRecommendationExplanation[];
  facingLines: string[];
}

export interface EaiExplainabilityRequest {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  utterance?: string;
  /** Preferred: Lead Intelligence result to explain */
  leadIntelligence?: EaiLeadIntelligenceResult;
  consultation?: EaiConsultationObject;
  fdiPackage?: EaiFdiDecisionPackage;
  plannerPlan?: EaiPlannerPlan;
  advisoryResult?: EaiAdvisoryReasoningResult;
}

/**
 * Trust Package — sole explainability output.
 */
export interface EaiTrustPackage {
  packageId: string;
  version: string;
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  builtAt: string;
  blocked: boolean;
  refusalText?: string;
  domainBoundary?: EaiDomainBoundaryDecision;
  leadIntelligenceResultId?: string;
  consultationId?: string;
  /** Primary recommendation explanation */
  recommendationExplanation: EaiRecommendationExplanation;
  /** Full decision trace across layers */
  decisionTrace: EaiDecisionTraceStep[];
  /** Flattened epistemic inventory for consumers */
  facts: EaiTrustSupportingFact[];
  assumptions: EaiTrustAssumption[];
  recommendations: Array<{ title: string; summary: string; statementClass: "recommendation" }>;
  disclaimers: string[];
  validation: EaiExplainabilityValidationResult;
}

export interface EaiExplainabilityValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface EaiExplainabilityValidationResult {
  valid: boolean;
  issues: EaiExplainabilityValidationIssue[];
}

export interface EaiExplainabilityReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
