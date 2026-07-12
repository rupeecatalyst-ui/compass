/**
 * Enterprise Search Center — providers.
 * Consumes Enterprise Search Framework (no indexing / DB / AI).
 */

import {
  createEnterpriseSearchFramework,
  projectSearchEntitiesToResults,
  projectSearchEntityToPreview,
  type FrameworkSearchCategoryId,
  type SearchEntity,
} from "../shared/enterprise-search-framework";
import type {
  RecentSearch,
  SavedSearch,
  SearchCategory,
  SearchCategoryId,
  SearchCenterModel,
  SearchFilter,
  SearchPreview,
  SearchResult,
} from "./types";

export interface SearchProvider {
  search(filter: SearchFilter): Promise<readonly SearchResult[]>;
}

export interface SearchCategoryProvider {
  listCategories(): Promise<readonly SearchCategory[]>;
}

export interface RecentSearchProvider {
  listRecent(): Promise<readonly RecentSearch[]>;
}

export interface SavedSearchProvider {
  listSaved(): Promise<readonly SavedSearch[]>;
}

export interface SearchCenterProvider {
  getSearchCenterModel(filter?: Partial<SearchFilter>): Promise<SearchCenterModel>;
  getPreview(resultId: string): Promise<SearchPreview | null>;
}

const UI_CATEGORIES: SearchCategory[] = [
  { id: "all", label: "All", description: "Across Catalyst One", icon: "Search" },
  { id: "customers", label: "Customers", icon: "Users" },
  { id: "loans", label: "Loans", icon: "FileText" },
  { id: "partners", label: "Partners", icon: "Handshake" },
  { id: "documents", label: "Documents", icon: "FolderOpen" },
  { id: "products", label: "Products", icon: "Package" },
  { id: "alerts", label: "Alerts", icon: "Bell" },
  { id: "users", label: "Users", icon: "User" },
  { id: "branches", label: "Branches", icon: "Building2" },
  { id: "workflows", label: "Workflows", icon: "GitBranch" },
  { id: "mission_control", label: "Mission Control", icon: "Radar" },
  { id: "horizon", label: "Horizon", icon: "Orbit" },
  { id: "configuration", label: "Configuration", icon: "SlidersHorizontal" },
];

const framework = createEnterpriseSearchFramework();

function toUiCategory(category: string): SearchCategoryId {
  const known = UI_CATEGORIES.find((c) => c.id === category);
  return known?.id ?? "all";
}

function toUiResult(projection: ReturnType<typeof projectSearchEntitiesToResults>[number]): SearchResult {
  return {
    id: projection.id,
    title: projection.title,
    subtitle: projection.subtitle,
    category: toUiCategory(projection.category),
    summary: projection.summary,
    sourceModule: projection.sourceModule,
    lastUpdated: projection.lastUpdated,
    icon: projection.icon,
    navigateAction: projection.navigateAction,
  };
}

function toUiPreview(
  projection: NonNullable<ReturnType<typeof projectSearchEntityToPreview>>,
): SearchPreview {
  return {
    resultId: projection.resultId,
    title: projection.title,
    subtitle: projection.subtitle,
    category: toUiCategory(projection.category),
    summary: projection.summary,
    sourceModule: projection.sourceModule,
    lastUpdated: projection.lastUpdated,
    metadata: projection.metadata,
    navigateAction: projection.navigateAction,
  };
}

function mapUiCategoryToFramework(
  categoryId: SearchCategoryId,
): FrameworkSearchCategoryId | "all" {
  if (categoryId === "all") return "all";
  return categoryId as FrameworkSearchCategoryId;
}

function defaultFilter(partial?: Partial<SearchFilter>): SearchFilter {
  return {
    query: partial?.query ?? "",
    categoryId: partial?.categoryId ?? "all",
    sourceModules: partial?.sourceModules ?? [],
    updatedWithin: partial?.updatedWithin ?? "any",
  };
}

function applyCenterFilters(
  entities: readonly SearchEntity[],
  filter: SearchFilter,
): SearchEntity[] {
  return entities.filter((entity) => {
    if (filter.sourceModules.length > 0 && !filter.sourceModules.includes(entity.module)) {
      return false;
    }
    // updatedWithin is architectural only — no time-engine business logic yet
    return true;
  });
}

