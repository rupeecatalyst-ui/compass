/**
 * EOWE hierarchy and lifecycle constants.
 */

import type {
  EoweHierarchyLevelDefinition,
  EoweHierarchyNodeType,
} from "@/types/enterprise-organization-workspace-engine";

export const EOWE_FRAMEWORK_VERSION = "4.0.0";

export const EOWE_LIFECYCLE_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  ARCHIVED: "archived",
} as const;

export const EOWE_NODE_TYPES = {
  ORGANIZATION: "organization",
  BUSINESS_UNIT: "business_unit",
  REGION: "region",
  ZONE: "zone",
  BRANCH: "branch",
  DEPARTMENT: "department",
  TEAM: "team",
  POSITION: "position",
} as const;

export const EOWE_OWNERSHIP_TYPES = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
  DELEGATED: "delegated",
  TEMPORARY: "temporary",
} as const;

/** Configuration-driven hierarchy levels and valid parent relationships. */
export const EOWE_HIERARCHY_LEVEL_DEFINITIONS: EoweHierarchyLevelDefinition[] = [
  { nodeType: "organization", label: "Organization", allowedParentTypes: [], sortOrder: 1, enabled: true },
  { nodeType: "business_unit", label: "Business Unit", allowedParentTypes: ["organization"], sortOrder: 2, enabled: true },
  { nodeType: "region", label: "Region", allowedParentTypes: ["business_unit"], sortOrder: 3, enabled: true },
  { nodeType: "zone", label: "Zone", allowedParentTypes: ["region"], sortOrder: 4, enabled: true },
  { nodeType: "branch", label: "Branch", allowedParentTypes: ["zone"], sortOrder: 5, enabled: true },
  { nodeType: "department", label: "Department", allowedParentTypes: ["branch", "business_unit"], sortOrder: 6, enabled: true },
  { nodeType: "team", label: "Team", allowedParentTypes: ["department", "branch"], sortOrder: 7, enabled: true },
  { nodeType: "position", label: "Position", allowedParentTypes: ["team", "department"], sortOrder: 8, enabled: true },
];

export const EOWE_HIERARCHY_NODE_TYPE_LIST: EoweHierarchyNodeType[] =
  EOWE_HIERARCHY_LEVEL_DEFINITIONS.map((d) => d.nodeType);

export const EOWE_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  draft: ["active", "archived"],
  active: ["suspended", "archived"],
  suspended: ["active", "archived"],
  archived: [],
};
