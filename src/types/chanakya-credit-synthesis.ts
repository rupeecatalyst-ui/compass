/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-015 — Credit synthesis & underwriting readiness types.
 * Evidence-first · internal-only · not lender-facing · not an approval engine.
 */

import type {
  ChanakyaCreditAssessmentState,
  ChanakyaCreditEvidenceItem,
  ChanakyaCreditFactProvenance,
  ChanakyaCreditIntelligenceContext,
  ChanakyaCreditInternalRecommendation,
  ChanakyaCreditReconciliation,
  ChanakyaCreditSectionAvailability,
} from "./chanakya-credit-intelligence";

export type ChanakyaCreditConcernSeverity =
  | "critical"
  | "high"
  | "medium"
  | "information_gap";

/** Top-level advisory — restricted vocabulary (not approval language). */
export type ChanakyaCreditSynthesisAdvisoryState =
  | "POSITIVE"
  | "CAUTION"
  | "INSUFFICIENT_EVIDENCE";

export interface ChanakyaCreditProfileSection {
  availability: ChanakyaCreditSectionAvailability;
  summary: string;
  highlights: string[];
  provenance: string[];
}

export interface ChanakyaCreditRankedConcern {
  id: string;
  severity: ChanakyaCreditConcernSeverity;
  statement: string;
  evidence: string[];
  provenance: ChanakyaCreditFactProvenance[];
  sourceConcernId: string;
}

export interface ChanakyaCreditFinancialAssessmentObservations {
  availability: ChanakyaCreditSectionAvailability;
  revenueTrend: string | null;
  profitabilityTrend: string | null;
  netWorthTrend: string | null;
  leverageObservation: string | null;
  liquidityObservation: string | null;
  bankingObservation: string | null;
  gstConsistencyObservation: string | null;
  provenance: ChanakyaCreditFactProvenance[];
}

export interface ChanakyaCreditSynthesisAdvisory {
  state: ChanakyaCreditSynthesisAdvisoryState;
  summary: string;
  provenance: string[];
}

/** Full credit synthesis — consumes existing SSOT outputs; does not duplicate formulas. */
export interface ChanakyaCreditSynthesisContext {
  readOnly: true;
  /** Not lender-facing in this sprint. */
  internalOnly: true;
  opportunityId: string;
  opportunityNumber: string | null;
  compiledAt: string;
  creditProfile: {
    borrowerProfile: ChanakyaCreditProfileSection;
    transactionRequirement: ChanakyaCreditProfileSection;
    businessProfile: ChanakyaCreditProfileSection;
    financialProfile: ChanakyaCreditProfileSection;
    bankingProfile: ChanakyaCreditProfileSection;
    gstProfile: ChanakyaCreditProfileSection;
    propertySecurityProfile: ChanakyaCreditProfileSection;
    commercialAccountingProfile: ChanakyaCreditProfileSection;
    documentCompleteness: ChanakyaCreditProfileSection;
    changeAttentionContext: ChanakyaCreditProfileSection;
  };
  financialAssessment: ChanakyaCreditFinancialAssessmentObservations;
  reconciliation: ChanakyaCreditReconciliation;
  keyPositives: ChanakyaCreditEvidenceItem[];
  rankedConcerns: ChanakyaCreditRankedConcern[];
  mitigants: ChanakyaCreditEvidenceItem[];
  internalRecommendations: ChanakyaCreditInternalRecommendation[];
  advisoryAssessment: ChanakyaCreditSynthesisAdvisory;
  /** Source credit intelligence (SSOT — not recomputed). */
  sourceCreditIntelligence: Pick<
    ChanakyaCreditIntelligenceContext,
    | "availability"
    | "financialProfile"
    | "financialTrends"
    | "bankingAnalysis"
    | "gstAnalysis"
    | "creditRatios"
  >;
  limitations: string[];
  provenance: string[];
}

export type ChanakyaCreditSynthesisInput = {
  opportunityId: string;
  opportunityNumber?: string | null;
  creditIntelligence: ChanakyaCreditIntelligenceContext;
  documentSummary?: {
    documentsReviewed: number;
    documentsWithReadableText: number;
    documentsRequiringOcr: number;
    structuredFactCount: number;
    metadataOnlyBankStatements?: number;
  };
  attentionSummary?: string | null;
  changeSummary?: string | null;
  commercialSummary?: string | null;
  borrowerLabel?: string | null;
  productLabel?: string | null;
  requestedAmount?: number | null;
  transactionType?: string | null;
  limitations?: string[];
};
