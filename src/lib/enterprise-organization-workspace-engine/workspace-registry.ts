/**
 * EOWE workspace registry.
 */

import { EOWE_LIFECYCLE_STATUS } from "@/constants/enterprise-organization-workspace-engine";
import type { EoweWorkspaceRecord } from "@/types/enterprise-organization-workspace-engine";
import { recordEoweOrgAudit } from "./audit-integration";
import { getEowePorts } from "./composition";
import { getEoweHierarchyNodeById } from "./organization-registry";

export function listEoweWorkspaces(tenantId?: string): EoweWorkspaceRecord[] {
  return tenantId
    ? getEowePorts().workspaces.listByTenant(tenantId)
    : getEowePorts().workspaces.list();
}

export function registerEoweWorkspace(input: {
  tenantId: string;
  workspaceCode: string;
  displayName: string;
  description?: string;
  anchorNodeId: string;
  createdBy: string;
  metadataRef?: string;
}): EoweWorkspaceRecord {
  const anchor = getEoweHierarchyNodeById(input.anchorNodeId);
  if (!anchor) {
    throw new Error(`EOWE: anchor node "${input.anchorNodeId}" not found.`);
  }
  if (anchor.tenantId !== input.tenantId) {
    throw new Error("EOWE: workspace tenant must match anchor node tenant.");
  }

  const duplicate = getEowePorts()
    .workspaces.listByTenant(input.tenantId)
    .find((w) => w.workspaceCode === input.workspaceCode);
  if (duplicate) {
    throw new Error(`EOWE: workspace code "${input.workspaceCode}" already exists in tenant.`);
  }

  const now = new Date().toISOString();
  const workspace: EoweWorkspaceRecord = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    workspaceCode: input.workspaceCode,
    displayName: input.displayName,
    description: input.description ?? "",
    anchorNodeId: input.anchorNodeId,
    anchorNodeType: anchor.nodeType,
    lifecycleStatus: EOWE_LIFECYCLE_STATUS.DRAFT,
    enabled: true,
    metadataRef: input.metadataRef,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  getEowePorts().workspaces.save(workspace);
  recordEoweOrgAudit({
    nodeId: workspace.id,
    action: "created",
    actorId: input.createdBy,
    remarks: `Created workspace ${workspace.workspaceCode}`,
  });

  return workspace;
}
