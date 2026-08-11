/**
 * Lead Intelligence & Action Proposal Engine (CO-AI-109 / Sprint AI-9).
 * Converts completed consultations into enterprise recommendations.
 * Generates Action Proposals only — never creates CRM records or triggers workflows.
 */

import type {
  EaiActionProposalKind,
  EaiConfidenceBand,
  EaiPersonaPackId,
} from "./enterprise-ai-platform";
import type { EaiConsultationObject } from "./enterprise-ai-consultation";
import type { EaiDomainBoundaryDecision } from "./enterprise-ai-domain-governance";
import type { EaiConversationMemory, EaiContextPackage } from "./enterprise-ai-context-intelligence";

export type EaiReadinessBand = "not_ready" | "partial" | "ready" | "strong";

export interface EaiReadinessAssessment {
  dimension: "lead" | "opportunity" | "document" | "customer";
  score: number;
  band: EaiReadinessBand;
  reasons: string[];
  blockers: string[];
  /** Recommendation only — never an execution command */
  recommendedNextStep: string;
}

export interface EaiPartnerRecommendation {
  recommendationId: string;
  /** Qualitative partner / channel suggestion — not a ranked product score */
  suggestion: string;
  rationale: string;
  proposalKind: "assign_wealth_partner" | "generic";
  confidence: EaiConfidenceBand;
  requiresHumanApproval: true;
}

export type EaiLeadIntelligenceNbaKind =
  | "propose_create_lead"
  | "propose_create_opportunity"
  | "propose_request_documents"
  | "propose_assign_partner"
  | "propose_callback"
  | "propose_task"
  | "continue_consultation"
  | "outside_refused";

export interface EaiLeadIntelligenceNba {
  actionId: string;
  kind: EaiLeadIntelligenceNbaKind;
  title: string;
  summary: string;
  proposalKind?: EaiActionProposalKind;
  priorityScore: number;
  confidence: EaiConfidenceBand;
  rank: number;
}

export interface EaiRankedActionProposal {
  rank: number;
  priorityScore: number;
  confidence: EaiConfidenceBand;
  kind: EaiActionProposalKind;
  title: string;
  summary: string;
  /** Set when emitActionProposals=true — draft proposal id only */
  proposalId?: string;
  requiresHumanApproval: true;
  executionForbidden: true;
}

export interface EaiLeadIntelligenceConfidence {
  band: EaiConfidenceBand;
  scoreHint: number;
  reasons: string[];
}

export interface EaiLeadIntelligenceRequest {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  utterance?: string;
  /** Preferred input — completed consultation object */
  consultation?: EaiConsultationObject;
  conversationMemory?: EaiConversationMemory;
  contextPackage?: EaiContextPackage;
  /** When true, mint draft Action Proposals (never executed) */
  emitActionProposals?: boolean;
}

/**
 * Lead Intelligence result — recommendations + optional draft proposals only.
 */
export interface EaiLeadIntelligenceResult {
  resultId: string;
  version: string;
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  builtAt: string;
  blocked: boolean;
  refusalText?: string;
  domainBoundary?: EaiDomainBoundaryDecision;
  consultationId?: string;
  leadReadiness: EaiReadinessAssessment;
  opportunityReadiness: EaiReadinessAssessment;
  documentReadiness: EaiReadinessAssessment;
  customerReadiness: EaiReadinessAssessment;
  partnerRecommendation?: EaiPartnerRecommendation;
  nextBestActions: EaiLeadIntelligenceNba[];
  rankedProposals: EaiRankedActionProposal[];
  priorityScore: number;
  confidence: EaiLeadIntelligenceConfidence;
  actionProposalIds: string[];
  /** Explicit non-execution flags */
  leadsCreated: false;
  opportunitiesCreated: false;
  crmModified: false;
  workflowsTriggered: false;
  disclaimers: string[];
  validation: EaiLeadIntelligenceValidationResult;
}

export interface EaiLeadIntelligenceValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface EaiLeadIntelligenceValidationResult {
  valid: boolean;
  issues: EaiLeadIntelligenceValidationIssue[];
}

export interface EaiLeadIntelligenceReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
