/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C
 * Canonical recoverable deletion / restore lifecycle. Does not physically destroy binaries.
 */
import "server-only";

import { prisma } from "@server/lib/prisma";
import type { Role } from "@/constants/roles";
import {
  DOCUMENT_WORKSPACE_AUDIT_ACTIONS,
  DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
  DOCUMENT_WORKSPACE_AUDIT_ACTOR_SYSTEM,
} from "@/constants/document-workspace-audit";
import {
  DOCUMENT_WORKSPACE_NEWER_VERSION_CURRENT,
  DOCUMENT_WORKSPACE_PURGE_NOT_AUTHORISED,
  DOCUMENT_WORKSPACE_STATUS_DELETED,
  DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE,
  isDocumentWorkspaceInactiveLifecycleStatus,
} from "@/constants/document-workspace-lifecycle";
import {
  buildDeletionLifecyclePatch,
  decideCanMoveToDeleted,
  decideCanRestoreDeleted,
  decideDeletionReason,
  decidePermanentPurge,
  decidePurgeEligibility,
  decideRestoreReason,
  decideRestoreTargetStatus,
  findNewerActiveReplacement,
  type DocumentWorkspaceDeletionSnapshot,
} from "@/lib/document-workspace/lifecycle-decision";
import { appendDocumentWorkspaceAuditRequired } from "@server/services/document-workspace/document-workspace-audit.service";

function lifecycleError(
  failure: { httpStatus: number; code: string; message: string },
): never {
  throw Object.assign(new Error(failure.message), {
    statusCode: failure.httpStatus,
    code: failure.code,
    expose: false,
  });
}

function toSnapshot(row: {
  id: string;
  status: string;
  contentVersion: number;
  typeRef: string;
  originalFilename: string;
  opportunityId: string;
  dealId: string | null;
  contactId: string | null;
  ownerEntityId: string | null;
  participantId: string | null;
  storageKey: string | null;
  storageProvider: string | null;
  supersededByDocumentId: string | null;
  priorStatus: string | null;
}): DocumentWorkspaceDeletionSnapshot {
  return {
    id: row.id,
    status: row.status,
    contentVersion: row.contentVersion,
    typeRef: row.typeRef,
    originalFilename: row.originalFilename,
    opportunityId: row.opportunityId,
    dealId: row.dealId,
    contactId: row.contactId,
    ownerEntityId: row.ownerEntityId,
    participantId: row.participantId,
    storageKey: row.storageKey,
    storageProvider: row.storageProvider,
    supersededByDocumentId: row.supersededByDocumentId,
    priorStatus: row.priorStatus,
  };
}

const LIFECYCLE_SELECT = {
  id: true,
  organizationId: true,
  opportunityId: true,
  dealId: true,
  contactId: true,
  ownerEntityId: true,
  customerId: true,
  participantId: true,
  typeRef: true,
  originalFilename: true,
  status: true,
  contentVersion: true,
  storageKey: true,
  storageProvider: true,
  supersededByDocumentId: true,
  priorStatus: true,
  deletionReason: true,
  deletedAt: true,
  retentionUntil: true,
  purgeStatus: true,
  purgeEligibleAt: true,
  restoredAt: true,
  malwareScanStatus: true,
} as const;

export type DocumentWorkspaceDeletedListItem = {
  id: string;
  opportunityId: string;
  dealId: string | null;
  contactId: string | null;
  typeRef: string;
  originalFilename: string;
  status: string;
  contentVersion: number;
  deletionReason: string | null;
  deletedAt: string | null;
  retentionUntil: string | null;
  purgeStatus: string | null;
  purgeEligibleAt: string | null;
  eligibleForPurge: boolean;
};

