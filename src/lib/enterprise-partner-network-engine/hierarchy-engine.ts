/**
 * EPNE hierarchy engine — parent-child relationships and tree navigation.
 */

import type { EpnePartnerHierarchyNode } from "@/types/enterprise-partner-network-engine";
import { getEpnePorts } from "./composition";
import { validateEpneParentRelationship } from "./validation-engine";

export function getEpnePartnerHierarchy(partnerId: string): EpnePartnerHierarchyNode | undefined {
  const partner = getEpnePorts().partners.findById(partnerId);
  if (!partner) return undefined;

  const children = getEpnePorts().partners.listByParent(partnerId);
  const depth = computeDepth(partnerId);

  return {
    partnerId: partner.id,
    partnerCode: partner.partnerCode,
    parentPartnerId: partner.parentPartnerId,
    depth,
    childPartnerIds: children.map((c) => c.id),
  };
}

export function getEpnePartnerAncestors(partnerId: string): EpnePartnerHierarchyNode[] {
  const ancestors: EpnePartnerHierarchyNode[] = [];
  const visited = new Set<string>();
  let current = getEpnePorts().partners.findById(partnerId);

  while (current?.parentPartnerId) {
    if (visited.has(current.parentPartnerId)) break;
    visited.add(current.parentPartnerId);
    const parent = getEpnePorts().partners.findById(current.parentPartnerId);
    if (!parent) break;
    const node = getEpnePartnerHierarchy(parent.id);
    if (node) ancestors.push(node);
    current = parent;
  }

  return ancestors;
}

export function getEpnePartnerDescendants(partnerId: string): EpnePartnerHierarchyNode[] {
  const descendants: EpnePartnerHierarchyNode[] = [];
  const queue = getEpnePorts().partners.listByParent(partnerId).map((p) => p.id);
  const visited = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const node = getEpnePartnerHierarchy(id);
    if (node) descendants.push(node);
    queue.push(...getEpnePorts().partners.listByParent(id).map((p) => p.id));
  }

  return descendants;
}

export function setEpneParentPartner(
  partnerId: string,
  parentPartnerId: string | undefined,
  modifiedBy: string,
): void {
  const partner = getEpnePorts().partners.findById(partnerId);
  if (!partner) throw new Error(`EPNE: partner "${partnerId}" not found.`);

  const updated = {
    ...partner,
    parentPartnerId,
    modifiedBy,
    modifiedOn: new Date().toISOString(),
  };

  const issues = validateEpneParentRelationship(updated);
  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length > 0) throw new Error(errors.map((e) => e.message).join("; "));

  getEpnePorts().partners.save(updated);
}

function computeDepth(partnerId: string): number {
  let depth = 0;
  let current = getEpnePorts().partners.findById(partnerId);
  const visited = new Set<string>();

  while (current?.parentPartnerId) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    depth += 1;
    current = getEpnePorts().partners.findById(current.parentPartnerId);
  }

  return depth;
}
