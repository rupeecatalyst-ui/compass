/**
 * Search metadata helpers and default scopes.
 */

import type { SearchMetadata, SearchScope } from "../contracts";

export const SEARCH_FRAMEWORK_SCOPES: readonly SearchScope[] = [
  {
    id: "scope-global",
    kind: "global",
    label: "Global",
    description: "Enterprise-wide searchable surface",
  },
  {
    id: "scope-mission-control",
    kind: "module",
    label: "Mission Control",
    moduleId: "mission-control",
    description: "Mission Control module scope",
  },
  {
    id: "scope-horizon",
    kind: "module",
    label: "Horizon",
    moduleId: "horizon",
    description: "Strategic planning workspace scope",
  },
  {
    id: "scope-workspace",
    kind: "workspace",
    label: "Workspace",
    description: "Active workspace boundary (future)",
  },
  {
    id: "scope-personal",
    kind: "personal",
    label: "Personal",
    description: "User-personal search scope (future)",
  },
] as const;

export function listSearchFrameworkScopes(): readonly SearchScope[] {
  return SEARCH_FRAMEWORK_SCOPES;
}

export function createSearchMetadata(
  entries: Record<string, string | number | boolean | null | undefined> = {},
): SearchMetadata {
  return { ...entries };
}

export function mergeSearchMetadata(
  base: SearchMetadata,
  patch: SearchMetadata,
): SearchMetadata {
  return { ...base, ...patch };
}
