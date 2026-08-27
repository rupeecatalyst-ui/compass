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
  { id: "borrower_profile", title: "2. Borrower Profile" },
  { id: "business_overview", title: "3. Business Overview" },
  { id: "loan_requirement", title: "4. Facility / Loan Requirement" },
  { id: "facility_purpose", title: "5. Purpose of Facility" },
  { id: "financial_analysis", title: "6. Financial Analysis" },
  { id: "gst_analysis", title: "7. GST Analysis" },
  { id: "banking_analysis", title: "8. Banking Analysis" },
  { id: "credit_context", title: "9. Existing Obligations / Credit Context" },
  { id: "property_security", title: "10. Property / Security" },
  { id: "product_lender_context", title: "11. Product & Lender Context" },
  { id: "key_positives", title: "12. Key Positives" },
  { id: "key_concerns", title: "13. Key Concerns" },
  { id: "mitigants", title: "14. Mitigants" },
  { id: "pending_information", title: "15. Missing / Pending Information" },
  { id: "proposed_structure", title: "16. Proposed Facility" },
  { id: "recommendation", title: "17. Advisory Recommendation" },
  { id: "evidence_notes", title: "18. Source / Evidence Notes" },
];

export const CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE =
  "Not available in Catalyst One for this transaction yet." as const;

/** Lender-facing unavailable wording — professional, no platform metadata. */
export const CHANAKYA_LENDER_PROPOSAL_NOT_AVAILABLE =
  "Information was not available in the documents reviewed." as const;

export const CHANAKYA_LENDER_PROPOSAL_BANKING_LIMITATION =
  "Bank statement transaction content was not available for review — statements on file could not be read for banking analysis." as const;

export const CHANAKYA_LENDER_PROPOSAL_OCR_LIMITATION =
  "Certain scanned documents require optical character recognition before their financial content can be reviewed." as const;

export const CHANAKYA_LENDER_PROPOSAL_RATIO_LIMITATION =
  "FOIR, DSCR, and LTV ratios were not computed — no underwriting ratio engine was applied to this draft." as const;

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
