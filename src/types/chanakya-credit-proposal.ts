/**
 * CO-CHANAKYA-CREDIT-PROPOSAL-002 / CO-CHANAKYA-CREDIT-WORKBENCH-004
 * Evidence-first Credit Proposal contracts.
 * Read-only CHANAKYA Credit Proposal — no mutations / no auto-send.
 */

/** Explicit evidence provenance — never silently merge sources. */
export type ChanakyaCreditProposalEvidenceSource =
  | "transaction" // SOURCE 1 — Catalyst One Opportunity / customer SSOT
  | "documents" // SOURCE 2 — uploaded/verified document presence (not content values)
  | "edie_facts" // SOURCE 3 — structured EDIE facts (future; unused until extraction exists)
  | "credit_workbench" // SOURCE 4 — stated verification from Credit Workbench
  | "lender_product" // SOURCE 5 — lender/program/product context
  | "external_research" // SOURCE 6 — controlled web research (future)
  | "rm_note" // USER-PROVIDED context — never treat as document evidence
  | "chanakya_inference"; // advisory wording only — never invents numbers

export type ChanakyaCreditProposalSectionId =
  | "executive_summary"
  | "borrower_overview"
  | "loan_requirement"
  | "business_overview"
  | "stated_financial"
  | "document_readiness"
  | "property_security"
  | "credit_observations"
  | "strengths"
  | "key_considerations"
  | "proposed_structure"
  | "recommendation";

export type ChanakyaCreditProposalStageId =
  | "review_transaction"
  | "review_documents"
  | "review_credit_workbench"
  | "review_lender_product"
  | "prepare_assessment"
  | "write_proposal";

export type ChanakyaCreditProposalStageStatus =
  | "pending"
  | "active"
  | "completed"
  | "skipped";

/** Qualitative evidence strength — used when numeric scores cannot be reliable. */
export type ChanakyaEvidenceVisibilityLevel =
  | "strong"
  | "good"
  | "moderate"
  | "limited"
  | "none";

export interface ChanakyaCreditProposalEvidenceItem {
  id: string;
  source: ChanakyaCreditProposalEvidenceSource;
  label: string;
  value: string;
  /** True when value is authoritative SSOT; false when unavailable / reserved. */
  available: boolean;
}

export interface ChanakyaCreditProposalSection {
  id: ChanakyaCreditProposalSectionId;
  title: string;
  body: string;
  evidenceSources: ChanakyaCreditProposalEvidenceSource[];
  /** When false, section is omitted from lender-facing draft (adaptive template). */
  included: boolean;
}

/**
 * INTERNAL — Proposal Readiness (evidence base strength).
 * Never presented as lender approval probability.
 */
export interface ChanakyaProposalEvidenceReadiness {
  /** Qualitative overall — preferred until extraction engines exist. */
  overall: ChanakyaEvidenceVisibilityLevel;
  /** Optional numeric only when derived from real evidence rules (not fabricated). */
  scoreOutOf100: number | null;
  evidenceCoverage: ChanakyaEvidenceVisibilityLevel;
  financialVisibility: ChanakyaEvidenceVisibilityLevel;
  bankingVisibility: ChanakyaEvidenceVisibilityLevel;
  propertyVisibility: ChanakyaEvidenceVisibilityLevel;
  businessVisibility: ChanakyaEvidenceVisibilityLevel;
  /** Honest capability note for the current phase. */
  capabilityNote: string;
  /** Never blocks MAKE PROPOSAL. */
  blocksProposal: false;
  summary: string;
}

export interface ChanakyaInternalStrengtheningRecommendation {
  id: string;
  title: string;
  reason: string;
  /** Document category hint — never auto-sent to lenders. */
  categoryHint?: string;
}

/**
 * INTERNAL CHANAKYA intelligence — Catalyst One user only.
 * Must never flow into lender email / PDF / Send to Lender.
 * Document text excerpts are NOT included here (server-side only).
 */
