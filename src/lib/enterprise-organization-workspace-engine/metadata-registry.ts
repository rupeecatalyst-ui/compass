/**
 * EOWE organization metadata registry.
 */

import type { EoweMetadataBag, EoweOrganizationMetadata } from "@/types/enterprise-organization-workspace-engine";
import { getEowePorts } from "./composition";
import { getEoweHierarchyNodeById } from "./organization-registry";

export function getEoweOrganizationMetadata(nodeId: string): EoweOrganizationMetadata | undefined {
  return getEowePorts().metadata.findByNodeId(nodeId);
}

export function upsertEoweOrganizationMetadata(input: {
  tenantId: string;
  nodeId: string;
  metadata: EoweMetadataBag;
  modifiedBy: string;
}): EoweOrganizationMetadata {
  const node = getEoweHierarchyNodeById(input.nodeId);
  if (!node) {
    throw new Error(`EOWE: node "${input.nodeId}" not found.`);
  }
  if (node.tenantId !== input.tenantId) {
    throw new Error("EOWE: metadata tenant must match node tenant.");
  }

  const existing = getEowePorts().metadata.findByNodeId(input.nodeId);
  const entry: EoweOrganizationMetadata = {
    id: existing?.id ?? crypto.randomUUID(),
    tenantId: input.tenantId,
    nodeId: input.nodeId,
    nodeType: node.nodeType,
    metadata: input.metadata,
    modifiedBy: input.modifiedBy,
    modifiedOn: new Date().toISOString(),
  };

  getEowePorts().metadata.upsert(entry);
  return entry;
}
