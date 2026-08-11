/**
 * CO-ORG-002 — Opportunity soft-delete adapter (Prisma Enterprise Opportunity Registry).
 */

import { prisma } from "@server/lib/prisma";
import type {
  SoftDeleteActor,
  SoftDeleteModuleAdapter,
} from "@/types/enterprise-soft-delete";

function formatOpportunityLabel(row: {
  opportunityNumber: string;
  primaryContactName: string | null;
  companyName: string | null;
}): string {
  const name = row.primaryContactName ?? row.companyName ?? "Unknown";
  return `${row.opportunityNumber} — ${name}`;
}

export const opportunitySoftDeleteAdapter: SoftDeleteModuleAdapter = {
  module: "opportunities",
  label: "Opportunities",
  capabilities: {
    softDelete: true,
    restore: true,
    permanentDelete: true,
    listDeleted: true,
  },

  async softDelete(entityId, actor, reason) {
    const row = await prisma.enterpriseOpportunity.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Opportunity not found.");
    if (row.isDeleted) throw new Error("Opportunity is already deleted.");

    const now = new Date();
    await prisma.enterpriseOpportunity.update({
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
      },
    });

    return {
      entityLabel: formatOpportunityLabel(row),
      ownerName: row.relationshipManagerName,
    };
  },

  async restore(entityId, actor) {
    const row = await prisma.enterpriseOpportunity.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Opportunity not found.");
    if (!row.isDeleted) throw new Error("Opportunity is not deleted.");

    await prisma.enterpriseOpportunity.update({
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
      },
    });

    return { entityLabel: formatOpportunityLabel(row) };
  },

  async permanentDelete(entityId, _actor: SoftDeleteActor) {
    const row = await prisma.enterpriseOpportunity.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Opportunity not found.");
    if (!row.isDeleted) {
      throw new Error("Opportunity must be soft-deleted before permanent deletion.");
    }

    await prisma.enterpriseOpportunity.delete({ where: { id: entityId } });
    return { entityLabel: formatOpportunityLabel(row) };
  },

  async listDeleted() {
    const rows = await prisma.enterpriseOpportunity.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: "desc" },
    });
    return rows.map((row) => ({
      entityId: row.id,
      entityLabel: formatOpportunityLabel(row),
      ownerName: row.relationshipManagerName,
      deletedBy: row.deletedBy ?? row.archivedBy ?? "unknown",
      deletedAt: (row.deletedAt ?? row.archivedAt ?? row.updatedAt).toISOString(),
      deletionReason: row.deletionReason,
    }));
  },
};
