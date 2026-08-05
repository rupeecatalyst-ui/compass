/**
 * CO-DOC-005 — Enterprise Document Package Registry types.
 * Packages are first-class durable entities; child files remain Document Registry records.
 */

export type DocumentPackageStatus =
  | "uploading"
  | "complete"
  | "partial"
  | "deleted";

/** Where package binaries currently live. */
export type DocumentPackageStorageStatus =
  | "local_authoring"
  | "durable_metadata"
  | "durable_inline"
  | "durable_object"
  | "mixed"
  | "pending_migration";

export type DocumentPackageParentEntityType =
  | "opportunity"
  | "loan_file"
  | "contact"
  | "company"
  | "wealth_partner"
  | "other";

export type DocumentPackageTimelineEventType =
  | "package_created"
  | "folder_uploaded"
  | "folder_opened"
  | "file_added"
  | "file_replaced"
  | "file_deleted"
  | "package_downloaded"
  | "package_deleted"
  | "package_renamed"
  | "preview_opened"
  | "package_hydrated";

export interface DocumentPackageLinks {
  loanFileId?: string;
  opportunityId?: string;
  contactId?: string;
  customerId?: string;
  participantId?: string;
  documentScope?: "applicant" | "shared" | "lender";
  parentEntityType?: DocumentPackageParentEntityType;
  parentEntityId?: string;
}

export interface DocumentPackageRecord {
  id: string;
  /** Preserved folder / package name. */
  folderName: string;
  status: DocumentPackageStatus;
  storageStatus: DocumentPackageStorageStatus;
  /** Ordered Document Registry record ids. */
  documentIds: string[];
  fileCount: number;
  totalSizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
  links: DocumentPackageLinks;
  relativePaths: Record<string, string>;
  completionPercent: number;
  lastError?: string | null;
  /** Server durable id when synced (may equal id when client id is SSOT). */
  durableId?: string | null;
  clientPackageId?: string | null;
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
  id?: string;
}

export interface DocumentPackageSnapshot {
  packages: DocumentPackageRecord[];
  timeline: DocumentPackageTimelineEntry[];
  schemaVersion: 2;
}

export interface DurableDocumentPackageDto {
  id: string;
  clientPackageId: string | null;
  opportunityId: string;
  loanFileId: string | null;
  folderName: string;
  status: string;
  storageStatus: string;
  fileCount: number;
  totalSizeBytes: number;
  uploadedBy: string;
  createdBy: string;
  version: number;
  participantId: string | null;
  documentScope: string | null;
  contactId: string | null;
  customerId: string | null;
  parentEntityType: string | null;
  parentEntityId: string | null;
  documentIds: string[];
  relativePaths: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
