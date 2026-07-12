/**
 * EAC audit integration.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EacAuditReference } from "@/types/enterprise-advisory-console";
import { getEacPorts } from "./composition";

export function recordEacAudit(input: {
  entityId: string;
  entityType: EacAuditReference["entityType"];
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

  getEacPorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
