/**
 * Enterprise Search Center — Mission Control.
 * UI architecture only. Modules will publish entities; this center consumes providers.
 */

export type * from "./types";
export {
  createSearchProvider,
  createSearchCategoryProvider,
  createRecentSearchProvider,
  createSavedSearchProvider,
  createSearchCenterProvider,
  createMissionControlSearchStub,
} from "./providers";
export type {
  SearchProvider,
  SearchCategoryProvider,
  RecentSearchProvider,
  SavedSearchProvider,
  SearchCenterProvider,
  MissionControlSearchPort,
  MissionControlSearchResult,
} from "./providers";
export { EnterpriseSearch } from "./EnterpriseSearch";
export * as SearchCenterComponents from "./components";
