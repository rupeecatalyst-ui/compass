/**
 * EOWE hierarchy validation — configuration-driven rules.
 */

import { EOWE_HIERARCHY_LEVEL_DEFINITIONS, EOWE_LIFECYCLE_TRANSITIONS } from "@/constants/enterprise-organization-workspace-engine";
import type {
  EoweHierarchyNode,
  EoweHierarchyNodeType,
  EoweOrgLifecycleStatus,
  EowePositionRecord,
} from "@/types/enterprise-organization-workspace-engine";
import type { EoweHierarchyRepositoryPort } from "@/types/enterprise-organization-workspace-engine-ports";

export function getEoweHierarchyLevelDefinition(
  nodeType: EoweHierarchyNodeType,
) {
  return EOWE_HIERARCHY_LEVEL_DEFINITIONS.find((d) => d.nodeType === nodeType && d.enabled);
}

export function validateEoweTenantBoundary(
  nodeTenantId: string,
  parentTenantId: string | undefined,
): void {
  if (parentTenantId && nodeTenantId !== parentTenantId) {
    throw new Error(
      "EOWE validation: child node tenant must match parent tenant — multi-tenant boundary violation.",
    );
  }
}

export function validateEoweParentChildRelationship(
  childType: EoweHierarchyNodeType,
  parent: EoweHierarchyNode | undefined,
): void {
  const levelDef = getEoweHierarchyLevelDefinition(childType);
  if (!levelDef) {
    throw new Error(`EOWE validation: unknown node type "${childType}".`);
  }

  if (levelDef.allowedParentTypes.length === 0) {
    if (parent) {
      throw new Error(`EOWE validation: "${childType}" nodes cannot have a parent.`);
    }
    return;
  }

  if (!parent) {
    throw new Error(`EOWE validation: "${childType}" requires a parent node.`);
  }

  if (!levelDef.allowedParentTypes.includes(parent.nodeType)) {
    throw new Error(
      `EOWE validation: "${childType}" cannot be child of "${parent.nodeType}". Allowed parents: ${levelDef.allowedParentTypes.join(", ")}.`,
    );
  }

  validateEoweTenantBoundary(parent.tenantId, parent.tenantId);
}

export function validateEoweNodeCodeUniqueness(
  repo: EoweHierarchyRepositoryPort,
  tenantId: string,
  nodeCode: string,
  nodeType: EoweHierarchyNodeType,
  excludeId?: string,
): void {
  const duplicate = repo
    .listByTenant(tenantId)
    .find((n) => n.nodeCode === nodeCode && n.nodeType === nodeType && n.id !== excludeId);
  if (duplicate) {
    throw new Error(
      `EOWE validation: node code "${nodeCode}" already exists for type "${nodeType}" in tenant.`,
    );
  }
}

export function validateEoweLifecycleTransition(
  from: EoweOrgLifecycleStatus,
  to: EoweOrgLifecycleStatus,
): void {
  const allowed = EOWE_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`EOWE validation: cannot transition lifecycle from "${from}" to "${to}".`);
  }
}

export function validateEoweReportingHierarchy(
  repo: EoweHierarchyRepositoryPort,
  position: EowePositionRecord,
): void {
  if (!position.reportsToPositionId) return;

  if (position.reportsToPositionId === position.id) {
    throw new Error("EOWE validation: position cannot report to itself.");
  }

  const manager = repo.findById(position.reportsToPositionId);
  if (!manager || manager.nodeType !== "position") {
    throw new Error("EOWE validation: reportsToPositionId must reference a valid position.");
  }

  if (manager.tenantId !== position.tenantId) {
    throw new Error("EOWE validation: reporting hierarchy must stay within tenant boundary.");
  }

  if (detectEoweReportingCycle(repo, position.id, position.reportsToPositionId)) {
    throw new Error("EOWE validation: reporting hierarchy cycle detected.");
  }
}

function detectEoweReportingCycle(
  repo: EoweHierarchyRepositoryPort,
  positionId: string,
  reportsToId: string,
): boolean {
  const visited = new Set<string>();
  let current: string | undefined = reportsToId;

  while (current) {
    if (current === positionId) return true;
    if (visited.has(current)) return true;
    visited.add(current);

    const node = repo.findById(current);
    if (!node || node.nodeType !== "position") break;
    current = (node as EowePositionRecord).reportsToPositionId;
  }

  return false;
}

export function validateEoweHierarchyNode(
  repo: EoweHierarchyRepositoryPort,
  node: EoweHierarchyNode,
  existing?: EoweHierarchyNode,
): void {
  validateEoweNodeCodeUniqueness(repo, node.tenantId, node.nodeCode, node.nodeType, existing?.id);

  const parent = node.parentNodeId ? repo.findById(node.parentNodeId) : undefined;
  validateEoweParentChildRelationship(node.nodeType, parent);

  if (parent) {
    validateEoweTenantBoundary(node.tenantId, parent.tenantId);
  }

  if (node.nodeType === "position") {
    validateEoweReportingHierarchy(repo, node as EowePositionRecord);
  }

  if (existing && existing.tenantId !== node.tenantId) {
    throw new Error("EOWE validation: tenantId is immutable after node creation.");
  }
}
