/**
 * CO-CHANAKYA-CREDIT-PROPOSAL-002 — Phase 0 constants.
 */

import type {
  ChanakyaCreditProposalSectionId,
  ChanakyaCreditProposalStageId,
} from "@/types/chanakya-credit-proposal";

export const CHANAKYA_CREDIT_PROPOSAL_SPRINT =
  "CO-CHANAKYA-CREDIT-PROPOSAL-002" as const;

export const CHANAKYA_CREDIT_PROPOSAL_STREAM_PATH =
  "/api/chanakya/credit-proposal/stream" as const;

/** Frozen read-only boundary for Phase 0/1. */
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
} as const;

export const CHANAKYA_CREDIT_PROPOSAL_STAGES: Array<{
  id: ChanakyaCreditProposalStageId;
  label: string;
}> = [
  { id: "review_transaction", label: "Reviewing transaction context" },
  { id: "review_documents", label: "Reviewing available documents" },
  { id: "review_credit_workbench", label: "Reviewing Credit Workbench information" },
  { id: "review_lender_product", label: "Reviewing lender/program context" },
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
  { id: "document_readiness", title: "6. Document Readiness" },
  { id: "credit_observations", title: "7. Credit Observations" },
  { id: "strengths", title: "8. Strengths" },
  { id: "key_considerations", title: "9. Key Considerations" },
  { id: "proposed_structure", title: "10. Proposed Structure" },
  { id: "recommendation", title: "11. Recommendation" },
];

export const CHANAKYA_CREDIT_PROPOSAL_UNAVAILABLE =
  "Not available in Catalyst One for this transaction yet." as const;

export const CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE =
  "Structured document extraction (P&L, Balance Sheet, Bank Statement, ITR, GST) is not yet available. Document presence is reported without inventing financial values." as const;
