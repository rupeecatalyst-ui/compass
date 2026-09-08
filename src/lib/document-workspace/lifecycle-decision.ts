/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C
 * Pure recoverable-deletion decisions. Callers supply server-resolved records.
 */

import {
  DOCUMENT_WORKSPACE_NEWER_VERSION_CURRENT,
  DOCUMENT_WORKSPACE_PURGE_NOT_AUTHORISED,
  DOCUMENT_WORKSPACE_STATUS_ACTIVE,
  DOCUMENT_WORKSPACE_STATUS_DELETED,
  DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE,
  DOCUMENT_WORKSPACE_STATUS_SUPERSEDED,
  calculateDocumentRetentionUntil,
  isDocumentWorkspaceInactiveLifecycleStatus,
  isSafePriorDocumentStatus,
  resolveDocumentWorkspaceRetentionDays,
} from "@/constants/document-workspace-lifecycle";
import { DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE } from "@/constants/document-workspace-security";
import { ROLES, type Role } from "@/constants/roles";
import { hasMinimumRole } from "@/lib/permissions";

export type DocumentWorkspaceLifecycleFailure = {
  ok: false;
  httpStatus: 400 | 403 | 404 | 409;
  code: string;
  message: string;
};

export type DocumentWorkspaceDeletionSnapshot = {
  id: string;
  status: string;
  contentVersion: number;
  typeRef: string;
  originalFilename: string;
  opportunityId: string;
  dealId?: string | null;
  contactId?: string | null;
  ownerEntityId?: string | null;
  participantId?: string | null;
  storageKey?: string | null;
  storageProvider?: string | null;
  supersededByDocumentId?: string | null;
  priorStatus?: string | null;
};

function fail(
  httpStatus: DocumentWorkspaceLifecycleFailure["httpStatus"],
  code: string,
  message: string,
): DocumentWorkspaceLifecycleFailure {
  return { ok: false, httpStatus, code, message };
}

export function decideDeletionReason(reason: string | null | undefined): DocumentWorkspaceLifecycleFailure | { ok: true; reason: string } {
  const trimmed = String(reason || "").trim();
  if (!trimmed) {
    return fail(400, "REASON_REQUIRED", "A deletion reason is required.");
  }
  if (trimmed.length > 2000) {
    return fail(400, "REASON_TOO_LONG", "A deletion reason is required.");
  }
  return { ok: true, reason: trimmed };
}

export function decideRestoreReason(reason: string | null | undefined): DocumentWorkspaceLifecycleFailure | { ok: true; reason: string } {
  const trimmed = String(reason || "").trim();
  if (!trimmed) {
    return fail(400, "REASON_REQUIRED", "A restore reason is required.");
  }
  if (trimmed.length > 2000) {
    return fail(400, "REASON_TOO_LONG", "A restore reason is required.");
  }
  return { ok: true, reason: trimmed };
}

