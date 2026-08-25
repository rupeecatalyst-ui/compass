/**
 * CO-CHANAKYA-CREDIT-WORKBENCH-004 — Evidence-first Credit Proposal constants.
 */

import type {
  ChanakyaCreditProposalSectionId,
  ChanakyaCreditProposalStageId,
  ChanakyaEvidenceVisibilityLevel,
} from "@/types/chanakya-credit-proposal";

export const CHANAKYA_CREDIT_PROPOSAL_SPRINT =
  "CO-CHANAKYA-CREDIT-WORKBENCH-004" as const;

export const CHANAKYA_CREDIT_PROPOSAL_STREAM_PATH =
  "/api/chanakya/credit-proposal/stream" as const;

/** Frozen read-only boundary. */
export const CHANAKYA_CREDIT_PROPOSAL_BOUNDARY = {
  may: [
    "read",
    "analyse",
    "summarize",
    "compare",
    "identify_exceptions",
    "prioritize",
    "recommend",
    "generate_draft",
  ] as const,
  mustNot: [
    "create_transactions",
    "edit_transactions",
    "delete_records",
    "change_stages",
    "assign_rms",
    "change_lenders",
    "upload_documents",
    "delete_documents",
    "modify_financial_data",
    "modify_credit_workbench_data",
    "send_proposal",
    "send_email",
    "trigger_workflows",
  ] as const,
  autoSendForbidden: true,
  chainOfThoughtForbidden: true,
  proposalReadinessDoesNotBlock: true,
  internalRecommendationsNeverAutoSend: true,
} as const;

export const CHANAKYA_CREDIT_PROPOSAL_STAGES: Array<{
  id: ChanakyaCreditProposalStageId;
  label: string;
}> = [
  { id: "review_transaction", label: "Transaction information reviewed" },
  { id: "review_documents", label: "Available documents read / reviewed" },
  { id: "review_credit_workbench", label: "Credit Workbench information reviewed" },
  { id: "review_lender_product", label: "Lender / product context reviewed" },
  { id: "prepare_assessment", label: "Preparing credit assessment" },
  { id: "write_proposal", label: "Writing proposal" },
];

export const CHANAKYA_CREDIT_PROPOSAL_SECTIONS: Array<{
  id: ChanakyaCreditProposalSectionId;
  title: string;
}> = [
  { id: "executive_summary", title: "1. Executive Summary" },
  { id: "borrower_overview", title: "2. Borrower / Business Overview" },
  { id: "loan_requirement", title: "3. Loan Requirement" },
  { id: "business_overview", title: "4. Business / Transaction Overview" },
  { id: "stated_financial", title: "5. Available Financial / Stated Information" },
  { id: "document_readiness", title: "6. Document Inventory (Presence)" },
  { id: "property_security", title: "7. Property / Security" },
  { id: "credit_observations", title: "8. Credit Observations" },
  { id: "strengths", title: "9. Key Positives" },
  { id: "key_considerations", title: "10. Key Concerns / Limitations" },
  { id: "proposed_structure", title: "11. Proposed Facility" },
  { id: "recommendation", title: "12. Recommendation" },
];

export const CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE =
  "Not available in Catalyst One for this transaction yet." as const;

export const CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE =
  "Structured document extraction (P&L, Balance Sheet, Bank Statement, ITR, GST) is not yet available. Document presence is reported without inventing financial values." as const;

export const CHANAKYA_EVIDENCE_VISIBILITY_LABEL: Record<
  ChanakyaEvidenceVisibilityLevel,
  string
> = {
  strong: "Strong",
  good: "Good",
  moderate: "Moderate",
  limited: "Limited",
  none: "None",
};

export const CHANAKYA_PROPOSAL_READINESS_CAPABILITY_NOTE =
  "Proposal Readiness reflects the evidence base available to CHANAKYA (transaction data + document presence). It is not a lender approval probability. Financial statement, banking, and OCR content extraction are not yet available — visibility levels therefore emphasise presence and transaction coverage, not extracted figures." as const;
