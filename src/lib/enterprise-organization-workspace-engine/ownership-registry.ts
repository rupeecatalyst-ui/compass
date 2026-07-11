/**
 * EOWE ownership registry.
 */

import type { EoweOwnershipRecord } from "@/types/enterprise-organization-workspace-engine";
import { getEowePorts } from "./composition";
import { getEoweHierarchyNodeById } from "./organization-registry";

export function listEoweOwnershipRecords(entityNodeId?: string): EoweOwnershipRecord[] {
  return entityNodeId
    ? getEowePorts().ownerships.listByEntity(entityNodeId)
    : getEowePorts().ownerships.list();
}

export function registerEoweOwnership(input: {
  tenantId: string;
  entityNodeId: string;
  ownerRef: string;
  ownershipType: EoweOwnershipRecord["ownershipType"];
  createdBy: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}): EoweOwnershipRecord {
  const entity = getEoweHierarchyNodeById(input.entityNodeId);
  if (!entity) {
    throw new Error(`EOWE: entity node "${input.entityNodeId}" not found.`);
  }
  if (entity.tenantId !== input.tenantId) {
    throw new Error("EOWE: ownership tenant must match entity node tenant.");
  }

  const ownership: EoweOwnershipRecord = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    entityNodeId: input.entityNodeId,
    entityNodeType: entity.nodeType,
    ownerRef: input.ownerRef,
    ownershipType: input.ownershipType,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    enabled: true,
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
  };

  getEowePorts().ownerships.save(ownership);
  return ownership;
}