export function decideCanMoveToDeleted(input: {
  role: Role | string;
  document: DocumentWorkspaceDeletionSnapshot | null;
}): DocumentWorkspaceLifecycleFailure | { ok: true } {
  if (!hasMinimumRole(input.role as Role, ROLES.MANAGER)) {
    return fail(403, "FORBIDDEN_CAPABILITY", "You are not allowed to perform this action.");
  }
  if (!input.document) {
    return fail(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  if (isDocumentWorkspaceInactiveLifecycleStatus(input.document.status)) {
    return fail(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  return { ok: true };
}

export function decideCanRestoreDeleted(input: {
  role: Role | string;
  document: DocumentWorkspaceDeletionSnapshot | null;
}): DocumentWorkspaceLifecycleFailure | { ok: true } {
  if (!hasMinimumRole(input.role as Role, ROLES.MANAGER)) {
    return fail(403, "FORBIDDEN_CAPABILITY", "You are not allowed to perform this action.");
  }
  if (!input.document) {
    return fail(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  const status = String(input.document.status || "").toLowerCase();
  if (status !== DOCUMENT_WORKSPACE_STATUS_DELETED && status !== DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE) {
    return fail(404, "NOT_FOUND", DOCUMENT_WORKSPACE_GENERIC_UNAVAILABLE);
  }
  return { ok: true };
}

export function findNewerActiveReplacement(input: {
  candidate: DocumentWorkspaceDeletionSnapshot;
  siblings: DocumentWorkspaceDeletionSnapshot[];
}): DocumentWorkspaceDeletionSnapshot | null {
  const newer = input.siblings.find((row) => {
    if (row.id === input.candidate.id) return false;
    if (isDocumentWorkspaceInactiveLifecycleStatus(row.status)) return false;
    if (row.opportunityId !== input.candidate.opportunityId) return false;
    if (row.typeRef !== input.candidate.typeRef) return false;
    if ((row.participantId || "") !== (input.candidate.participantId || "")) return false;
    return row.contentVersion > input.candidate.contentVersion;
  });
  return newer ?? null;
}

export function decideRestoreTargetStatus(input: {
  document: DocumentWorkspaceDeletionSnapshot;
  newerCurrent: DocumentWorkspaceDeletionSnapshot | null;
}): { ok: true; status: string; blockedByNewer: boolean } {
  if (input.newerCurrent) {
    return {
      ok: true,
      status: DOCUMENT_WORKSPACE_STATUS_SUPERSEDED,
      blockedByNewer: true,
    };
  }
  return {
    ok: true,
    status: restoreStatusFromPrior(input.document.priorStatus),
    blockedByNewer: false,
  };
}

export function restoreStatusFromPrior(priorStatus: string | null | undefined): string {
  if (isSafePriorDocumentStatus(priorStatus)) return String(priorStatus);
  return DOCUMENT_WORKSPACE_STATUS_ACTIVE;
}

export function decidePermanentPurge(): DocumentWorkspaceLifecycleFailure {
  return fail(403, "PURGE_NOT_AUTHORISED", DOCUMENT_WORKSPACE_PURGE_NOT_AUTHORISED);
}

export function decidePurgeEligibility(input: {
  status: string;
  retentionUntil: Date | null;
  now: Date;
}): { eligible: boolean; nextStatus: string } {
  if (String(input.status).toLowerCase() !== DOCUMENT_WORKSPACE_STATUS_DELETED) {
    return { eligible: false, nextStatus: input.status };
  }
  if (!input.retentionUntil || input.retentionUntil.getTime() > input.now.getTime()) {
    return { eligible: false, nextStatus: input.status };
  }
  return { eligible: true, nextStatus: DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE };
}

export function buildDeletionLifecyclePatch(input: {
  actorUserId: string;
  reason: string;
  priorStatus: string;
  deletedAt: Date;
  retentionDays?: number | null;
}): {
  status: string;
  deletedAt: Date;
  deletedByUserId: string;
  deletionReason: string;
  priorStatus: string;
  retentionUntil: Date;
  purgeEligibleAt: null;
  purgeStatus: null;
  restoredAt: null;
  restoredByUserId: null;
  restoreReason: null;
} {
  const retentionUntil = calculateDocumentRetentionUntil(input.deletedAt, input.retentionDays);
  return {
    status: DOCUMENT_WORKSPACE_STATUS_DELETED,
    deletedAt: input.deletedAt,
    deletedByUserId: input.actorUserId,
    deletionReason: input.reason,
    priorStatus: input.priorStatus || DOCUMENT_WORKSPACE_STATUS_ACTIVE,
    retentionUntil,
    purgeEligibleAt: null,
    purgeStatus: null,
    restoredAt: null,
    restoredByUserId: null,
    restoreReason: null,
  };
}

export function defaultRetentionDays(): number {
  return resolveDocumentWorkspaceRetentionDays(null);
}

export { DOCUMENT_WORKSPACE_NEWER_VERSION_CURRENT, DOCUMENT_WORKSPACE_STATUS_SUPERSEDED };
