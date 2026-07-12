/**
 * Enterprise Search Framework.
 * Modules publish searchable entities; Mission Control Search consumes providers.
 * No indexing / APIs / AI / database queries.
 */

export type * from "./types";
export type * from "./contracts";

export {
  SEARCH_FRAMEWORK_CATEGORIES,
  listSearchFrameworkCategories,
  getSearchFrameworkCategory,
} from "./categories";

export {
  DEFAULT_SEARCH_RANKING_CONTRACT,
  listSearchRankingContracts,
  getSearchRankingContract,
} from "./ranking";

export {
  SEARCH_FRAMEWORK_SCOPES,
  listSearchFrameworkScopes,
  createSearchMetadata,
  mergeSearchMetadata,
} from "./metadata";

export {
  PLACEHOLDER_SEARCH_PUBLISHERS,
  createPlaceholderSearchEntities,
  createSearchPublisherRegistry,
  defaultSearchPublisherRegistry,
  listRegisteredSearchPublishers,
  createSearchRegistry,
  defaultSearchRegistry,
} from "./registry";

export {
  createSearchRegistryProvider,
  createSearchEntityProvider,
  createSearchConfigurationProvider,
  createSearchCategoryProvider,
  createEnterpriseSearchFramework,
} from "./providers";
export type {
  SearchRegistryProvider,
  SearchEntityProvider,
  SearchConfigurationProvider,
  SearchCategoryProvider,
  SearchFrameworkConfiguration,
  EnterpriseSearchFramework,
} from "./providers";

export {
  mapFrameworkCategoryToCenter,
  projectSearchEntityToResult,
  projectSearchEntitiesToResults,
  projectSearchEntityToPreview,
} from "./adapters";
export type {
  SearchCenterResultProjection,
  SearchCenterPreviewProjection,
} from "./adapters";
