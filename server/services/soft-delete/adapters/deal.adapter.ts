/**
 * CO-ORG-002 — Deal soft-delete adapter (Prisma Enterprise Deal Registry).
 * Recovery module id: loan_files (Deal Registry operational SSOT for this slot).
 */

import { prisma } from "@server/lib/prisma";
import type {
  SoftDeleteActor,
  SoftDeleteModuleAdapter,
} from "@/types/enterprise-soft-delete";

function formatDealLabel(row: {
  dealNumber: string;
  primaryContactName: string | null;
}): string {
  const name = row.primaryContactName ?? "Unknown";
  return `${row.dealNumber} — ${name}`;
}

export const dealSoftDeleteAdapter: SoftDeleteModuleAdapter = {
  module: "loan_files",
  label: "Deals / Loan Files",
  capabilities: {
    softDelete: true,
    restore: true,
    permanentDelete: true,
    listDeleted: true,
  },

  async softDelete(entityId, actor, reason) {
    const row = await prisma.enterpriseDeal.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Deal not found.");
    if (row.isDeleted) throw new Error("Deal is already deleted.");

    const now = new Date();
    await prisma.enterpriseDeal.update({
      where: { id: entityId },
      data: {
        isDeleted: true,
        deletedAt: now,
        deletedBy: actor.userId,
        deletionReason: reason?.trim() || null,
        archived: true,
        archivedAt: now,
        archivedBy: actor.userId,
        updatedBy: actor.userId,
        rowVersion: { increment: 1 },
      },
    });

    return {
      entityLabel: formatDealLabel(row),
      ownerName: row.relationshipManagerName,
    };
  },

  async restore(entityId, actor) {
    const row = await prisma.enterpriseDeal.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Deal not found.");
    if (!row.isDeleted) throw new Error("Deal is not deleted.");

    await prisma.enterpriseDeal.update({
      where: { id: entityId },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        archived: false,
        archivedAt: null,
        archivedBy: null,
        updatedBy: actor.userId,
        rowVersion: { increment: 1 },
      },
    });

    return { entityLabel: formatDealLabel(row) };
  },

  async permanentDelete(entityId, _actor: SoftDeleteActor) {
    const row = await prisma.enterpriseDeal.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Deal not found.");
    if (!row.isDeleted) {
      throw new Error("Deal must be soft-deleted before permanent deletion.");
    }

    await prisma.enterpriseDeal.delete({ where: { id: entityId } });
    return { entityLabel: formatDealLabel(row) };
  },

  async listDeleted() {
    const rows = await prisma.enterpriseDeal.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: "desc" },
    });
    return rows.map((row) => ({
      entityId: row.id,
      entityLabel: formatDealLabel(row),
      ownerName: row.relationshipManagerName,
      deletedBy: row.deletedBy ?? row.archivedBy ?? "unknown",
      deletedAt: (row.deletedAt ?? row.archivedAt ?? row.updatedAt).toISOString(),
      deletionReason: row.deletionReason,
    }));
  },
};
