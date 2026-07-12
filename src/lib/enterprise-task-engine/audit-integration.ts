/**
 * ETE audit integration.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EteAuditReference } from "@/types/enterprise-task-engine";
import { getEtePorts } from "./composition";

export function recordEteAudit(input: {
  entityId: string;
  entityType: EteAuditReference["entityType"];
  action: "created" | "modified" | "lifecycle_changed";
  actorId: string;
  remarks?: string;
}): void {
  const auditEntry = appendEafAuditEntry({
    assetId: input.entityId,
    action: input.action === "created" ? "created" : input.action === "modified" ? "modified" : "lifecycle_changed",
    actorId: input.actorId,
    remarks: input.remarks,
  });

  getEtePorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
