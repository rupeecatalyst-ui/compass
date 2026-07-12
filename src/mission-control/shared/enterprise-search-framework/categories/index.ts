/**
 * Search category taxonomy for the Enterprise Search Framework.
 */

import type { SearchCategory } from "../contracts";

export const SEARCH_FRAMEWORK_CATEGORIES: readonly SearchCategory[] = [
  {
    id: "customers",
    label: "Customers",
    description: "Customer 360 and related parties",
    icon: "Users",
    defaultScopeId: "scope-global",
  },
  {
    id: "opportunities",
    label: "Opportunities",
    description: "Opportunity lifecycle entities",
    icon: "Compass",
    defaultScopeId: "scope-global",
  },
  {
    id: "loans",
    label: "Loans",
    description: "Loan workspace and files",
    icon: "FileText",
    defaultScopeId: "scope-global",
  },
  {
    id: "partners",
    label: "Partners",
    description: "Partner management entities",
    icon: "Handshake",
    defaultScopeId: "scope-global",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Document intelligence artifacts",
    icon: "FolderOpen",
    defaultScopeId: "scope-global",
  },
  {
    id: "products",
    label: "Products",
    description: "Product intelligence catalog",
    icon: "Package",
    defaultScopeId: "scope-global",
  },
  {
    id: "alerts",
    label: "Alerts",
    description: "Enterprise alerts and signals",
    icon: "Bell",
    defaultScopeId: "scope-mission-control",
  },
  {
    id: "users",
    label: "Users",
    description: "Directory and organization users",
    icon: "User",
    defaultScopeId: "scope-global",
  },
  {
    id: "branches",
    label: "Branches",
    description: "Branch and location entities",
    icon: "Building2",
    defaultScopeId: "scope-global",
  },
  {
    id: "workflows",
    label: "Workflows",
    description: "Workflow engine definitions",
    icon: "GitBranch",
    defaultScopeId: "scope-global",
  },
  {
    id: "mission_control",
    label: "Mission Control",
    description: "Mission Control modules and surfaces",
    icon: "Radar",
    defaultScopeId: "scope-mission-control",
  },
  {
    id: "horizon",
    label: "Horizon",
    description: "Strategic initiatives and hierarchy",
    icon: "Orbit",
    defaultScopeId: "scope-horizon",
  },
  {
    id: "security",
    label: "Security",
    description: "Security operations entities",
    icon: "Shield",
    defaultScopeId: "scope-mission-control",
  },
  {
    id: "configuration",
    label: "Configuration",
    description: "Platform and system configuration",
    icon: "SlidersHorizontal",
    defaultScopeId: "scope-global",
  },
  {
    id: "other",
    label: "Other",
    description: "Uncategorized searchable entities",
    icon: "Search",
    defaultScopeId: "scope-global",
  },
] as const;

export function listSearchFrameworkCategories(): readonly SearchCategory[] {
  return SEARCH_FRAMEWORK_CATEGORIES;
}

export function getSearchFrameworkCategory(
  id: SearchCategory["id"],
): SearchCategory | undefined {
  return SEARCH_FRAMEWORK_CATEGORIES.find((c) => c.id === id);
}
