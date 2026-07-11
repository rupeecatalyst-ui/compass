/**
 * EPNE audit integration — reuses Sprint 1 EAF audit infrastructure.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EpneAuditEntityType } from "@/types/enterprise-partner-network-engine";
import { getEpnePorts } from "./composition";

export function recordEpnePartnerAudit(input: {
  entityId: string;
  entityType: EpneAuditEntityType;
  action: "created" | "modified" | "lifecycle_changed" | "archived" | "onboarded" | "activated";
  actorId: string;
  previousStateRef?: string;
  newStateRef?: string;
  remarks?: string;
}): void {
  const auditEntry = appendEafAuditEntry({
    assetId: input.entityId,
    action:
      input.action === "created"
        ? "created"
        : input.action === "archived"
          ? "archived"
          : input.action === "modified"
            ? "modified"
            : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: input.previousStateRef,
    newStateRef: input.newStateRef,
    remarks: input.remarks,
  });

  getEpnePorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
