/**
 * CO-CHANAKYA-CREDIT-PROPOSAL-002 — Phase 0 contracts.
 * Read-only CHANAKYA Credit Proposal — no mutations / no auto-send.
 */

/** Explicit evidence provenance — never silently merge sources. */
export type ChanakyaCreditProposalEvidenceSource =
  | "transaction" // SOURCE 1 — Catalyst One Opportunity / customer SSOT
  | "documents" // SOURCE 2 — uploaded/verified document presence (not content values)
  | "edie_facts" // SOURCE 3 — structured EDIE facts (future; unused in Phase 1)
  | "credit_workbench" // SOURCE 4 — stated verification from Credit Workbench
  | "lender_product" // SOURCE 5 — lender/program/product context
  | "external_research" // SOURCE 6 — controlled web research (future)
  | "chanakya_inference"; // advisory wording only — never invents numbers

export type ChanakyaCreditProposalSectionId =
  | "executive_summary"
  | "borrower_overview"
  | "loan_requirement"
  | "business_overview"
  | "stated_financial"
  | "document_readiness"
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
  /** Full markdown/text assembled from sections. */
  fullText: string;
  evidence: ChanakyaCreditProposalEvidenceItem[];
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

/** Client → orchestrator request (stated fields are CW session inputs). */
export interface ChanakyaCreditProposalStreamRequest {
  opportunityId: string;
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
