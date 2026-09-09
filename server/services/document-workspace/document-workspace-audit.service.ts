/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C
 * Append-only Document Workspace audit ledger. Ordinary APIs must not update or delete rows.
 */
import "server-only";

import { prisma } from "@server/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  DOCUMENT_WORKSPACE_AUDIT_ACTOR_CUSTOMER,
  DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
  DOCUMENT_WORKSPACE_AUDIT_ACTOR_SYSTEM,
  type DocumentWorkspaceAuditAction,
} from "@/constants/document-workspace-audit";
import { sanitizeDocumentWorkspaceAuditMetadata } from "@/lib/document-workspace/audit-sanitize";

export type DocumentWorkspaceAuditWrite = {
  organizationId: string;
  actorType?: typeof DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE | typeof DOCUMENT_WORKSPACE_AUDIT_ACTOR_CUSTOMER | typeof DOCUMENT_WORKSPACE_AUDIT_ACTOR_SYSTEM;
  actorId?: string | null;
  action: DocumentWorkspaceAuditAction | string;
  documentId?: string | null;
  contentVersion?: number | null;
  contactId?: string | null;
  companyId?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  shareEventId?: string | null;
  sourceChannel?: string | null;
  outcome?: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  correlationId?: string | null;
};

type AuditDb = Prisma.TransactionClient | typeof prisma;

function dbFor(tx?: Prisma.TransactionClient): AuditDb {
  return tx ?? prisma;
}

export async function appendDocumentWorkspaceAuditRequired(
  input: DocumentWorkspaceAuditWrite,
  tx?: Prisma.TransactionClient,
): Promise<{ id: string }> {
  const organizationId = input.organizationId.trim();
  if (!organizationId) {
    throw Object.assign(new Error("Audit organisation is required."), {
      statusCode: 500,
      code: "AUDIT_REQUIRED",
    });
  }
  const metadata = sanitizeDocumentWorkspaceAuditMetadata(input.metadata);
  const created = await dbFor(tx).enterpriseDocumentWorkspaceAuditEvent.create({
    data: {
      organizationId,
      actorType: input.actorType || DOCUMENT_WORKSPACE_AUDIT_ACTOR_SYSTEM,
      actorId: input.actorId?.trim() || null,
      action: input.action,
      documentId: input.documentId?.trim() || null,
      contentVersion: input.contentVersion ?? null,
      contactId: input.contactId?.trim() || null,
      companyId: input.companyId?.trim() || null,
      opportunityId: input.opportunityId?.trim() || null,
      dealId: input.dealId?.trim() || null,
      requestId: input.requestId?.trim() || null,
      sessionId: input.sessionId?.trim() || null,
      shareEventId: input.shareEventId?.trim() || null,
      sourceChannel: input.sourceChannel?.trim() || null,
      outcome: input.outcome || "success",
      reason: input.reason?.trim() || null,
      ...(metadata ? { metadataJson: metadata as Prisma.InputJsonValue } : {}),
      correlationId: input.correlationId?.trim() || null,
    },
    select: { id: true },
  });
  return created;
}

export async function appendDocumentWorkspaceAuditBestEffort(
  input: DocumentWorkspaceAuditWrite,
): Promise<void> {
  try {
    await appendDocumentWorkspaceAuditRequired(input);
  } catch {
    /* non-destructive surfaces may continue */
  }
}
