/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C
 * Recoverable deletion, retention, and malware-status vocabulary.
 */

export const DOCUMENT_WORKSPACE_REFINEMENT_014C_ID =
  "CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C" as const;

export const DOCUMENT_WORKSPACE_DELETION_RETENTION_DAYS_DEFAULT = 30;
export const DOCUMENT_WORKSPACE_DELETION_RETENTION_DAYS_ENV =
  "DOCUMENT_WORKSPACE_DELETION_RETENTION_DAYS";

export const DOCUMENT_WORKSPACE_STATUS_ACTIVE = "active";
export const DOCUMENT_WORKSPACE_STATUS_DELETED = "deleted";
export const DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE = "eligible_for_purge";
export const DOCUMENT_WORKSPACE_STATUS_SUPERSEDED = "superseded";
export const DOCUMENT_WORKSPACE_STATUS_QUARANTINED = "quarantined";

export const DOCUMENT_WORKSPACE_PURGE_STATUS_ELIGIBLE = "eligible_for_purge";

export const DOCUMENT_WORKSPACE_INACTIVE_LIFECYCLE_STATUSES = [
  DOCUMENT_WORKSPACE_STATUS_DELETED,
  DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE,
  DOCUMENT_WORKSPACE_STATUS_SUPERSEDED,
] as const;

export const DOCUMENT_WORKSPACE_MALWARE_STATUS_NOT_CONFIGURED = "not_configured";
export const DOCUMENT_WORKSPACE_MALWARE_STATUS_PENDING = "pending";
export const DOCUMENT_WORKSPACE_MALWARE_STATUS_QUARANTINED = "quarantined";
export const DOCUMENT_WORKSPACE_MALWARE_STATUS_FAILED = "failed";
export const DOCUMENT_WORKSPACE_MALWARE_STATUS_PASSED = "passed";

export const DOCUMENT_WORKSPACE_MOVE_TO_DELETED_LABEL = "Move to Deleted Documents";
export const DOCUMENT_WORKSPACE_DELETED_DOCUMENTS_LABEL = "Deleted Documents";
export const DOCUMENT_WORKSPACE_RESTORE_LABEL = "Restore";
export const DOCUMENT_WORKSPACE_DELETION_REASON_REQUIRED =
  "A deletion reason is required before the document can be moved to Deleted Documents.";
export const DOCUMENT_WORKSPACE_RESTORE_REASON_REQUIRED =
  "A restore reason is required before the document can be restored.";
export const DOCUMENT_WORKSPACE_PURGE_NOT_AUTHORISED =
  "Permanent purge is not authorised. No files were destroyed.";
export const DOCUMENT_WORKSPACE_NEWER_VERSION_CURRENT =
  "A newer version is already current. This file was not made current.";

export function resolveDocumentWorkspaceRetentionDays(configured?: number | null): number {
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured);
  }
  if (typeof process !== "undefined" && process.env) {
    const raw = process.env[DOCUMENT_WORKSPACE_DELETION_RETENTION_DAYS_ENV];
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DOCUMENT_WORKSPACE_DELETION_RETENTION_DAYS_DEFAULT;
}

export function calculateDocumentRetentionUntil(
  deletedAt: Date,
  retentionDays?: number | null,
): Date {
  const days = resolveDocumentWorkspaceRetentionDays(retentionDays);
  return new Date(deletedAt.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isDocumentWorkspaceInactiveLifecycleStatus(status: string | null | undefined): boolean {
  const value = String(status || "").toLowerCase();
  return (DOCUMENT_WORKSPACE_INACTIVE_LIFECYCLE_STATUSES as readonly string[]).includes(value);
}

export function isSafePriorDocumentStatus(status: string | null | undefined): boolean {
  const value = String(status || "").toLowerCase();
  if (!value) return false;
  if (isDocumentWorkspaceInactiveLifecycleStatus(value)) return false;
  if (value === DOCUMENT_WORKSPACE_STATUS_QUARANTINED) return false;
  return true;
}
