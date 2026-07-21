/**
 * CO-SPRINT-119 — Soft Delete Recovery ledger + audit (Prisma).
 */

import type { SoftDeleteAuditAction, SoftDeleteLifecycleStatus } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { softDeletePurgeEligibleAt } from "@/constants/enterprise-soft-delete";
import type {
  SoftDeleteActor,
  SoftDeleteAuditEntry,
  SoftDeleteModuleId,
  SoftDeleteRecoveryRecord,
} from "@/types/enterprise-soft-delete";

function mapRecord(row: {
  id: string;
  module: string;
  entityId: string;
  entityLabel: string;
  ownerName: string | null;
  originalOwner: string | null;
  deletedBy: string;
  deletedByName: string | null;
  deletedAt: Date;
  deletionReason: string | null;
  status: SoftDeleteLifecycleStatus;
  restoredAt: Date | null;
  restoredBy: string | null;
  permanentlyDeletedAt: Date | null;
  purgeEligibleAt: Date | null;
}): SoftDeleteRecoveryRecord {
  return {
    id: row.id,
    module: row.module as SoftDeleteModuleId,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    ownerName: row.ownerName,
    deletedBy: row.deletedBy,
    deletedByName: row.deletedByName,
    deletedAt: row.deletedAt.toISOString(),
    deletionReason: row.deletionReason,
    originalOwner: row.originalOwner,
    status: row.status,
    restoredAt: row.restoredAt?.toISOString() ?? null,
    restoredBy: row.restoredBy,
    permanentlyDeletedAt: row.permanentlyDeletedAt?.toISOString() ?? null,
    purgeEligibleAt: row.purgeEligibleAt?.toISOString() ?? null,
  };
}

function mapAudit(row: {
  id: string;
  module: string;
  entityId: string;
  entityLabel: string;
  action: SoftDeleteAuditAction;
  actorUserId: string;
  actorName: string | null;
  reason: string | null;
  at: Date;
}): SoftDeleteAuditEntry {
  return {
    id: row.id,
    module: row.module as SoftDeleteModuleId,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    action: row.action,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    reason: row.reason,
    at: row.at.toISOString(),
  };
}

export class SoftDeleteLedgerRepository {
  async recordSoftDelete(input: {
    organizationId: string;
    module: SoftDeleteModuleId;
    entityId: string;
    entityLabel: string;
    ownerName: string | null;
    originalOwner: string | null;
    actor: SoftDeleteActor;
    reason?: string;
  }): Promise<SoftDeleteRecoveryRecord> {
    const deletedAt = new Date();
    const row = await prisma.enterpriseSoftDeleteRecord.upsert({
      where: {
        organizationId_module_entityId: {
          organizationId: input.organizationId,
          module: input.module,
          entityId: input.entityId,
        },
      },
      create: {
        organizationId: input.organizationId,
        module: input.module,
        entityId: input.entityId,
        entityLabel: input.entityLabel,
        ownerName: input.ownerName,
        originalOwner: input.originalOwner,
        deletedBy: input.actor.userId,
        deletedByName: input.actor.displayName ?? null,
        deletedAt,
        deletionReason: input.reason?.trim() || null,
        status: "deleted",
        purgeEligibleAt: softDeletePurgeEligibleAt(deletedAt),
      },
      update: {
        entityLabel: input.entityLabel,
        ownerName: input.ownerName,
        originalOwner: input.originalOwner,
        deletedBy: input.actor.userId,
        deletedByName: input.actor.displayName ?? null,
        deletedAt,
        deletionReason: input.reason?.trim() || null,
        status: "deleted",
        restoredAt: null,
        restoredBy: null,
        permanentlyDeletedAt: null,
        permanentlyDeletedBy: null,
        purgeEligibleAt: softDeletePurgeEligibleAt(deletedAt),
      },
    });
    return mapRecord(row);
  }

  async markRestored(input: {
    organizationId: string;
    module: SoftDeleteModuleId;
    entityId: string;
    actor: SoftDeleteActor;
  }): Promise<SoftDeleteRecoveryRecord | null> {
    const existing = await prisma.enterpriseSoftDeleteRecord.findUnique({
      where: {
        organizationId_module_entityId: {
          organizationId: input.organizationId,
          module: input.module,
          entityId: input.entityId,
        },
      },
    });
    if (!existing) return null;
    const row = await prisma.enterpriseSoftDeleteRecord.update({
      where: { id: existing.id },
      data: {
        status: "restored",
        restoredAt: new Date(),
        restoredBy: input.actor.userId,
      },
    });
    return mapRecord(row);
  }

  async markPurged(input: {
    organizationId: string;
    module: SoftDeleteModuleId;
    entityId: string;
    actor: SoftDeleteActor;
  }): Promise<SoftDeleteRecoveryRecord | null> {
    const existing = await prisma.enterpriseSoftDeleteRecord.findUnique({
      where: {
        organizationId_module_entityId: {
          organizationId: input.organizationId,
          module: input.module,
          entityId: input.entityId,
        },
      },
    });
    if (!existing) return null;
    const row = await prisma.enterpriseSoftDeleteRecord.update({
      where: { id: existing.id },
      data: {
        status: "purged",
        permanentlyDeletedAt: new Date(),
        permanentlyDeletedBy: input.actor.userId,
      },
    });
    return mapRecord(row);
  }

  async listDeleted(
    organizationId: string,
    module?: SoftDeleteModuleId,
  ): Promise<SoftDeleteRecoveryRecord[]> {
    const rows = await prisma.enterpriseSoftDeleteRecord.findMany({
      where: {
        organizationId,
        status: "deleted",
        ...(module ? { module } : {}),
      },
      orderBy: { deletedAt: "desc" },
    });
    return rows.map(mapRecord);
  }

  async writeAudit(input: {
    organizationId: string;
    module: SoftDeleteModuleId;
    entityId: string;
    entityLabel: string;
    action: SoftDeleteAuditAction;
    actor: SoftDeleteActor;
    reason?: string | null;
  }): Promise<SoftDeleteAuditEntry> {
    const row = await prisma.enterpriseSoftDeleteAudit.create({
      data: {
        organizationId: input.organizationId,
        module: input.module,
        entityId: input.entityId,
        entityLabel: input.entityLabel,
        action: input.action,
        actorUserId: input.actor.userId,
        actorName: input.actor.displayName ?? null,
        reason: input.reason?.trim() || null,
      },
    });
    return mapAudit(row);
  }

  async listAudits(
    organizationId: string,
    limit = 50,
  ): Promise<SoftDeleteAuditEntry[]> {
    const rows = await prisma.enterpriseSoftDeleteAudit.findMany({
      where: { organizationId },
      orderBy: { at: "desc" },
      take: limit,
    });
    return rows.map(mapAudit);
  }
}

export const softDeleteLedgerRepository = new SoftDeleteLedgerRepository();
