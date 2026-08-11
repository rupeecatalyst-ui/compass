/**
 * CO-ORG-002 — Organization document soft-delete adapter (Prisma).
 * Uses status archived (not isDeleted).
 */

import { prisma } from "@server/lib/prisma";
import type {
  SoftDeleteActor,
  SoftDeleteModuleAdapter,
} from "@/types/enterprise-soft-delete";

function formatDocumentLabel(row: {
  originalFilename: string;
  displayName: string;
}): string {
  return row.displayName?.trim() || row.originalFilename;
}

export const organizationDocumentSoftDeleteAdapter: SoftDeleteModuleAdapter = {
  module: "documents",
  label: "Documents",
  capabilities: {
    softDelete: true,
    restore: true,
    permanentDelete: true,
    listDeleted: true,
  },

  async softDelete(entityId, actor, _reason) {
    const row = await prisma.organizationDocument.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Document not found.");
    if (row.status === "archived") throw new Error("Document is already archived.");

    const now = new Date();
    await prisma.organizationDocument.update({
      where: { id: entityId },
      data: {
        status: "archived",
        modifiedBy: actor.userId,
        updatedAt: now,
      },
    });

    return {
      entityLabel: formatDocumentLabel(row),
      ownerName: row.uploadedBy,
    };
  },

  async restore(entityId, actor) {
    const row = await prisma.organizationDocument.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Document not found.");
    if (row.status !== "archived") throw new Error("Document is not archived.");

    await prisma.organizationDocument.update({
      where: { id: entityId },
      data: {
        status: "active",
        modifiedBy: actor.userId,
      },
    });

    return { entityLabel: formatDocumentLabel(row) };
  },

  async permanentDelete(entityId, _actor: SoftDeleteActor) {
    const row = await prisma.organizationDocument.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Document not found.");
    if (row.status !== "archived") {
      throw new Error("Document must be archived before permanent deletion.");
    }

    await prisma.organizationDocument.delete({ where: { id: entityId } });
    return { entityLabel: formatDocumentLabel(row) };
  },

  async listDeleted() {
    const rows = await prisma.organizationDocument.findMany({
      where: { status: "archived" },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => ({
      entityId: row.id,
      entityLabel: formatDocumentLabel(row),
      ownerName: row.uploadedBy,
      deletedBy: row.modifiedBy ?? row.uploadedBy ?? "unknown",
      deletedAt: row.updatedAt.toISOString(),
      deletionReason: null,
    }));
  },
};