export interface ChanakyaCreditProposalDocumentReadingSummary {
  documentsReviewed: number;
  documentsWithBinary: number;
  documentsWithReadableText: number;
  documentsRequiringOcr: number;
  documentsRequiringVision: number;
  structuredFactsCount: number;
  crossDocumentComparisonsCount: number;
  visionConfigured: boolean;
  capabilityNote: string;
  reads: Array<{
    documentId: string;
    displayName: string;
    typeRef: string;
    familyHint: string;
    status: string;
    extractionMethod: string;
    hasBinary: boolean;
    textCharCount: number;
    limitation: string | null;
  }>;
  /** Labels only — no raw document text. */
  extractedFactSummaries: Array<{
    key: string;
    label: string;
    value: string;
    periodLabel: string | null;
    documentName: string;
    confidence: string;
  }>;
}

export interface ChanakyaCreditProposalInternalIntelligence {
  readiness: ChanakyaProposalEvidenceReadiness;
  rmNote: string | null;
  recommendations: ChanakyaInternalStrengtheningRecommendation[];
  limitations: string[];
  documentPresenceSummary: string;
  documentReading: ChanakyaCreditProposalDocumentReadingSummary | null;
  /** True when any native/PDF-layer text was actually read (not OCR/table facts). */
  nativeDocumentTextAvailable: boolean;
  /** Structured EDIE/financial facts from readable text (not OCR-invented). */
  structuredFinancialFactsAvailable: boolean;
  contentExtractionAvailable: boolean;
  webResearchAvailable: false;
  financialEnginesAvailable: false;
}

/**
 * Extends Phase 5 draft foundation with sectioned lender-facing body.
 * Not durable in Phase 1 — streamed session draft only.
 */
export interface ChanakyaCreditProposalDraft {
  draftId: string;
  opportunityId: string;
  opportunityNumber: string | null;
  productName: string;
  loanAmount: number;
  status: "draft";
  /** Outbound email always owned by Catalyst One — never auto-sent. */
  emailOutboundOwner: "catalyst_one";
  readOnly: true;
  autoSendForbidden: true;
  sections: ChanakyaCreditProposalSection[];
  /** Full markdown/text assembled from included lender-facing sections only. */
  fullText: string;
  evidence: ChanakyaCreditProposalEvidenceItem[];
  /** Lender-facing gaps only — never internal upload recommendations. */
  gaps: string[];
  generatedAt: string;
}

export type ChanakyaCreditProposalStreamEvent =
  | {
      type: "stage";
      stageId: ChanakyaCreditProposalStageId;
      label: string;
      status: ChanakyaCreditProposalStageStatus;
    }
  | {
      type: "intelligence";
      intelligence: ChanakyaCreditProposalInternalIntelligence;
    }
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "draft";
      draft: ChanakyaCreditProposalDraft;
    }
  | {
      type: "done";
      draftId: string;
    }
  | {
      type: "error";
      code: string;
      message: string;
    };

/** Client → orchestrator request. */
export interface ChanakyaCreditProposalStreamRequest {
  opportunityId: string;
  /**
   * RM / Credit Officer note to CHANAKYA — user-provided context only.
   * Never treat as document-derived fact.
   */
  rmNote?: string | null;
  stated?: {
    statedIncomeMonthly?: string;
    statedObligations?: string;
    statedTurnover?: string;
    statedBusinessVintage?: string;
    statedNatureOfBusiness?: string;
    statedConstitution?: string;
    statedPropertyType?: string;
    statedPropertyValue?: string;
    statedPropertyLocation?: string;
    notes?: string;
  };
  /** Display-only lender name already resolved in CW (SOURCE 5 hint). */
  lenderName?: string | null;
  /**
   * Optional client document checklist presence (filename/status only).
   * Never used as extracted financial values.
   */
  documentPresence?: Array<{
    name: string;
    status: string;
    typeRef?: string;
  }>;
}
