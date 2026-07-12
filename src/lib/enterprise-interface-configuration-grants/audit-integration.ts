/**
 * ECG audit integration (SPR-005).
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EcgAuditReference } from "@/types/enterprise-interface-configuration-grants";
import { getEcgPorts } from "./composition";

export function recordEcgAudit(input: {
  entityId: string;
  entityType: EcgAuditReference["entityType"];
  action: "created" | "modified" | "lifecycle_changed";
  actorId: string;
  remarks?: string;
}): void {
  const auditEntry = appendEafAuditEntry({
    assetId: input.entityId,
    action:
      input.action === "created"
        ? "created"
        : input.action === "modified"
          ? "modified"
          : "lifecycle_changed",
    actorId: input.actorId,
    remarks: input.remarks,
  });

  getEcgPorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
