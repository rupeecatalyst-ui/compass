/**
 * CO-SPRINT-119 — Enterprise Soft Delete & Recovery service (orchestrator).
 */

import { SOFT_DELETE_PURGE_CONFIRMATION_WORD } from "@/constants/enterprise-soft-delete";
import {
  assertPermanentDeletePermission,
  assertRestorePermission,
  assertSoftDeletePermission,
} from "@/lib/enterprise-soft-delete/permissions";
import { softDeleteLedgerRepository } from "@server/repositories/soft-delete/ledger.repository";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { contactSoftDeleteAdapter } from "./adapters/contact.adapter";
import { companySoftDeleteAdapter } from "./adapters/company.adapter";
import {
  documentSoftDeleteAdapter,
  loanFileSoftDeleteAdapter,
  noteSoftDeleteAdapter,
  opportunitySoftDeleteAdapter,
  taskSoftDeleteAdapter,
  workflowSoftDeleteAdapter,
} from "./adapters/stub.adapters";
import type {
  SoftDeleteActor,
  SoftDeleteAuditEntry,
  SoftDeleteModuleAdapter,
  SoftDeleteModuleId,
  SoftDeleteRecoveryRecord,
} from "@/types/enterprise-soft-delete";

const ADAPTERS: Record<SoftDeleteModuleId, SoftDeleteModuleAdapter> = {
  contacts: contactSoftDeleteAdapter,
  companies: companySoftDeleteAdapter,
  opportunities: opportunitySoftDeleteAdapter,
  loan_files: loanFileSoftDeleteAdapter,
  documents: documentSoftDeleteAdapter,
  tasks: taskSoftDeleteAdapter,
  notes: noteSoftDeleteAdapter,
  workflow_instances: workflowSoftDeleteAdapter,
};

function getAdapter(module: SoftDeleteModuleId): SoftDeleteModuleAdapter {
  const adapter = ADAPTERS[module];
  if (!adapter) throw new Error(`Unknown soft-delete module: ${module}`);
  return adapter;
}

export class SoftDeleteService {
  listModules() {
    return Object.values(ADAPTERS).map((a) => ({
      module: a.module,
      label: a.label,
      capabilities: a.capabilities,
    }));
  }

  async softDelete(input: {
    module: SoftDeleteModuleId;
    entityId: string;
    actor: SoftDeleteActor;
    reason?: string;
  }): Promise<SoftDeleteRecoveryRecord> {
    assertSoftDeletePermission(input.actor.role);
    const adapter = getAdapter(input.module);
    if (!adapter.capabilities.softDelete) {
      throw new Error(`${adapter.label} does not support soft delete yet.`);
    }

    const organizationId = await resolvePilotOrganizationId();
    const result = await adapter.softDelete(
      input.entityId,
      input.actor,
      input.reason,
    );

    const record = await softDeleteLedgerRepository.recordSoftDelete({
      organizationId,
      module: input.module,
      entityId: input.entityId,
      entityLabel: result.entityLabel,
      ownerName: result.ownerName,
      originalOwner: result.ownerName,
      actor: input.actor,
      reason: input.reason,
    });

    await softDeleteLedgerRepository.writeAudit({
      organizationId,
      module: input.module,
      entityId: input.entityId,
      entityLabel: result.entityLabel,
      action: "soft_deleted",
      actor: input.actor,
      reason: input.reason,
    });

    return record;
  }

  async restore(input: {
    module: SoftDeleteModuleId;
    entityId: string;
    actor: SoftDeleteActor;
  }): Promise<SoftDeleteRecoveryRecord | { entityLabel: string }> {
    assertRestorePermission(input.actor.role);
    const adapter = getAdapter(input.module);
    if (!adapter.capabilities.restore) {
      throw new Error(`${adapter.label} does not support restore yet.`);
    }

    const organizationId = await resolvePilotOrganizationId();
    const result = await adapter.restore(input.entityId, input.actor);

    const record = await softDeleteLedgerRepository.markRestored({
      organizationId,
      module: input.module,
      entityId: input.entityId,
      actor: input.actor,
    });

    await softDeleteLedgerRepository.writeAudit({
      organizationId,
      module: input.module,
      entityId: input.entityId,
      entityLabel: result.entityLabel,
      action: "restored",
      actor: input.actor,
    });

    return record ?? { entityLabel: result.entityLabel };
  }

