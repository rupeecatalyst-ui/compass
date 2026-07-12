/**
 * LIFE audit integration.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import type { LifeAuditReference } from "@/types/enterprise-life-engine";
import { getLifePorts } from "./composition";

export function recordLifeAudit(input: {
  entityId: string;
  entityType: LifeAuditReference["entityType"];
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

  getLifePorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
