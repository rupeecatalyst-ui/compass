/**
 * EOLE audit integration — reuses Sprint 1 EAF audit infrastructure.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EoleAuditEntityType } from "@/types/enterprise-opportunity-lifecycle-engine";
import { getEolePorts } from "./composition";

export function recordEoleAudit(input: {
  entityId: string;
  entityType: EoleAuditEntityType;
  action: "created" | "modified" | "lifecycle_changed" | "assigned" | "closed" | "hold" | "resumed";
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
        : input.action === "closed"
          ? "archived"
          : input.action === "modified"
            ? "modified"
            : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: input.previousStateRef,
    newStateRef: input.newStateRef,
    remarks: input.remarks,
  });

  getEolePorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
