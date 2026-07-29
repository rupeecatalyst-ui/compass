/**
 * CO-DOC-003 — Enterprise Document Package (folder upload) types.
 * Packages group Document Registry records; they are not a second document store.
 */

export type DocumentPackageStatus =
  | "uploading"
  | "complete"
  | "partial"
  | "deleted";

export type DocumentPackageTimelineEventType =
  | "folder_uploaded"
  | "folder_opened"
  | "file_added"
  | "file_replaced"
  | "file_deleted"
  | "folder_deleted";

export interface DocumentPackageLinks {
  loanFileId?: string;
  opportunityId?: string;
  contactId?: string;
  customerId?: string;
  participantId?: string;
  documentScope?: "applicant" | "shared" | "lender";
}

export interface DocumentPackageRecord {
  id: string;
  /** Preserved folder name from the browser directory picker. */
  folderName: string;
  status: DocumentPackageStatus;
  /** Ordered Document Registry record ids contained in this package. */
  documentIds: string[];
  fileCount: number;
  totalSizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  links: DocumentPackageLinks;
  /** Relative paths keyed by document id (webkitRelativePath). */
  relativePaths: Record<string, string>;
  completionPercent: number;
  lastError?: string | null;
}

export interface DocumentPackageTimelineEntry {
  id: string;
  packageId: string;
  eventType: DocumentPackageTimelineEventType;
  title: string;
  description: string;
  actorId: string;
  occurredOn: string;
  metadata?: Record<string, unknown>;
}

export interface CreateDocumentPackageInput {
  folderName: string;
  uploadedBy: string;
  links: DocumentPackageLinks;
}

export interface DocumentPackageSnapshot {
  packages: DocumentPackageRecord[];
  timeline: DocumentPackageTimelineEntry[];
  schemaVersion: 1;
}