export async function moveDocumentToDeletedDocuments(input: {
  organizationId: string;
  opportunityId: string;
  documentId: string;
  actorUserId: string;
  actorRole: Role | string;
  reason: string;
  companyId?: string | null;
  correlationId?: string | null;
  actorType?: typeof DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE | typeof DOCUMENT_WORKSPACE_AUDIT_ACTOR_SYSTEM;
  retentionDays?: number | null;
  trustedInternal?: boolean;
}): Promise<{ ok: true; documentId: string; retentionUntil: string; contentVersion: number }> {
  const reason = decideDeletionReason(input.reason);
  if (!reason.ok) lifecycleError(reason);

  const row = await prisma.enterpriseTransactionDocument.findFirst({
    where: {
      id: input.documentId,
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
    },
    select: LIFECYCLE_SELECT,
  });
  if (input.trustedInternal) {
    if (!row || isDocumentWorkspaceInactiveLifecycleStatus(row.status)) {
      lifecycleError({ httpStatus: 404, code: "NOT_FOUND", message: "Resource is not available." });
    }
  } else {
    const allowed = decideCanMoveToDeleted({
      role: input.actorRole,
      document: row ? toSnapshot(row) : null,
    });
    if (!allowed.ok) lifecycleError(allowed);
  }
  if (!row) lifecycleError({ httpStatus: 404, code: "NOT_FOUND", message: "Resource is not available." });

  const deletedAt = new Date();
  const patch = buildDeletionLifecyclePatch({
    actorUserId: input.actorUserId,
    reason: reason.reason,
    priorStatus: row.status,
    deletedAt,
    retentionDays: input.retentionDays,
  });

  await prisma.$transaction(async (tx) => {
    await tx.enterpriseTransactionDocument.update({
      where: { id: row.id },
      data: patch,
    });
    await appendDocumentWorkspaceAuditRequired(
      {
        organizationId: input.organizationId,
        actorType: input.actorType || DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
        actorId: input.actorUserId,
        action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.DOCUMENT_MOVED_TO_DELETED,
        documentId: row.id,
        contentVersion: row.contentVersion,
        contactId: row.contactId,
        companyId: input.companyId || row.ownerEntityId,
        opportunityId: row.opportunityId,
        dealId: row.dealId,
        reason: reason.reason,
        sourceChannel: "document_workspace",
        correlationId: input.correlationId,
        metadata: {
          priorStatus: row.status,
          storageProvider: row.storageProvider,
          hasStorageKey: Boolean(row.storageKey),
          retentionUntil: patch.retentionUntil.toISOString(),
        },
      },
      tx,
    );
  });

  return {
    ok: true,
    documentId: row.id,
    retentionUntil: patch.retentionUntil.toISOString(),
    contentVersion: row.contentVersion,
  };
}

export async function restoreDeletedDocument(input: {
  organizationId: string;
  opportunityId: string;
  documentId: string;
  actorUserId: string;
  actorRole: Role | string;
  reason: string;
  companyId?: string | null;
  correlationId?: string | null;
}): Promise<{
  ok: true;
  documentId: string;
  status: string;
  blockedByNewer: boolean;
  newerDocumentId: string | null;
  contentVersion: number;
}> {
  const reason = decideRestoreReason(input.reason);
  if (!reason.ok) lifecycleError(reason);

  const row = await prisma.enterpriseTransactionDocument.findFirst({
    where: {
      id: input.documentId,
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
    },
    select: LIFECYCLE_SELECT,
  });
  const allowed = decideCanRestoreDeleted({
    role: input.actorRole,
    document: row ? toSnapshot(row) : null,
  });
  if (!allowed.ok) lifecycleError(allowed);
  if (!row) lifecycleError({ httpStatus: 404, code: "NOT_FOUND", message: "Resource is not available." });

  const siblings = await prisma.enterpriseTransactionDocument.findMany({
    where: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      typeRef: row.typeRef,
      id: { not: row.id },
    },
    select: LIFECYCLE_SELECT,
  });
  const newer = findNewerActiveReplacement({
    candidate: toSnapshot(row),
    siblings: siblings.map(toSnapshot),
  });
  const target = decideRestoreTargetStatus({
    document: toSnapshot(row),
    newerCurrent: newer,
  });
  const restoredAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.enterpriseTransactionDocument.update({
      where: { id: row.id },
      data: {
        status: target.status,
        restoredAt,
        restoredByUserId: input.actorUserId,
        restoreReason: reason.reason,
        supersededByDocumentId: newer?.id ?? row.supersededByDocumentId,
        purgeStatus: null,
        purgeEligibleAt: null,
      },
    });
    await appendDocumentWorkspaceAuditRequired(
      {
        organizationId: input.organizationId,
        actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
        actorId: input.actorUserId,
        action: target.blockedByNewer
          ? DOCUMENT_WORKSPACE_AUDIT_ACTIONS.DOCUMENT_RESTORE_BLOCKED_NEWER
          : DOCUMENT_WORKSPACE_AUDIT_ACTIONS.DOCUMENT_RESTORED,
        documentId: row.id,
        contentVersion: row.contentVersion,
        contactId: row.contactId,
        companyId: input.companyId || row.ownerEntityId,
        opportunityId: row.opportunityId,
        dealId: row.dealId,
        reason: reason.reason,
        outcome: target.blockedByNewer ? "blocked_newer_version" : "success",
        sourceChannel: "document_workspace",
        correlationId: input.correlationId,
        metadata: {
          restoredStatus: target.status,
          newerDocumentId: newer?.id ?? null,
          newerContentVersion: newer?.contentVersion ?? null,
          message: target.blockedByNewer ? DOCUMENT_WORKSPACE_NEWER_VERSION_CURRENT : undefined,
        },
      },
      tx,
    );
  });

  return {
    ok: true,
    documentId: row.id,
    status: target.status,
    blockedByNewer: target.blockedByNewer,
    newerDocumentId: newer?.id ?? null,
    contentVersion: row.contentVersion,
  };
}

