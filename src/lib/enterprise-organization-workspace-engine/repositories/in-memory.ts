/**
 * EOWE in-memory adapters — Sprint 4 default implementation.
 */

import type {
  EoweHierarchyNode,
  EoweOrganizationMetadata,
  EoweOwnershipRecord,
  EoweTenantBoundary,
  EoweWorkspaceRecord,
} from "@/types/enterprise-organization-workspace-engine";
import type { EowePorts } from "@/types/enterprise-organization-workspace-engine-ports";

function createMutableListStore<T>(): {
  list: () => T[];
  replaceAll: (items: T[]) => void;
  upsert: (item: T, key: (item: T) => string) => void;
} {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next) => {
      items = next;
    },
    upsert: (item, key) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
  };
}

export function createInMemoryEowePorts(): EowePorts {
  const tenants = createMutableListStore<EoweTenantBoundary>();
  const nodes = createMutableListStore<EoweHierarchyNode>();
  const workspaces = createMutableListStore<EoweWorkspaceRecord>();
  const ownerships = createMutableListStore<EoweOwnershipRecord>();
  const metadata = createMutableListStore<EoweOrganizationMetadata>();

  return {
    tenants: {
      list: () => tenants.list(),
      findByTenantId: (tenantId) => tenants.list().find((t) => t.tenantId === tenantId && t.enabled),
      findByTenantCode: (tenantCode) =>
        tenants.list().find((t) => t.tenantCode === tenantCode && t.enabled),
      save: (tenant) => tenants.upsert(tenant, (t) => t.id),
      replaceAll: (items) => tenants.replaceAll(items),
    },
    hierarchy: {
      list: () => nodes.list(),
      findById: (id) => nodes.list().find((n) => n.id === id),
      listByTenant: (tenantId) => nodes.list().filter((n) => n.tenantId === tenantId),
      listByParent: (parentNodeId) =>
        nodes.list().filter((n) => n.parentNodeId === parentNodeId),
      listByType: (tenantId, nodeType) =>
        nodes.list().filter((n) => n.tenantId === tenantId && n.nodeType === nodeType),
      save: (node) => nodes.upsert(node, (n) => n.id),
      replaceAll: (items) => nodes.replaceAll(items),
    },
    workspaces: {
      list: () => workspaces.list(),
      findById: (id) => workspaces.list().find((w) => w.id === id),
      listByTenant: (tenantId) => workspaces.list().filter((w) => w.tenantId === tenantId),
      save: (workspace) => workspaces.upsert(workspace, (w) => w.id),
      replaceAll: (items) => workspaces.replaceAll(items),
    },
    ownerships: {
      list: () => ownerships.list(),
      listByEntity: (entityNodeId) =>
        ownerships.list().filter((o) => o.entityNodeId === entityNodeId && o.enabled),
      save: (ownership) => ownerships.upsert(ownership, (o) => o.id),
      replaceAll: (items) => ownerships.replaceAll(items),
    },
    metadata: {
      list: () => metadata.list(),
      findByNodeId: (nodeId) => metadata.list().find((m) => m.nodeId === nodeId),
      upsert: (entry) => metadata.upsert(entry, (m) => m.id),
      replaceAll: (items) => metadata.replaceAll(items),
    },
  };
}
