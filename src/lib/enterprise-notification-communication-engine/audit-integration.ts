/**
 * ENCE audit integration.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EnceAuditReference } from "@/types/enterprise-notification-communication-engine";
import { getEncePorts } from "./composition";

export function recordEnceAudit(input: {
  entityId: string;
  entityType: EnceAuditReference["entityType"];
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

  getEncePorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
