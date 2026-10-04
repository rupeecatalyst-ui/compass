/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014
 * Contact-centric registry with a right-side document desk. Registry remains SSOT.
 */

export const DOCUMENT_WORKSPACE_REFINEMENT_014_ID =
  "CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014" as const;

/** Desktop desk starts at this viewport width (px). */
export const DOCUMENT_WORKSPACE_DESK_BREAKPOINT_PX = 1280;
export const DOCUMENT_WORKSPACE_DESK_DESKTOP_MIN_VW = 50;
export const DOCUMENT_WORKSPACE_DESK_DESKTOP_TARGET_VW = 55;
export const DOCUMENT_WORKSPACE_DESK_DESKTOP_MAX_VW = 60;
export const DOCUMENT_WORKSPACE_DESK_DESKTOP_MAX_REM = 72;
export const DOCUMENT_WORKSPACE_DESK_TABLET_MIN_VW = 70;
export const DOCUMENT_WORKSPACE_DESK_TABLET_TARGET_VW = 80;
export const DOCUMENT_WORKSPACE_DESK_TABLET_MAX_VW = 85;

/** Canonical Sheet width contract. Literal classes required for Tailwind JIT. */
export const DOCUMENT_WORKSPACE_DESK_SHEET_CLASSNAME =
  "flex h-full w-full flex-col gap-0 overflow-x-hidden p-0 sm:max-w-none md:w-[80vw] md:min-w-[70vw] md:max-w-[85vw] min-[1280px]:w-[55vw] min-[1280px]:min-w-[50vw] min-[1280px]:max-w-[min(60vw,72rem)]";

export const DOCUMENT_WORKSPACE_DESK_PREVIEW_SPLIT_CLASSNAME =
  "flex min-h-0 flex-1 flex-col overflow-hidden md:flex-col min-[1280px]:grid min-[1280px]:grid-cols-2";

export const DOCUMENT_WORKSPACE_DESK_PREVIEW_ACTION_CLASSNAME =
  "flex min-h-0 flex-1 flex-col overflow-hidden min-[1280px]:grid min-[1280px]:grid-cols-[minmax(10rem,22%)_minmax(0,1fr)_minmax(14rem,22%)]";

export const DOCUMENT_WORKSPACE_DESK_LIST_ACTION_CLASSNAME =
  "flex min-h-0 flex-1 overflow-hidden min-[1280px]:grid min-[1280px]:grid-cols-[minmax(0,1fr)_minmax(14rem,24%)]";

export const DOCUMENT_WORKSPACE_CLOSE_DESK_LABEL = "Close";
export const DOCUMENT_WORKSPACE_DESK_DIALOG_TITLE = "Document Workspace";
export const DOCUMENT_WORKSPACE_DESK_DIALOG_DESCRIPTION =
  "Documents for the selected contact and transaction. The registry remains behind this desk.";

export const DOCUMENT_WORKSPACE_NO_CO_APPLICANT = "No co-applicant added";
export const DOCUMENT_WORKSPACE_LINKED_PARTIES_LABEL = "Linked Parties";
export const DOCUMENT_WORKSPACE_SHARED_CONTEXT_LABEL = "Shared Transaction Documents";
export const DOCUMENT_WORKSPACE_PROPERTY_CONTEXT_LABEL = "Property / Security Documents";
export const DOCUMENT_WORKSPACE_NEW_FROM_EMAIL_BADGE = "New from Email";
export const DOCUMENT_WORKSPACE_MARK_AS_SEEN_LABEL = "Mark as seen";
export const DOCUMENT_WORKSPACE_OTP_DELIVERY_ENV = "DOCUMENT_WORKSPACE_OTP_DELIVERY_ENABLED";
export const DOCUMENT_WORKSPACE_UPLOAD_DEFAULT_DAYS = 14;
export const DOCUMENT_WORKSPACE_OTP_TTL_MS = 10 * 60 * 1000;
export const DOCUMENT_WORKSPACE_OTP_MAX_ATTEMPTS = 5;
export const DOCUMENT_WORKSPACE_OTP_RATE_LIMIT_MS = 60 * 1000;
export const DOCUMENT_WORKSPACE_ZIP_MAX_BYTES = 50 * 1024 * 1024;
export const DOCUMENT_WORKSPACE_MANIFEST_FILENAME = "DOCUMENT-VERSION-MANIFEST.json";
export const DOCUMENT_WORKSPACE_SENDER_CC_MISSING =
  "Queue/Send is blocked: the authenticated user's canonical email is missing or invalid.";
