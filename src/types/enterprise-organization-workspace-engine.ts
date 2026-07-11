/**
 * Enterprise Organization & Workspace Engine (EOWE) — Sprint 4 Foundation.
 *
 * Modular, configuration-driven organization hierarchy.
 * No loan workflows. No business-specific assumptions.
 */

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export type EoweOrgLifecycleStatus = "draft" | "active" | "suspended" | "archived";

export type EoweOrgLifecycleAction = "activate" | "deactivate" | "suspend" | "archive";

// ---------------------------------------------------------------------------
// Hierarchy node types — extensible without redesign
// ---------------------------------------------------------------------------

export type EoweHierarchyNodeType =
  | "organization"
  | "business_unit"
  | "region"
  | "zone"
  | "branch"
  | "department"
  | "team"
  | "position";

export interface EoweHierarchyNodeBase {
  id: string;
  tenantId: string;
  nodeCode: string;
  nodeType: EoweHierarchyNodeType;
  displayName: string;
  description: string;
  parentNodeId?: string;
  lifecycleStatus: EoweOrgLifecycleStatus;
  enabled: boolean;
  sortOrder: number;
  metadataRef?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EoweOrganizationRecord extends EoweHierarchyNodeBase {
  nodeType: "organization";
  legalName?: string;
  registrationRef?: string;
}

export interface EoweBusinessUnitRecord extends EoweHierarchyNodeBase {
  nodeType: "business_unit";
}

export interface EoweRegionRecord extends EoweHierarchyNodeBase {
  nodeType: "region";
}

export interface EoweZoneRecord extends EoweHierarchyNodeBase {
  nodeType: "zone";
}

export interface EoweBranchRecord extends EoweHierarchyNodeBase {
  nodeType: "branch";
}

export interface EoweDepartmentRecord extends EoweHierarchyNodeBase {
  nodeType: "department";
}

export interface EoweTeamRecord extends EoweHierarchyNodeBase {
  nodeType: "team";
}

export interface EowePositionRecord extends EoweHierarchyNodeBase {
  nodeType: "position";
  /** Reporting hierarchy — position reports to this position id. */
  reportsToPositionId?: string;
  positionLevel: number;
}

export type EoweHierarchyNode =
  | EoweOrganizationRecord
  | EoweBusinessUnitRecord
  | EoweRegionRecord
  | EoweZoneRecord
  | EoweBranchRecord
  | EoweDepartmentRecord
  | EoweTeamRecord
  | EowePositionRecord;

// ---------------------------------------------------------------------------
// Workspace model
// ---------------------------------------------------------------------------

export interface EoweWorkspaceRecord {
  id: string;
  tenantId: string;
  workspaceCode: string;
  displayName: string;
  description: string;
  /** Organization or business unit this workspace belongs to. */
  anchorNodeId: string;
  anchorNodeType: EoweHierarchyNodeType;
  lifecycleStatus: EoweOrgLifecycleStatus;
  enabled: boolean;
  metadataRef?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Ownership model
// ---------------------------------------------------------------------------

export type EoweOwnershipType = "primary" | "secondary" | "delegated" | "temporary";

export interface EoweOwnershipRecord {
  id: string;
  tenantId: string;
  entityNodeId: string;
  entityNodeType: EoweHierarchyNodeType;
  ownerRef: string;
  ownershipType: EoweOwnershipType;
  effectiveFrom?: string;
  effectiveTo?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Organization metadata
// ---------------------------------------------------------------------------

export type EoweMetadataBag = Record<string, string | number | boolean | string[] | null>;

export interface EoweOrganizationMetadata {
  id: string;
  tenantId: string;
  nodeId: string;
  nodeType: EoweHierarchyNodeType;
  metadata: EoweMetadataBag;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Multi-tenant boundaries
// ---------------------------------------------------------------------------

export interface EoweTenantBoundary {
  id: string;
  tenantId: string;
  tenantCode: string;
  displayName: string;
  description: string;
  isolationLevel: "strict" | "shared_read" | "federated";
  enabled: boolean;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Hierarchy configuration
// ---------------------------------------------------------------------------

export interface EoweHierarchyLevelDefinition {
  nodeType: EoweHierarchyNodeType;
  label: string;
  allowedParentTypes: EoweHierarchyNodeType[];
  sortOrder: number;
  enabled: boolean;
}

export interface EoweRegistrySnapshot {
  tenants: EoweTenantBoundary[];
  nodes: EoweHierarchyNode[];
  workspaces: EoweWorkspaceRecord[];
  ownerships: EoweOwnershipRecord[];
  metadata: EoweOrganizationMetadata[];
}
