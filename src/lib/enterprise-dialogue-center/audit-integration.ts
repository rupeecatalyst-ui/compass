/**
 * EDC audit integration.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EdcAuditReference } from "@/types/enterprise-dialogue-center";
import { getEdcPorts } from "./composition";

export function recordEdcAudit(input: {
  entityId: string;
  entityType: EdcAuditReference["entityType"];
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

  getEdcPorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
