/**
 * CO-SPRINT-114 — Enterprise Document Registry (transaction documents).
 * Metadata SSOT; binary content stored via blob-store (IndexedDB).
 */

export type DocumentRegistryStatus = "active" | "archived" | "deleted";

export interface DocumentEntityLinks {
  loanFileId?: string;
  customerId?: string;
  contactId?: string;
  opportunityId?: string;
  lenderId?: string;
  /**
   * CO-ARCH — Applicant Documents: LoanParticipant.id.
   * Omitted / empty for Shared Opportunity Documents.
   */
  participantId?: string;
  /** CO-ARCH — applicant | shared | lender (BAT #23) */
  documentScope?: "applicant" | "shared" | "lender";
  /** Canonical Enterprise Deal id when the record is Deal / lender-specific. */
  dealId?: string;
  /** Company registry id for business/entity-owned documents. */
  companyId?: string;
  /** Assigned employee / owner user id (display only — not a second store). */
  ownerUserId?: string;
  /** CO-DOC-003 — Document Package id when uploaded via Folder Upload. */
  packageId?: string;
  /** CO-DOC-003 — path inside the package (relative to folder root). */
  packageRelativePath?: string;
}

export interface DocumentRegistryVersion {
  id: string;
  version: number;
  /** Preserved original upload filename. */
  originalFilename: string;
  /** User-facing display name (rename updates this only). */
  displayName: string;
  fileSizeBytes: number;
  mimeType: string;
  blobId: string;
  uploadedBy: string;
  uploadedAt: string;
  isCurrent: boolean;
}

/**
 * Ingestion channel on the Enterprise Document Registry (single store).
 * CO-DOC-ARCH-001 business channels map here — see `src/constants/document-intake/`:
 * WALK_IN → manual_upload · DIRECT → customer_portal · WEALTH_PARTNER → wealth_partner
 */
export type DocumentRegistryUploadSource =
  | "customer_portal"
  | "lender_portal"
  | "manual_upload"
  | "email"
  | "whatsapp"
  | "api"
  /** CO-DOC-003 — file ingested as part of a Document Package (folder upload). */
  | "folder_package"
  /** CO-VOICE-002 — ECIE Activity Composer audio capture. */
  | "conversation_activity"
  /** CO-DOC-ARCH-001 / Partner Gateway — Wealth Partner App intake. */
  | "wealth_partner";

export interface DocumentRegistryRecord {
  id: string;
  /** EDIE checklist type reference, e.g. doc:pan */
  typeRef: string;
  categoryLabel: string;
  originalFilename: string;
  displayName: string;
  status: DocumentRegistryStatus;
  links: DocumentEntityLinks;
  versions: DocumentRegistryVersion[];
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  version: number;
  fileSizeBytes: number;
  mimeType: string;
  /**
   * Ingestion channel — same Enterprise Document Repository for all sources.
   * Document Requests (workflow) never owns storage; it only records this metadata.
   */
  uploadSource?: DocumentRegistryUploadSource;
  /** BAT #23 — RM review stamp on Deal / Lender Documents (View Mode). */
  verifiedAt?: string;
  verifiedBy?: string;
  /**
   * Document Workspace review stamp (local + snapshot). Durable Postgres
   * continues to use verifiedAt / verifiedBy — no production migration.
   */
  reviewStatus?:
    | "pending"
    | "received"
    | "under_review"
    | "accepted"
    | "rejected"
    | "expired"
    | "replacement_requested";
  reviewRemarks?: string;
  validityUntil?: string;
}

export interface DocumentRegistryFilters {
  query: string;
  status: DocumentRegistryStatus | "all";
  typeRef: string | "all";
  uploadedBy: string | "all";
}

export interface DocumentUploadInput {
  file: File;
  typeRef: string;
  categoryLabel: string;
  uploadedBy: string;
  uploadedByUserId?: string;
  links: DocumentEntityLinks;
  /** When replacing an existing registry record. */
  replaceRecordId?: string;
  /** Ingestion channel (defaults to manual_upload when omitted). */
  uploadSource?: DocumentRegistryUploadSource;
}

export interface DocumentRegistrySnapshot {
  records: DocumentRegistryRecord[];
  schemaVersion: 1;
}

export type DocumentUploadProgress = {
  phase: "reading" | "storing" | "complete" | "error";
  percent: number;
  message?: string;
};
