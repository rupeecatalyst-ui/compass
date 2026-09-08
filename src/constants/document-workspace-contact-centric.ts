/**
 * CO-C1-DOCUMENT-WORKSPACE-CONTACT-CENTRIC-013
 * Contact-centric opening screen + context-locked desk copy.
 * Enterprise Document Registry remains the only document SSOT.
 */

export const DOCUMENT_WORKSPACE_REFINEMENT_ID =
  "CO-C1-DOCUMENT-WORKSPACE-CONTACT-CENTRIC-013" as const;

export const DOCUMENT_WORKSPACE_OPEN_CONTACT_LABEL = "Open Contact";
export const DOCUMENT_WORKSPACE_VIEW_DOCUMENTS_LABEL = "View Documents";

export const DOCUMENT_WORKSPACE_DESK_MIN_VW = 50;
export const DOCUMENT_WORKSPACE_OTHER_DOCUMENTS_LABEL = "Other Documents";
export const DOCUMENT_WORKSPACE_FOLDER_UPLOAD_LABEL = "Folder Upload";
export const DOCUMENT_WORKSPACE_ADD_DOCUMENT_LABEL = "Add Document";
export const DOCUMENT_WORKSPACE_EMAIL_DOCUMENT_LABEL = "Email Document";
export const DOCUMENT_WORKSPACE_MARK_RECEIVED_LABEL = "Mark Received";
export const DOCUMENT_WORKSPACE_INTERNAL_NOTE_LABEL = "Add internal note";
export const DOCUMENT_WORKSPACE_ATTACH_INBOUND_LABEL = "Attach inbound document";

export const DOCUMENT_WORKSPACE_REMOVE_CONFIRM =
  "Remove this document from the locked transaction? The registry record is marked deleted and audit history is preserved. This does not change stage or assignment.";

export const DOCUMENT_WORKSPACE_REPLACE_REASON_REQUIRED =
  "A replacement reason is required before a new version is stored.";

export const DOCUMENT_WORKSPACE_EMAIL_CONFIRM =
  "Queue this document email to Outbox for the selected transaction recipient? Live send is not authorised from this desk.";

export const DOCUMENT_WORKSPACE_RECENT_MS = 30 * 24 * 60 * 60 * 1000;
