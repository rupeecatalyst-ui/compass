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
