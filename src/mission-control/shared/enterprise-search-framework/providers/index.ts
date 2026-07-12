/**
 * Placeholder providers for the Enterprise Search Framework.
 */

import { listSearchFrameworkCategories } from "../categories";
import type {
  SearchCategory,
  SearchEntity,
  SearchEntityQuery,
  SearchPublisher,
  SearchRankingContract,
  SearchRegistry,
  SearchScope,
} from "../contracts";
import { listSearchFrameworkScopes } from "../metadata";
import {
  DEFAULT_SEARCH_RANKING_CONTRACT,
  listSearchRankingContracts,
} from "../ranking";
import {
  createSearchRegistry,
  defaultSearchRegistry,
} from "../registry";

export interface SearchFrameworkConfiguration {
  defaultRankingContractId: string;
  scopes: readonly SearchScope[];
  rankingContracts: readonly SearchRankingContract[];
  maxResults: number;
  /** Future: enable module publisher hot-reload */
  allowRuntimePublisherRegistration: boolean;
  version: string;
}

export interface SearchRegistryProvider {
  listPublishers(): Promise<readonly SearchPublisher[]>;
  getPublisher(id: string): Promise<SearchPublisher | undefined>;
  listEntities(options?: {
    publisherId?: string;
    categoryId?: SearchEntity["categoryId"];
    module?: string;
  }): Promise<readonly SearchEntity[]>;
  getRegistrySnapshot(): Promise<{
    publisherCount: number;
    entityCount: number;
    asOf: string;
  }>;
}

export interface SearchEntityProvider {
  listEntities(query?: SearchEntityQuery): Promise<readonly SearchEntity[]>;
  getEntity(id: string): Promise<SearchEntity | undefined>;
}

export interface SearchConfigurationProvider {
  getConfiguration(): Promise<SearchFrameworkConfiguration>;
}

export interface SearchCategoryProvider {
  listCategories(): Promise<readonly SearchCategory[]>;
  getCategory(id: SearchCategory["id"]): Promise<SearchCategory | undefined>;
}

function matchEntity(entity: SearchEntity, query?: SearchEntityQuery): boolean {
  if (!query) return entity.status === "published";
  if (entity.status !== "published" && entity.status !== "draft") return false;

  if (query.categoryId && query.categoryId !== "all" && entity.categoryId !== query.categoryId) {
    return false;
  }
  if (query.moduleIds?.length && !query.moduleIds.includes(entity.module)) {
    return false;
  }
  if (query.publisherIds?.length && !query.publisherIds.includes(entity.publisherId)) {
    return false;
  }
  const text = query.text?.trim().toLowerCase();
  if (text) {
    const haystack = [
      entity.title,
      entity.subtitle ?? "",
      entity.description,
      entity.module,
      entity.entityType,
      ...entity.keywords,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(text)) return false;
  }
  return true;
}

export function createSearchRegistryProvider(options?: {
  registry?: SearchRegistry;
}): SearchRegistryProvider {
  const registry = options?.registry ?? defaultSearchRegistry;
  return {
    async listPublishers() {
      return registry.listPublishers();
    },
    async getPublisher(id) {
      return registry.getPublisher(id);
    },
    async listEntities(filter) {
      return registry.listEntities(filter);
    },
    async getRegistrySnapshot() {
      return {
        publisherCount: registry.listPublishers().length,
        entityCount: registry.listEntities().length,
        asOf: new Date().toISOString(),
      };
    },
  };
}

export function createSearchEntityProvider(options?: {
  registry?: SearchRegistry;
}): SearchEntityProvider {
  const registry = options?.registry ?? defaultSearchRegistry;
  return {
    async listEntities(query) {
      const matched = registry.listEntities().filter((e) => matchEntity(e, query));
      const limit = query?.limit ?? 50;
      return matched.slice(0, limit);
    },
    async getEntity(id) {
      return registry.getEntity(id);
    },
  };
}

export function createSearchConfigurationProvider(): SearchConfigurationProvider {
  return {
    async getConfiguration() {
      return {
        defaultRankingContractId: DEFAULT_SEARCH_RANKING_CONTRACT.id,
        scopes: listSearchFrameworkScopes(),
        rankingContracts: listSearchRankingContracts(),
        maxResults: 50,
        allowRuntimePublisherRegistration: true,
        version: "0.1.0",
      };
    },
  };
}

export function createSearchCategoryProvider(): SearchCategoryProvider {
  return {
    async listCategories() {
      return listSearchFrameworkCategories();
    },
    async getCategory(id) {
      return listSearchFrameworkCategories().find((c) => c.id === id);
    },
  };
}

export interface EnterpriseSearchFramework {
  registry: SearchRegistry;
  registryProvider: SearchRegistryProvider;
  entityProvider: SearchEntityProvider;
  configurationProvider: SearchConfigurationProvider;
  categoryProvider: SearchCategoryProvider;
  listPublishers: () => readonly SearchPublisher[];
}

export function createEnterpriseSearchFramework(options?: {
  registry?: SearchRegistry;
}): EnterpriseSearchFramework {
  const registry = options?.registry ?? createSearchRegistry();
  return {
    registry,
    registryProvider: createSearchRegistryProvider({ registry }),
    entityProvider: createSearchEntityProvider({ registry }),
    configurationProvider: createSearchConfigurationProvider(),
    categoryProvider: createSearchCategoryProvider(),
    listPublishers: () => registry.listPublishers(),
  };
}
