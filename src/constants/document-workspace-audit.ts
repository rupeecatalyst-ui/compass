/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C
 * Append-only Document Workspace audit action codes.
 */

export const DOCUMENT_WORKSPACE_AUDIT_ACTIONS = {
  DOCUMENT_UPLOADED: "document_uploaded",
  CUSTOMER_PORTAL_UPLOAD: "customer_portal_upload",
  INBOUND_EMAIL_ACCEPTED: "inbound_email_attachment_accepted",
  INBOUND_ATTACHMENT_DETECTED: "inbound_attachment_detected",
  INBOUND_CLASSIFICATION_SUGGESTED: "inbound_classification_suggested",
  INBOUND_CLASSIFICATION_CONFIRMED: "inbound_classification_confirmed",
  INBOUND_CLASSIFICATION_CHANGED: "inbound_classification_changed",
  INBOUND_DUPLICATE_MARKED: "inbound_duplicate_marked",
  INBOUND_IGNORED: "inbound_ignored",
  INBOUND_ATTACHMENT_LINKED: "inbound_attachment_linked",
  DOCUMENT_VERSION_SEEN: "document_version_seen",
  CHECKLIST_GENERATED: "checklist_generated",
  SELECTION_REJECTED_VALIDATION: "selection_rejected_by_validation",
  WHATSAPP_HANDOFF_OPENED: "whatsapp_handoff_opened",
  WHATSAPP_HANDOFF_CANCELLED: "whatsapp_handoff_cancelled",
  EMAIL_PREPARATION_FAILED: "email_preparation_failed",
  DOCUMENT_VIEWED: "document_viewed",
  DOCUMENT_PREVIEWED: "document_previewed",
  DOCUMENT_DOWNLOADED: "document_downloaded",
  DOCUMENT_REPLACED: "document_replaced",
  DOCUMENT_STATUS_CHANGED: "document_status_changed",
  DOCUMENT_REVIEWED: "document_reviewed",
  DOCUMENT_ACCEPTED: "document_accepted",
  DOCUMENT_REJECTED: "document_rejected",
  DOCUMENT_MOVED_TO_DELETED: "document_moved_to_deleted",
  DOCUMENT_RESTORED: "document_restored",
  DOCUMENT_RESTORE_BLOCKED_NEWER: "document_restore_blocked_newer_version",
  DOCUMENT_ELIGIBLE_FOR_PURGE: "document_marked_eligible_for_purge",
  DOCUMENT_PERMANENTLY_PURGED: "document_permanently_purged",
  DOCUMENT_PURGE_REFUSED: "document_purge_refused",
  DOCUMENT_REQUEST_GENERATED: "document_request_generated",
  REQUEST_ITEM_CHANGED: "request_item_changed",
  UPLOAD_LINK_CREATED: "upload_link_created",
  UPLOAD_LINK_REVOKED: "upload_link_revoked",
  OTP_CHALLENGE_CREATED: "otp_challenge_created",
  OTP_VERIFICATION_SUCCESS: "otp_verification_success",
  OTP_VERIFICATION_FAILURE: "otp_verification_failure",
  OTP_VERIFICATION_LOCK: "otp_verification_lock",
  EMAIL_CHECKLIST_PREPARED: "email_checklist_prepared",
  EMAIL_QUEUED: "email_queued",
  WHATSAPP_CHECKLIST_PREPARED: "whatsapp_checklist_prepared",
  WHATSAPP_CHECKLIST_SHARED: "whatsapp_checklist_shared",
  ZIP_PREPARED: "zip_prepared",
  ZIP_DOWNLOADED: "zip_downloaded",
  SELECTION_REJECTED_CROSS_TRANSACTION: "selection_rejected_cross_transaction",
  UPLOAD_PORTAL_THROTTLED: "upload_portal_throttled",
} as const;

export type DocumentWorkspaceAuditAction =
  (typeof DOCUMENT_WORKSPACE_AUDIT_ACTIONS)[keyof typeof DOCUMENT_WORKSPACE_AUDIT_ACTIONS];

export const DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE = "employee";
export const DOCUMENT_WORKSPACE_AUDIT_ACTOR_CUSTOMER = "customer";
export const DOCUMENT_WORKSPACE_AUDIT_ACTOR_SYSTEM = "system";

export const DOCUMENT_WORKSPACE_AUDIT_SENSITIVE_KEYS = [
  "otp",
  "otpHash",
  "otpValue",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "password",
  "secret",
  "credential",
  "contentBase64",
  "contentBytes",
  "bytes",
  "fileContent",
  "signedUrl",
  "signedURL",
  "storageSecret",
  "serviceRole",
  "email",
  "mobile",
  "phone",
] as const;
