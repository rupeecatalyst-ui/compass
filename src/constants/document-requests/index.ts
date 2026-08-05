/**
 * Opportunity Document Requests — constants (workflow only).
 * CO-ECC-001 — Outbound email identity resolves via Communication Profile CUSTOMERS
 * (event: document_request). Templates must not embed a From: address.
 */

import { ECC_EMAIL_TEMPLATE_PROFILE_REFS } from "@/constants/enterprise-communication-center";
import { getCommunicationProfileSeed } from "@/constants/enterprise-communication-center/profiles";

/** Template → Communication Profile binding (never a literal sender email). */
export const DOCUMENT_REQUEST_COMMUNICATION_REF =
  ECC_EMAIL_TEMPLATE_PROFILE_REFS.document_request_customer;

export const DOCUMENT_REQUESTS_STORAGE_KEY = "catalyst.opportunity.document-requests.v1";
export const DOCUMENT_REQUESTS_UPDATED_EVENT = "catalyst:document-requests-updated";

/** Default upload-link expiry (days). */
export const DOCUMENT_REQUEST_LINK_EXPIRY_DAYS = 14;

/** Portal session audit storage (extends Document Requests — not a document DB). */
export const DOCUMENT_REQUEST_SESSION_AUDIT_KEY =
  "catalyst.opportunity.document-requests.session-audit.v1";

export const CUSTOMER_PORTAL_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.zip,application/pdf,image/jpeg,image/png";

/** Preferred submission methods — upload portal is primary. */
export const CUSTOMER_PORTAL_DEFAULT_STAGE = "Document Collection";
export const CUSTOMER_PORTAL_DEFAULT_APPLICATION_STATUS = "Documents Requested";

/**
 * CO-DOC-001 Phase 1 BAT — Product × Borrower × Constitution combinations
 * ready for manual LOD generation from Opportunity Creation.
 */
export const CO_DOC_001_PHASE1_BAT_SCENARIOS = [
  { product: "Home Loan", borrower: "Salaried", constitution: null },
  { product: "Home Loan", borrower: "Self-employed", constitution: "Proprietorship" },
  { product: "Home Loan", borrower: "Self-employed", constitution: "Partnership" },
  { product: "Home Loan", borrower: "Self-employed", constitution: "LLP" },
  { product: "Home Loan", borrower: "Self-employed", constitution: "Private Limited" },
  { product: "Home Loan Balance Transfer", borrower: "Salaried", constitution: null },
  { product: "Home Loan Balance Transfer", borrower: "Self-employed", constitution: "Proprietorship" },
  { product: "Loan Against Property", borrower: "Salaried", constitution: null },
  { product: "Loan Against Property", borrower: "Self-employed", constitution: "Proprietorship" },
  { product: "Personal Loan", borrower: "Salaried", constitution: null },
  { product: "Education Loan", borrower: "Salaried", constitution: null },
  { product: "Car Loan", borrower: "Salaried", constitution: null },
  { product: "Gold Loan", borrower: "Salaried", constitution: null },
  { product: "Loan Against Securities", borrower: "Salaried", constitution: null },
  { product: "Unsecured Business Loan", borrower: "Self-employed", constitution: "Proprietorship" },
] as const;

export const DOCUMENT_REQUEST_EMAIL_SUBJECT =
  "Documents Required for Your {{Loan Product}} Application";

export function buildDocumentRequestEmailBody(vars: {
  customerName: string;
  loanProduct: string;
  borrowerType: string;
  constitution: string;
  opportunityReference: string;
  uploadUrl: string;
}): string {
  const customersProfile = getCommunicationProfileSeed(
    DOCUMENT_REQUEST_COMMUNICATION_REF.profileCode,
  );
  return `Dear ${vars.customerName}

Application Summary
Loan Product: ${vars.loanProduct}
Borrower Type: ${vars.borrowerType}
Business Constitution: ${vars.constitution}
Opportunity Reference: ${vars.opportunityReference}

Thank you for choosing Rupee Catalyst.

Based on your requirement, we have prepared your personalised List of Required Documents (LOD).

----------------------------------------
Preferred Submission Method

Please upload your documents using the secure link below.

[ Upload Documents Securely ]
${vars.uploadUrl}

This is the fastest and most secure way for us to process your application.

----------------------------------------
Alternative Submission Methods

If convenient, you may also

• Reply to this email with document attachments

OR

• Send your documents to your Relationship Manager through WhatsApp.

Documents received through these channels will also be attached to your Opportunity after processing.

----------------------------------------

Thank you.

${customersProfile.signature}
${customersProfile.footer}`;
}

export function buildDocumentRequestWhatsAppBody(vars: {
  customerName: string;
  loanProduct: string;
  uploadUrl: string;
}): string {
  return `Hi ${vars.customerName}, your personalised document list for ${vars.loanProduct} is ready. Upload securely: ${vars.uploadUrl}`;
}
