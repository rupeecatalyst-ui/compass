/**
 * EAF audit framework — append-only audit trail.
 */

import type { EafAuditAction, EafAuditEntry, EafInternalId } from "@/types/enterprise-asset-framework";
import { getEafEventPublisher, getEafPorts } from "./composition";

export function resetEafAuditTrail(): void {
  getEafPorts().audit.replaceAll([]);
}

export function getEafAuditTrail(): EafAuditEntry[] {
  return getEafPorts().audit.list();
}

export function getEafAuditTrailForAsset(assetId: EafInternalId): EafAuditEntry[] {
  return getEafPorts().audit.findByAssetId(assetId);
}

export function appendEafAuditEntry(input: {
  assetId: EafInternalId;
  action: EafAuditAction;
  actorId: string;
  previousStateRef?: string;
  newStateRef?: string;
  changeSetRef?: string;
  remarks?: string;
}): EafAuditEntry {
  const entry: EafAuditEntry = {
    id: crypto.randomUUID(),
    assetId: input.assetId,
    action: input.action,
    actorId: input.actorId,
    timestamp: new Date().toISOString(),
    previousStateRef: input.previousStateRef,
    newStateRef: input.newStateRef,
    changeSetRef: input.changeSetRef,
    remarks: input.remarks,
  };

  getEafPorts().audit.append(entry);

  getEafEventPublisher().publish({
    eventId: crypto.randomUUID(),
    eventType: "audit.recorded",
    timestamp: entry.timestamp,
    actorId: input.actorId,
    assetId: input.assetId,
    action: input.action,
  });

  return entry;
}

export function recordEafAssetCreated(assetId: EafInternalId, actorId: string): EafAuditEntry {
  return appendEafAuditEntry({ assetId, action: "created", actorId });
}

export function recordEafAssetModified(
  assetId: EafInternalId,
  actorId: string,
  changeSetRef?: string,
): EafAuditEntry {
  return appendEafAuditEntry({ assetId, action: "modified", actorId, changeSetRef });
}

export function recordEafAssetDeleted(assetId: EafInternalId, actorId: string): EafAuditEntry {
  return appendEafAuditEntry({ assetId, action: "deleted", actorId });
}

export function recordEafAssetRestored(assetId: EafInternalId, actorId: string): EafAuditEntry {
  return appendEafAuditEntry({ assetId, action: "restored", actorId });
}
