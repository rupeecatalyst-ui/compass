/**
 * EDL ↔ EAF audit integration.
 */

import { appendEafAuditEntry } from "@/lib/enterprise-asset-framework";
import { getEdlPorts } from "./composition";

export function recordEdlAuditLink(input: {
  ledgerId: string;
  actorId: string;
  remarks: string;
  previousStateRef?: string;
  newStateRef?: string;
}): string {
  const auditEntry = appendEafAuditEntry({
    assetId: input.ledgerId,
    action: "created",
    actorId: input.actorId,
    previousStateRef: input.previousStateRef,
    newStateRef: input.newStateRef,
    remarks: input.remarks,
  });

  getEdlPorts().auditReferences.save({
    id: crypto.randomUUID(),
    ledgerId: input.ledgerId,
    eafAuditEntryId: auditEntry.id,
    recordedOn: auditEntry.timestamp,
  });

  return auditEntry.id;
}
