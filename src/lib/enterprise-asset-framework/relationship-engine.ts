/**
 * EAF relationship framework — link assets without business logic.
 */

import type {
  EafAssetRelationship,
  EafInternalId,
  EafRelationshipTypeCode,
  EafRelationshipTypeDefinition,
} from "@/types/enterprise-asset-framework";
import { appendEafAuditEntry } from "./audit-engine";
import { getEafEventPublisher, getEafPorts } from "./composition";

export function resetEafRelationships(): void {
  getEafPorts().relationships.replaceAll([]);
}

export function getEafRelationships(): EafAssetRelationship[] {
  return getEafPorts().relationships.list();
}

export function getEafRelationshipsForAsset(assetId: EafInternalId): EafAssetRelationship[] {
  return getEafRelationships().filter(
    (r) => r.activeFlag && (r.sourceAssetId === assetId || r.targetAssetId === assetId),
  );
}

export function getEafOutgoingRelationships(assetId: EafInternalId): EafAssetRelationship[] {
  return getEafRelationships().filter((r) => r.activeFlag && r.sourceAssetId === assetId);
}

export function getEafIncomingRelationships(assetId: EafInternalId): EafAssetRelationship[] {
  return getEafRelationships().filter((r) => r.activeFlag && r.targetAssetId === assetId);
}

export function isEafRelationshipTypeAllowed(
  definition: EafRelationshipTypeDefinition,
  sourceAssetType: string,
  targetAssetType: string,
): boolean {
  if (!definition.enabled) return false;
  const sourceOk =
    definition.sourceAssetTypeCodes.length === 0 ||
    definition.sourceAssetTypeCodes.includes(sourceAssetType);
  const targetOk =
    definition.targetAssetTypeCodes.length === 0 ||
    definition.targetAssetTypeCodes.includes(targetAssetType);
  return sourceOk && targetOk;
}

export function createEafRelationship(input: {
  relationshipTypeCode: EafRelationshipTypeCode;
  sourceAssetId: EafInternalId;
  targetAssetId: EafInternalId;
  createdBy: string;
  label?: string;
  effectiveFrom?: string;
}): EafAssetRelationship {
  const relationship: EafAssetRelationship = {
    id: crypto.randomUUID(),
    relationshipTypeCode: input.relationshipTypeCode,
    sourceAssetId: input.sourceAssetId,
    targetAssetId: input.targetAssetId,
    label: input.label,
    effectiveFrom: input.effectiveFrom,
    activeFlag: true,
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
  };

  getEafPorts().relationships.save(relationship);

  appendEafAuditEntry({
    assetId: input.sourceAssetId,
    action: "relationship_added",
    actorId: input.createdBy,
    newStateRef: relationship.id,
  });

  getEafEventPublisher().publish({
    eventId: crypto.randomUUID(),
    eventType: "relationship.created",
    timestamp: relationship.createdOn,
    actorId: input.createdBy,
    assetId: input.sourceAssetId,
    relationship,
  });

  return relationship;
}

export function deactivateEafRelationship(relationshipId: string, actorId: string): boolean {
  const list = getEafRelationships();
  const idx = list.findIndex((r) => r.id === relationshipId);
  if (idx === -1) return false;

  const updated = { ...list[idx], activeFlag: false };
  getEafPorts().relationships.replaceAll(list.map((r, i) => (i === idx ? updated : r)));

  appendEafAuditEntry({
    assetId: updated.sourceAssetId,
    action: "relationship_removed",
    actorId,
    previousStateRef: relationshipId,
  });

  getEafEventPublisher().publish({
    eventId: crypto.randomUUID(),
    eventType: "relationship.removed",
    timestamp: new Date().toISOString(),
    actorId,
    assetId: updated.sourceAssetId,
    relationshipId,
  });

  return true;
}
