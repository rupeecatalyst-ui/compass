/**
 * Catalyst One v1.0 — Organization Documents Registry
 * Official corporate document repository (future-ready schema).
 */

export type OrgDocCategoryId =
  | "legal"
  | "banking_finance"
  | "compliance"
  | "branding"
  | "templates"
  | "others";

export type OrgDocStatus = "active" | "archived";

export type OrgDocViewMode = "list" | "cards";

/** Built-in document type within a fixed category (except Templates, which are dynamic). */
export interface OrgDocTypeDefinition {
  id: string;
  categoryId: OrgDocCategoryId;
  label: string;
  sortOrder: number;
  /** System types cannot be deleted; Templates types are fully dynamic. */
  system: boolean;
}

export interface OrgDocCategoryDefinition {
  id: OrgDocCategoryId;
  label: string;
  description: string;
  sortOrder: number;
  /** Templates category allows Super Admin to manage types dynamically. */
  dynamicTypes: boolean;
}

export interface OrgDocumentVersion {
  id: string;
  version: number;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  /** Data URL or blob reference for demo persistence — never renames the file. */
  contentDataUrl: string | null;
  uploadedBy: string;
  uploadedAt: string;
  /** Future: digital signature envelope id */
  signatureEnvelopeId?: string | null;
  /** Future: approval workflow instance id */
  approvalInstanceId?: string | null;
}

/**
 * Registry document record — metadata SSOT.
 * File binary is referenced; original filename is never mutated.
 */
export interface OrgDocumentRecord {
  id: string;
  /** Preserved exactly as uploaded — never renamed. */
  originalFilename: string;
  categoryId: OrgDocCategoryId;
  documentTypeId: string;
  documentTypeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  version: number;
  fileSizeBytes: number;
  mimeType: string;
  status: OrgDocStatus;
  tags: string[];
  versions: OrgDocumentVersion[];
  contentDataUrl: string | null;
  /** Future-ready extension slots (OCR / AI / expiry / RBAC) — unused in v1.0 UI. */
  extensions: {
    ocrText?: string | null;
    aiSummary?: string | null;
    expiresAt?: string | null;
    accessRoleIds?: string[];
    auditTrailRef?: string | null;
  };
}

export interface OrgDocumentFilters {
  query: string;
  categoryId: OrgDocCategoryId | "all";
  documentTypeId: string | "all";
  uploadedBy: string | "all";
  status: OrgDocStatus | "all";
  tag: string | "all";
}

export type OrgDocBulkAction =
  | "download"
  | "share"
  | "email"
  | "archive"
  | "move_category";

export interface OrgDocumentsRegistrySnapshot {
  documents: OrgDocumentRecord[];
  /** Dynamic template types (Super Admin managed). */
  templateTypes: OrgDocTypeDefinition[];
  schemaVersion: 1;
}
