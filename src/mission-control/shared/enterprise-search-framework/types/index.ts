/**
 * Enterprise Search Framework — primitive types.
 * Infrastructure only. No indexing / APIs / AI / DB.
 */

export type SearchPublisherStatus = "registered" | "active" | "paused" | "retired";

export type SearchEntityStatus = "published" | "draft" | "archived";

export type SearchScopeKind =
  | "global"
  | "module"
  | "tenant"
  | "workspace"
  | "personal";

export type SearchRankingStrategy =
  | "lexical"
  | "recency"
  | "relevance_placeholder"
  | "module_priority"
  | "hybrid_placeholder";

export type FrameworkSearchCategoryId =
  | "customers"
  | "opportunities"
  | "loans"
  | "partners"
  | "documents"
  | "products"
  | "alerts"
  | "users"
  | "branches"
  | "workflows"
  | "mission_control"
  | "horizon"
  | "security"
  | "configuration"
  | "other";
