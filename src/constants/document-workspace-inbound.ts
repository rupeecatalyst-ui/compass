/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014D
 * Inbound classification vocabulary and customer-facing checklist copy.
 * Does not invent AI confidence scores. Unknown stays unknown.
 */

export const DOCUMENT_WORKSPACE_REFINEMENT_014D_ID =
  "CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014D" as const;

export const DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES = {
  CLASSIFIED_AUTOMATICALLY: "classified_automatically",
  SUGGESTED_REVIEW_REQUIRED: "suggested_classification_review_required",
  UNCLASSIFIED_REVIEW_REQUIRED: "unclassified_review_required",
  REJECTED_FILE_SECURITY: "rejected_by_file_security_policy",
  DUPLICATE_CANDIDATE: "duplicate_candidate",
  ATTACHED_MANUALLY: "attached_manually",
  IGNORED: "ignored",
} as const;

export type DocumentWorkspaceInboundClassificationOutcome =
  (typeof DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES)[keyof typeof DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_OUTCOMES];

export const DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS = {
  CONVERSATION_THREAD: "conversation_thread",
  SECURE_REQUEST_ID: "secure_request_identifier",
  OPPORTUNITY_DEAL_REFERENCE: "opportunity_deal_reference",
  CONTACT_COMPANY_RELATIONSHIP: "contact_company_relationship",
  SENDER_LINKED_TRANSACTION: "sender_linked_transaction",
  FILENAME_METADATA: "filename_document_metadata",
  MANUAL_REVIEW: "manual_review",
} as const;

export type DocumentWorkspaceInboundClassificationMethod =
  (typeof DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS)[keyof typeof DOCUMENT_WORKSPACE_INBOUND_CLASSIFICATION_METHODS];

/** Deterministic evidence bands — never a fabricated numeric AI score. */
export const DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS = {
  AUTOMATIC: "automatic",
  REVIEW_REQUIRED: "review_required",
  NONE: "none",
} as const;

export type DocumentWorkspaceInboundConfidenceBand =
  (typeof DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS)[keyof typeof DOCUMENT_WORKSPACE_INBOUND_CONFIDENCE_BANDS];

export const DOCUMENT_WORKSPACE_INCOMPLETE_PROGRAMME_DISCLAIMER =
  "Additional documents may be required after specialist review.";

export const DOCUMENT_WORKSPACE_RECEIVED_FROM_EMAIL_LABEL = "Received from Email";
export const DOCUMENT_WORKSPACE_NEW_FROM_EMAIL_FILTER_LABEL = "New from Email";
export const DOCUMENT_WORKSPACE_WHATSAPP_MOBILE_MISSING =
  "WhatsApp handoff is blocked: the authorised Contact does not have a valid mobile number.";
export const DOCUMENT_WORKSPACE_WHATSAPP_FORGED_MOBILE =
  "WhatsApp handoff is blocked: the mobile number must come from the authorised transaction Contact.";
export const DOCUMENT_WORKSPACE_WHATSAPP_NOT_DELIVERED =
  "WhatsApp was opened for sending. Catalyst One does not record the message as sent or delivered.";
export const DOCUMENT_WORKSPACE_EMAIL_NOT_SENT =
  "The message was queued in the operational Outbox. It has not been sent.";
export const DOCUMENT_WORKSPACE_REVIEW_REASON_REQUIRED =
  "A reason is required to reassign, mark as duplicate, or ignore this attachment.";
export const DOCUMENT_WORKSPACE_OTHER_REQUIRES_CONFIRMATION =
  "Other may be selected only when an authorised employee confirms it, or when a verified programme/LOD requirement uses that category.";
export const DOCUMENT_WORKSPACE_REASSIGNMENT_DENIED =
  "This attachment cannot be moved to another transaction from Document Workspace.";

export const DOCUMENT_WORKSPACE_CHECKLIST_BRAND = "Rupee Catalyst";
export const DOCUMENT_WORKSPACE_CHECKLIST_INSTRUCTION =
  "Please reply to this message or share the listed documents through the approved channel used by your specialist.";
export const DOCUMENT_WORKSPACE_CHECKLIST_SPECIALIST_NOTE =
  "Your specialist remains the point of contact for this request.";
export const DOCUMENT_WORKSPACE_CHECKLIST_NO_PROMISE =
  "This is a document request only. It is not a lender approval, eligibility, pricing, or timeline commitment.";

export const DOCUMENT_WORKSPACE_REQUESTABLE_STATUSES = [
  "pending",
  "rejected",
  "expired",
  "replacement_requested",
] as const;

export type DocumentWorkspaceRequestableStatus =
  (typeof DOCUMENT_WORKSPACE_REQUESTABLE_STATUSES)[number];
