/**
 * ECM audit integration.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EcmAuditReference } from "@/types/enterprise-contact-master";
import { getEcmPorts } from "./composition";

export function recordEcmAudit(input: {
  entityId: string;
  entityType: EcmAuditReference["entityType"];
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

  getEcmPorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
