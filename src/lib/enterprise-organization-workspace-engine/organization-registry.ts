/**
 * EOWE organization hierarchy registry.
 */

import { EOWE_LIFECYCLE_STATUS, EOWE_NODE_TYPES } from "@/constants/enterprise-organization-workspace-engine";
import type {
  EoweHierarchyNode,
  EoweHierarchyNodeBase,
  EoweOrgLifecycleAction,
  EoweOrgLifecycleStatus,
  EoweOrganizationRecord,
  EowePositionRecord,
  EoweTenantBoundary,
} from "@/types/enterprise-organization-workspace-engine";
import { recordEoweOrgAudit } from "./audit-integration";
import { getEowePorts } from "./composition";
import { validateEoweHierarchyNode, validateEoweLifecycleTransition } from "./hierarchy-validator";

type CreateNodeInput = Omit<
  EoweHierarchyNodeBase,
  "id" | "createdOn" | "modifiedOn" | "lifecycleStatus" | "enabled" | "description" | "sortOrder" | "modifiedBy"
> &
  Partial<Pick<EoweHierarchyNodeBase, "enabled" | "description" | "sortOrder">> &
  Partial<Pick<EowePositionRecord, "reportsToPositionId" | "positionLevel">> &
  Partial<Pick<EoweOrganizationRecord, "legalName" | "registrationRef">>;

function saveEoweNode(node: EoweHierarchyNode): void {
  const existing = getEowePorts().hierarchy.findById(node.id);
  validateEoweHierarchyNode(getEowePorts().hierarchy, node, existing);
  getEowePorts().hierarchy.save(node);
}

export function registerEoweTenantBoundary(input: {
  tenantId: string;
  tenantCode: string;
  displayName: string;
  description?: string;
  isolationLevel?: EoweTenantBoundary["isolationLevel"];
}): EoweTenantBoundary {
  const duplicate = getEowePorts().tenants.findByTenantCode(input.tenantCode);
  if (duplicate && duplicate.tenantId !== input.tenantId) {
    throw new Error(`EOWE: tenant code "${input.tenantCode}" is already registered.`);
  }

  const tenant: EoweTenantBoundary = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    tenantCode: input.tenantCode,
    displayName: input.displayName,
    description: input.description ?? "",
    isolationLevel: input.isolationLevel ?? "strict",
    enabled: true,
    createdOn: new Date().toISOString(),
  };

  getEowePorts().tenants.save(tenant);
  return tenant;
}

export function createEoweHierarchyNode(input: CreateNodeInput): EoweHierarchyNode {
  const tenant = getEowePorts().tenants.findByTenantId(input.tenantId);
  if (!tenant?.enabled) {
    throw new Error(`EOWE: tenant "${input.tenantId}" is not registered or disabled.`);
  }

  const now = new Date().toISOString();
  const base: EoweHierarchyNodeBase = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    nodeCode: input.nodeCode,
    nodeType: input.nodeType,
    displayName: input.displayName,
    description: input.description ?? "",
    parentNodeId: input.parentNodeId,
    lifecycleStatus: EOWE_LIFECYCLE_STATUS.DRAFT,
    enabled: input.enabled ?? true,
    sortOrder: input.sortOrder ?? 1,
    metadataRef: input.metadataRef,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  let node: EoweHierarchyNode;
  if (input.nodeType === EOWE_NODE_TYPES.ORGANIZATION) {
    node = {
      ...base,
      nodeType: "organization",
      legalName: input.legalName,
      registrationRef: input.registrationRef,
    };
  } else if (input.nodeType === EOWE_NODE_TYPES.POSITION) {
    node = {
      ...base,
      nodeType: "position",
      reportsToPositionId: input.reportsToPositionId,
      positionLevel: input.positionLevel ?? 1,
    };
  } else {
    node = { ...base, nodeType: input.nodeType } as EoweHierarchyNode;
  }

  saveEoweNode(node);
  recordEoweOrgAudit({
    nodeId: node.id,
    action: "created",
    actorId: input.createdBy,
    newStateRef: node.lifecycleStatus,
    remarks: `Created ${node.nodeType} ${node.nodeCode}`,
  });

  return node;
}

export function getEoweHierarchyNodeById(id: string): EoweHierarchyNode | undefined {
  return getEowePorts().hierarchy.findById(id);
}

export function listEoweHierarchyNodes(tenantId?: string): EoweHierarchyNode[] {
  return tenantId
    ? getEowePorts().hierarchy.listByTenant(tenantId)
    : getEowePorts().hierarchy.list();
}

export function getEoweChildNodes(parentNodeId: string): EoweHierarchyNode[] {
  return getEowePorts().hierarchy.listByParent(parentNodeId);
}

export function transitionEoweOrgLifecycle(input: {
  nodeId: string;
  action: EoweOrgLifecycleAction;
  actorId: string;
  remarks?: string;
}): EoweHierarchyNode | undefined {
  const node = getEoweHierarchyNodeById(input.nodeId);
  if (!node) return undefined;

  const target = lifecycleActionToStatus(input.action);
  validateEoweLifecycleTransition(node.lifecycleStatus, target);

  const updated = {
    ...node,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: new Date().toISOString(),
  } as EoweHierarchyNode;

  saveEoweNode(updated);
  recordEoweOrgAudit({
    nodeId: node.id,
    action: target === EOWE_LIFECYCLE_STATUS.ARCHIVED ? "archived" : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: node.lifecycleStatus,
    newStateRef: target,
    remarks: input.remarks,
  });

  return updated;
}

function lifecycleActionToStatus(action: EoweOrgLifecycleAction): EoweOrgLifecycleStatus {
  switch (action) {
    case "activate":
      return EOWE_LIFECYCLE_STATUS.ACTIVE;
    case "deactivate":
      return EOWE_LIFECYCLE_STATUS.SUSPENDED;
    case "suspend":
      return EOWE_LIFECYCLE_STATUS.SUSPENDED;
    case "archive":
      return EOWE_LIFECYCLE_STATUS.ARCHIVED;
  }
}

export function updateEoweHierarchyNode(
  id: string,
  patch: Partial<Pick<EoweHierarchyNodeBase, "displayName" | "description" | "enabled" | "sortOrder" | "metadataRef">>,
  modifiedBy: string,
): EoweHierarchyNode | undefined {
  const existing = getEoweHierarchyNodeById(id);
  if (!existing) return undefined;
  if (existing.lifecycleStatus === EOWE_LIFECYCLE_STATUS.ARCHIVED) {
    throw new Error("EOWE: archived nodes cannot be modified.");
  }

  const updated = {
    ...existing,
    ...patch,
    modifiedBy,
    modifiedOn: new Date().toISOString(),
  } as EoweHierarchyNode;

  saveEoweNode(updated);
  recordEoweOrgAudit({
    nodeId: id,
    action: "modified",
    actorId: modifiedBy,
    remarks: `Updated ${existing.nodeType} ${existing.nodeCode}`,
  });

  return updated;
}
