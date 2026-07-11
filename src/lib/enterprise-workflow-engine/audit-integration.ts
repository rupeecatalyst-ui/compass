/**
 * EWE audit integration — reuses Sprint 1 EAF audit infrastructure.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EweAuditEntityType } from "@/types/enterprise-workflow-engine";
import { getEwePorts } from "./composition";

export function recordEweWorkflowAudit(input: {
  entityId: string;
  entityType: EweAuditEntityType;
  action: "created" | "modified" | "lifecycle_changed" | "transitioned" | "archived";
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

  getEwePorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