  async permanentlyDelete(input: {
    module: SoftDeleteModuleId;
    entityId: string;
    actor: SoftDeleteActor;
    confirmation: string;
  }): Promise<{ entityLabel: string }> {
    assertPermanentDeletePermission(input.actor.role);
    if (input.confirmation !== SOFT_DELETE_PURGE_CONFIRMATION_WORD) {
      throw Object.assign(
        new Error(`Type ${SOFT_DELETE_PURGE_CONFIRMATION_WORD} to confirm permanent deletion.`),
        { statusCode: 400, code: "CONFIRMATION_REQUIRED" },
      );
    }

    const adapter = getAdapter(input.module);
    if (!adapter.capabilities.permanentDelete) {
      throw new Error(`${adapter.label} does not support permanent delete yet.`);
    }

    const organizationId = await resolvePilotOrganizationId();
    const result = await adapter.permanentDelete(input.entityId, input.actor);

    await softDeleteLedgerRepository.markPurged({
      organizationId,
      module: input.module,
      entityId: input.entityId,
      actor: input.actor,
    });

    await softDeleteLedgerRepository.writeAudit({
      organizationId,
      module: input.module,
      entityId: input.entityId,
      entityLabel: result.entityLabel,
      action: "permanently_deleted",
      actor: input.actor,
    });

    return result;
  }

  async listRecovery(
    module?: SoftDeleteModuleId,
  ): Promise<SoftDeleteRecoveryRecord[]> {
    const organizationId = await resolvePilotOrganizationId();
    const ledger = await softDeleteLedgerRepository.listDeleted(organizationId, module);
    if (ledger.length > 0) return ledger;

    // Fallback: entity tables may have soft-deleted rows without ledger (e.g. legacy archive).
    if (module) {
      const adapter = getAdapter(module);
      const rows = await adapter.listDeleted();
      return rows.map((row) => ({
        id: `${module}:${row.entityId}`,
        module,
        entityId: row.entityId,
        entityLabel: row.entityLabel,
        ownerName: row.ownerName,
        deletedBy: row.deletedBy,
        deletedByName: null,
        deletedAt: row.deletedAt,
        deletionReason: row.deletionReason,
        originalOwner: row.ownerName,
        status: "deleted" as const,
        restoredAt: null,
        restoredBy: null,
        permanentlyDeletedAt: null,
        purgeEligibleAt: null,
      }));
    }

    const all: SoftDeleteRecoveryRecord[] = [];
    for (const adapter of Object.values(ADAPTERS)) {
      if (!adapter.capabilities.listDeleted) continue;
      const rows = await adapter.listDeleted();
      for (const row of rows) {
        all.push({
          id: `${adapter.module}:${row.entityId}`,
          module: adapter.module,
          entityId: row.entityId,
          entityLabel: row.entityLabel,
          ownerName: row.ownerName,
          deletedBy: row.deletedBy,
          deletedByName: null,
          deletedAt: row.deletedAt,
          deletionReason: row.deletionReason,
          originalOwner: row.ownerName,
          status: "deleted",
          restoredAt: null,
          restoredBy: null,
          permanentlyDeletedAt: null,
          purgeEligibleAt: null,
        });
      }
    }
    return all.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  }

  async listAudits(limit = 50): Promise<SoftDeleteAuditEntry[]> {
    const organizationId = await resolvePilotOrganizationId();
    return softDeleteLedgerRepository.listAudits(organizationId, limit);
  }
}

export const softDeleteService = new SoftDeleteService();
