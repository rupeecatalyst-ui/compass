/**
 * Enterprise Search Framework — contracts.
 * Modules publish searchable entities; Search Center consumes providers.
 */

import type {
  FrameworkSearchCategoryId,
  SearchEntityStatus,
  SearchPublisherStatus,
  SearchRankingStrategy,
  SearchScopeKind,
} from "../types";

/** Permission gate metadata — not enforced in this sprint */
export interface SearchPermission {
  id: string;
  resource: string;
  action: "view" | "search" | "navigate";
  description?: string;
}

/** Scope of a search request or publisher capability */
export interface SearchScope {
  id: string;
  kind: SearchScopeKind;
  label: string;
  moduleId?: string;
  description?: string;
}

/** Category definition for framework taxonomy */
export interface SearchCategory {
  id: FrameworkSearchCategoryId;
  label: string;
  description?: string;
  icon?: string;
  defaultScopeId?: string;
}

/** Arbitrary metadata bag attached to entities / publishers */
export interface SearchMetadata {
  readonly [key: string]: string | number | boolean | null | undefined;
}

/** Canonical searchable entity published by a module */
export interface SearchEntity {
  id: string;
  entityType: string;
  title: string;
  subtitle?: string;
  description: string;
  module: string;
  keywords: readonly string[];
  icon?: string;
  permissions: readonly SearchPermission[];
  route?: string;
  metadata: SearchMetadata;
  categoryId: FrameworkSearchCategoryId;
  status: SearchEntityStatus;
  updatedAt: string;
  publisherId: string;
}

/** Registered module publisher of searchable entities */
export interface SearchPublisher {
  id: string;
  displayName: string;
  description?: string;
  status: SearchPublisherStatus;
  version: string;
  module: string;
  categoryIds: readonly FrameworkSearchCategoryId[];
  capabilityTags: readonly string[];
  defaultScopeId?: string;
  metadata?: SearchMetadata;
}

/** In-memory registry port for publishers + entity catalogs */
export interface SearchRegistry {
  registerPublisher(publisher: SearchPublisher): void;
  unregisterPublisher(id: string): void;
  getPublisher(id: string): SearchPublisher | undefined;
  listPublishers(): readonly SearchPublisher[];
  registerEntity(entity: SearchEntity): void;
  unregisterEntity(id: string): void;
  getEntity(id: string): SearchEntity | undefined;
  listEntities(options?: {
    publisherId?: string;
    categoryId?: FrameworkSearchCategoryId;
    module?: string;
  }): readonly SearchEntity[];
}

/** Ranking contract — signals only; no scoring engine yet */
export interface SearchRankingSignal {
  id: string;
  label: string;
  weight: number;
  strategy: SearchRankingStrategy;
  description?: string;
}

export interface SearchRankingContract {
  id: string;
  label: string;
  description?: string;
  strategy: SearchRankingStrategy;
  signals: readonly SearchRankingSignal[];
  /** Placeholder — future ranking engines bind here */
  version: string;
}

/** Query contract for entity providers (no DB / index) */
export interface SearchEntityQuery {
  text?: string;
  categoryId?: FrameworkSearchCategoryId | "all";
  moduleIds?: readonly string[];
  publisherIds?: readonly string[];
  scopeId?: string;
  limit?: number;
}
