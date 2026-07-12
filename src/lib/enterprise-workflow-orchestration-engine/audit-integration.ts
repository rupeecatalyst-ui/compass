/**
 * EWOE audit integration.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { EwoeAuditReference } from "@/types/enterprise-workflow-orchestration-engine";
import { getEwoePorts } from "./composition";

export function recordEwoeAudit(input: {
  entityId: string;
  entityType: EwoeAuditReference["entityType"];
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

  getEwoePorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
