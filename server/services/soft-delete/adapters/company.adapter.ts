/**
 * CO-SPRINT-119 — Company soft-delete adapter (Prisma ECM).
 */

import { prisma } from "@server/lib/prisma";
import type {
  SoftDeleteActor,
  SoftDeleteModuleAdapter,
} from "@/types/enterprise-soft-delete";

export const companySoftDeleteAdapter: SoftDeleteModuleAdapter = {
  module: "companies",
  label: "Companies",
  capabilities: {
    softDelete: true,
    restore: true,
    permanentDelete: true,
    listDeleted: true,
  },

  async softDelete(entityId, actor, reason) {
    const row = await prisma.ecmCompany.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Company not found.");
    if (row.isDeleted) throw new Error("Company is already deleted.");

    const now = new Date();
    await prisma.ecmCompany.update({
      where: { id: entityId },
      data: {
        isDeleted: true,
        deletedAt: now,
        deletedBy: actor.userId,
        deletionReason: reason?.trim() || null,
        status: "archived",
        enabled: false,
        archivedBy: actor.userId,
        archivedAt: now,
        modifiedBy: actor.userId,
      },
    });

    return {
      entityLabel: row.companyName,
      ownerName: row.ownerName,
    };
  },

  async restore(entityId, actor) {
    const row = await prisma.ecmCompany.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Company not found.");
    if (!row.isDeleted) throw new Error("Company is not deleted.");

    await prisma.ecmCompany.update({
      where: { id: entityId },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        status: "active",
        enabled: true,
        archivedBy: null,
        archivedAt: null,
        modifiedBy: actor.userId,
      },
    });

    return { entityLabel: row.companyName };
  },

  async permanentDelete(entityId, _actor: SoftDeleteActor) {
    const row = await prisma.ecmCompany.findUnique({ where: { id: entityId } });
    if (!row) throw new Error("Company not found.");
    if (!row.isDeleted) {
      throw new Error("Company must be soft-deleted before permanent deletion.");
    }

    await prisma.ecmCompany.delete({ where: { id: entityId } });
    return { entityLabel: row.companyName };
  },

  async listDeleted() {
    const rows = await prisma.ecmCompany.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: "desc" },
    });
    return rows.map((row) => ({
      entityId: row.id,
      entityLabel: row.companyName,
      ownerName: row.ownerName,
      deletedBy: row.deletedBy ?? row.archivedBy ?? "unknown",
      deletedAt: (row.deletedAt ?? row.archivedAt ?? row.updatedAt).toISOString(),
      deletionReason: row.deletionReason,
    }));
  },
};
