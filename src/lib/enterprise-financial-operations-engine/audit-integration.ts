/**
 * EFOE audit integration — reuses Sprint 1 EAF audit infrastructure.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EfoeAuditEntityType } from "@/types/enterprise-financial-operations-engine";
import { getEfoePorts } from "./composition";

export function recordEfoeAudit(input: {
  entityId: string;
  entityType: EfoeAuditEntityType;
  action: "created" | "modified" | "lifecycle_changed" | "released" | "blocked" | "reversed";
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
        : input.action === "reversed"
          ? "archived"
          : input.action === "modified"
            ? "modified"
            : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: input.previousStateRef,
    newStateRef: input.newStateRef,
    remarks: input.remarks,
  });

  getEfoePorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
