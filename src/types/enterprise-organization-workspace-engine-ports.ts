/**
 * EOWE Ports — repository contracts.
 */

import type {
  EoweHierarchyNode,
  EoweOrganizationMetadata,
  EoweOwnershipRecord,
  EoweRegistrySnapshot,
  EoweTenantBoundary,
  EoweWorkspaceRecord,
} from "./enterprise-organization-workspace-engine";

export interface EoweTenantBoundaryPort {
  list(): EoweTenantBoundary[];
  findByTenantId(tenantId: string): EoweTenantBoundary | undefined;
  findByTenantCode(tenantCode: string): EoweTenantBoundary | undefined;
  save(tenant: EoweTenantBoundary): void;
  replaceAll(tenants: EoweTenantBoundary[]): void;
}

export interface EoweHierarchyRepositoryPort {
  list(): EoweHierarchyNode[];
  findById(id: string): EoweHierarchyNode | undefined;
  listByTenant(tenantId: string): EoweHierarchyNode[];
  listByParent(parentNodeId: string): EoweHierarchyNode[];
  listByType(tenantId: string, nodeType: EoweHierarchyNode["nodeType"]): EoweHierarchyNode[];
  save(node: EoweHierarchyNode): void;
  replaceAll(nodes: EoweHierarchyNode[]): void;
}

export interface EoweWorkspaceRepositoryPort {
  list(): EoweWorkspaceRecord[];
  findById(id: string): EoweWorkspaceRecord | undefined;
  listByTenant(tenantId: string): EoweWorkspaceRecord[];
  save(workspace: EoweWorkspaceRecord): void;
  replaceAll(workspaces: EoweWorkspaceRecord[]): void;
}

export interface EoweOwnershipRepositoryPort {
  list(): EoweOwnershipRecord[];
  listByEntity(entityNodeId: string): EoweOwnershipRecord[];
  save(ownership: EoweOwnershipRecord): void;
  replaceAll(ownerships: EoweOwnershipRecord[]): void;
}

export interface EoweMetadataRepositoryPort {
  list(): EoweOrganizationMetadata[];
  findByNodeId(nodeId: string): EoweOrganizationMetadata | undefined;
  upsert(metadata: EoweOrganizationMetadata): void;
  replaceAll(metadata: EoweOrganizationMetadata[]): void;
}

export interface EowePorts {
  tenants: EoweTenantBoundaryPort;
  hierarchy: EoweHierarchyRepositoryPort;
  workspaces: EoweWorkspaceRepositoryPort;
  ownerships: EoweOwnershipRepositoryPort;
  metadata: EoweMetadataRepositoryPort;
}

export type PartialEowePorts = Partial<EowePorts>;

export type { EoweRegistrySnapshot };
