/**
 * Opportunity Document Requests — constants (workflow only).
 */

export const DOCUMENT_REQUESTS_STORAGE_KEY = "catalyst.opportunity.document-requests.v1";
export const DOCUMENT_REQUESTS_UPDATED_EVENT = "catalyst:document-requests-updated";

/** Default upload-link expiry (days). */
export const DOCUMENT_REQUEST_LINK_EXPIRY_DAYS = 14;

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

Team Rupee Catalyst`;
}

export function buildDocumentRequestWhatsAppBody(vars: {
  customerName: string;
  loanProduct: string;
  uploadUrl: string;
}): string {
  return `Hi ${vars.customerName}, your personalised document list for ${vars.loanProduct} is ready. Upload securely: ${vars.uploadUrl}`;
}
