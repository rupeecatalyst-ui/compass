/**
 * ECM audit integration — Enterprise Audit Log bridge (EAF).
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
  /** Field-level change trail (employment / contact updates). */
  field?: string;
  previousValue?: string;
  newValue?: string;
}): void {
  const fieldLabel = input.field?.trim();
  const prev = input.previousValue ?? "";
  const next = input.newValue ?? "";
  const remarks =
    input.remarks ??
    (fieldLabel
      ? `ECM ${fieldLabel}: "${prev || "(empty)"}" → "${next || "(empty)"}"`
      : undefined);

  const auditEntry = appendEafAuditEntry({
    assetId: input.entityId,
    action:
      input.action === "created"
        ? "created"
        : input.action === "modified"
          ? "modified"
          : "lifecycle_changed",
    actorId: input.actorId,
    remarks,
    previousStateRef: fieldLabel ? JSON.stringify({ field: fieldLabel, value: prev }) : undefined,
    newStateRef: fieldLabel ? JSON.stringify({ field: fieldLabel, value: next }) : undefined,
    changeSetRef: fieldLabel || undefined,
  });

  getEcmPorts().auditReferences.save({
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });
}