export async function listDeletedDocumentsForOrganization(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
  actorUserId: string;
  correlationId?: string | null;
}): Promise<DocumentWorkspaceDeletedListItem[]> {
  const now = new Date();
  const rows = await prisma.enterpriseTransactionDocument.findMany({
    where: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      status: {
        in: [DOCUMENT_WORKSPACE_STATUS_DELETED, DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE],
      },
      ...(input.dealId ? { dealId: input.dealId } : {}),
    },
    select: LIFECYCLE_SELECT,
    orderBy: { deletedAt: "desc" },
    take: 500,
  });

  const listed: DocumentWorkspaceDeletedListItem[] = [];
  for (const row of rows) {
    const eligibility = decidePurgeEligibility({
      status: row.status,
      retentionUntil: row.retentionUntil,
      now,
    });
    if (eligibility.eligible && row.status === DOCUMENT_WORKSPACE_STATUS_DELETED) {
      await prisma.$transaction(async (tx) => {
        await tx.enterpriseTransactionDocument.update({
          where: { id: row.id },
          data: {
            status: DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE,
            purgeStatus: DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE,
            purgeEligibleAt: now,
          },
        });
        await appendDocumentWorkspaceAuditRequired(
          {
            organizationId: input.organizationId,
            actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_SYSTEM,
            actorId: input.actorUserId,
            action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.DOCUMENT_ELIGIBLE_FOR_PURGE,
            documentId: row.id,
            contentVersion: row.contentVersion,
            contactId: row.contactId,
            opportunityId: row.opportunityId,
            dealId: row.dealId,
            sourceChannel: "document_workspace",
            correlationId: input.correlationId,
            metadata: {
              retentionUntil: row.retentionUntil?.toISOString() ?? null,
              physicallyPurged: false,
            },
          },
          tx,
        );
      });
      listed.push({
        id: row.id,
        opportunityId: row.opportunityId,
        dealId: row.dealId,
        contactId: row.contactId,
        typeRef: row.typeRef,
        originalFilename: row.originalFilename,
        status: DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE,
        contentVersion: row.contentVersion,
        deletionReason: row.deletionReason,
        deletedAt: row.deletedAt?.toISOString() ?? null,
        retentionUntil: row.retentionUntil?.toISOString() ?? null,
        purgeStatus: DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE,
        purgeEligibleAt: now.toISOString(),
        eligibleForPurge: true,
      });
      continue;
    }
    listed.push({
      id: row.id,
      opportunityId: row.opportunityId,
      dealId: row.dealId,
      contactId: row.contactId,
      typeRef: row.typeRef,
      originalFilename: row.originalFilename,
      status: row.status,
      contentVersion: row.contentVersion,
      deletionReason: row.deletionReason,
      deletedAt: row.deletedAt?.toISOString() ?? null,
      retentionUntil: row.retentionUntil?.toISOString() ?? null,
      purgeStatus: row.purgeStatus,
      purgeEligibleAt: row.purgeEligibleAt?.toISOString() ?? null,
      eligibleForPurge: row.status === DOCUMENT_WORKSPACE_STATUS_ELIGIBLE_FOR_PURGE,
    });
  }
  return listed;
}

export async function refusePermanentPurge(input: {
  organizationId: string;
  documentId?: string | null;
  actorUserId: string;
  correlationId?: string | null;
}): Promise<never> {
  const refused = decidePermanentPurge();
  if (input.organizationId.trim()) {
    await appendDocumentWorkspaceAuditBestEffortSafe(input);
  }
  lifecycleError(refused);
}

async function appendDocumentWorkspaceAuditBestEffortSafe(input: {
  organizationId: string;
  documentId?: string | null;
  actorUserId: string;
  correlationId?: string | null;
}): Promise<void> {
  try {
    await appendDocumentWorkspaceAuditRequired({
      organizationId: input.organizationId,
      actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
      actorId: input.actorUserId,
      action: DOCUMENT_WORKSPACE_AUDIT_ACTIONS.DOCUMENT_PURGE_REFUSED,
      documentId: input.documentId,
      outcome: "refused",
      reason: DOCUMENT_WORKSPACE_PURGE_NOT_AUTHORISED,
      sourceChannel: "document_workspace",
      correlationId: input.correlationId,
      metadata: { physicallyPurged: false },
    });
  } catch {
    /* refusal still wins even if audit is unavailable */
  }
}

export function documentIsInactiveForActiveUse(status: string | null | undefined): boolean {
  return isDocumentWorkspaceInactiveLifecycleStatus(status);
}
