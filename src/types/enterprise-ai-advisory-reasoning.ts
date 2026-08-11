/**
 * Knowledge & Advisory Reasoning Engine (CO-AI-106 / Sprint AI-6).
 * Answers: "What advice should SARATHI provide?"
 * Never replaces enterprise calculations.
 */

import type { EaiConfidenceBand, EaiPersonaPackId } from "./enterprise-ai-platform";
import type { EaiToneCategoryId } from "./enterprise-ai-domain-governance";
import type { EaiFdiDecisionPackage } from "./enterprise-ai-financial-decision";
import type { EaiContextPackage } from "./enterprise-ai-context-intelligence";
import type { EaiDomainBoundaryDecision } from "./enterprise-ai-domain-governance";

export type EaiAdvisoryMode =
  | "knowledge"
  | "loan_advisory"
  | "product_explanation"
  | "comparison"
  | "benefit_tradeoff"
  | "educational"
  | "customer_guidance"
  | "journey_guidance"
  | "outside_refused";

export interface EaiAdvisoryFragment {
  fragmentId: string;
  mode: EaiAdvisoryMode;
  /** Short curated advice lines — never long paragraphs */
  lines: string[];
  toneCategoryId?: EaiToneCategoryId;
  /** Engine deferral flags — advice only */
  defersToEnterpriseEngine: boolean;
  supportingDomains: string[];
}

export interface EaiAdvisoryReasoningRequest {
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  question: string;
  /** Optional pre-built packages */
  contextPackage?: EaiContextPackage;
  fdiPackage?: EaiFdiDecisionPackage;
  entityRefs?: import("./enterprise-ai-read-connectors").EaiEntityRefs;
}

export interface EaiAdvisoryReasoningResult {
  resultId: string;
  version: string;
  sessionId: string;
  conversationId: string;
  personaPackId: EaiPersonaPackId;
  question: string;
  builtAt: string;
  modesUsed: EaiAdvisoryMode[];
  fragments: EaiAdvisoryFragment[];
  /** Final audience-facing advice after Tone + Micro Communication */
  facingText: string;
  confidence: EaiConfidenceBand;
  domainBoundary?: EaiDomainBoundaryDecision;
  fdiPackageId?: string;
  contextPackageId?: string;
  blocked: boolean;
  refusalText?: string;
  disclaimers: string[];
  validation: EaiAdvisoryValidationResult;
}

export interface EaiAdvisoryValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface EaiAdvisoryValidationResult {
  valid: boolean;
  issues: EaiAdvisoryValidationIssue[];
}

export interface EaiAdvisoryReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}