export function createSearchCategoryProvider(): SearchCategoryProvider {
  return {
    async listCategories() {
      const entities = await framework.entityProvider.listEntities({ categoryId: "all" });
      const results = projectSearchEntitiesToResults(entities).map(toUiResult);
      return UI_CATEGORIES.map((cat) => ({
        ...cat,
        count:
          cat.id === "all"
            ? results.length
            : results.filter((r) => r.category === cat.id).length,
      }));
    },
  };
}

export function createSearchProvider(): SearchProvider {
  return {
    async search(filter) {
      const entities = await framework.entityProvider.listEntities({
        text: filter.query,
        categoryId: mapUiCategoryToFramework(filter.categoryId),
        moduleIds: filter.sourceModules.length ? filter.sourceModules : undefined,
      });
      const filtered = applyCenterFilters(entities, filter);
      return projectSearchEntitiesToResults(filtered).map(toUiResult);
    },
  };
}

export function createRecentSearchProvider(): RecentSearchProvider {
  return {
    async listRecent() {
      return [
        {
          id: "recent-1",
          query: "west region",
          categoryId: "all" as SearchCategoryId,
          executedAt: new Date(Date.now() - 20 * 60000).toISOString(),
        },
        {
          id: "recent-2",
          query: "LF-4821",
          categoryId: "loans",
          executedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        },
        {
          id: "recent-3",
          query: "situation room",
          categoryId: "mission_control",
          executedAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];
    },
  };
}

export function createSavedSearchProvider(): SavedSearchProvider {
  return {
    async listSaved() {
      return [
        {
          id: "saved-1",
          name: "Open alerts",
          query: "SLA",
          categoryId: "alerts",
          filter: {
            query: "SLA",
            categoryId: "alerts",
            sourceModules: [],
            updatedWithin: "7d",
          },
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        {
          id: "saved-2",
          name: "Horizon initiatives",
          query: "branch",
          categoryId: "horizon",
          filter: {
            query: "branch",
            categoryId: "horizon",
            sourceModules: ["Horizon"],
            updatedWithin: "30d",
          },
          createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
        },
      ] satisfies SavedSearch[];
    },
  };
}

export function createSearchCenterProvider(): SearchCenterProvider {
  const search = createSearchProvider();
  const categories = createSearchCategoryProvider();
  const recent = createRecentSearchProvider();
  const saved = createSavedSearchProvider();

  return {
    async getSearchCenterModel(partial) {
      const filter = defaultFilter(partial);
      const [categoryList, results, recentList, savedList] = await Promise.all([
        categories.listCategories(),
        search.search(filter),
        recent.listRecent(),
        saved.listSaved(),
      ]);
      const first = results[0];
      let preview: SearchPreview | null = null;
      if (first) {
        const entity = await framework.entityProvider.getEntity(first.id);
        preview = entity
          ? toUiPreview(projectSearchEntityToPreview(entity))
          : {
              resultId: first.id,
              title: first.title,
              subtitle: first.subtitle,
              category: first.category,
              summary: first.summary,
              sourceModule: first.sourceModule,
              lastUpdated: first.lastUpdated,
              metadata: [
                { label: "Category", value: first.category },
                { label: "Source", value: first.sourceModule },
              ],
              navigateAction: first.navigateAction,
            };
      }
      return {
        query: filter.query,
        filter,
        categories: categoryList,
        results,
        recent: recentList,
        saved: savedList,
        preview,
        asOf: new Date().toISOString(),
      };
    },
    async getPreview(resultId) {
      const entity = await framework.entityProvider.getEntity(resultId);
      return entity ? toUiPreview(projectSearchEntityToPreview(entity)) : null;
    },
  };
}

/** Legacy Mission Control search port — preserved for compatibility */
export interface MissionControlSearchResult {
  id: string;
  title: string;
  href: string;
  category: string;
}

export interface MissionControlSearchPort {
  search(query: string): Promise<MissionControlSearchResult[]>;
}

export function createMissionControlSearchStub(): MissionControlSearchPort {
  const provider = createSearchProvider();
  return {
    async search(query) {
      const results = await provider.search({
        query,
        categoryId: "all",
        sourceModules: [],
        updatedWithin: "any",
      });
      return results.map((r) => ({
        id: r.id,
        title: r.title,
        href: r.navigateAction.href ?? "/mission-control/search",
        category: r.category,
      }));
    },
  };
}
