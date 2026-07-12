/**
 * EEI audit integration.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EeiAuditReference } from "@/types/enterprise-experience-intelligence";
import { getEeiPorts } from "./composition";

export function recordEeiAudit(input: {
  entityId: string;
  entityType: EeiAuditReference["entityType"];
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

  getEeiPorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
