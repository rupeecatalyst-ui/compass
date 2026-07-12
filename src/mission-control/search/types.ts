/**
 * Enterprise Search Center — contracts only.
 * Providers return placeholders. No indexing, DB, AI, or business logic.
 */

export type SearchCategoryId =
  | "all"
  | "customers"
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
  | "configuration";

export interface SearchNavigateAction {
  label: string;
  href?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: SearchCategoryId;
  summary: string;
  sourceModule: string;
  lastUpdated: string;
  icon?: string;
  navigateAction: SearchNavigateAction;
}

export interface SearchCategory {
  id: SearchCategoryId;
  label: string;
  description?: string;
  count?: number;
  icon?: string;
}

export interface SearchFilter {
  query: string;
  categoryId: SearchCategoryId;
  sourceModules: readonly string[];
  updatedWithin?: "any" | "24h" | "7d" | "30d";
}

export interface SearchPreview {
  resultId: string;
  title: string;
  subtitle?: string;
  category: SearchCategoryId;
  summary: string;
  sourceModule: string;
  lastUpdated: string;
  metadata: readonly { label: string; value: string }[];
  navigateAction: SearchNavigateAction;
}

export interface RecentSearch {
  id: string;
  query: string;
  categoryId: SearchCategoryId;
  executedAt: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  categoryId: SearchCategoryId;
  filter: SearchFilter;
  createdAt: string;
}

export interface SearchCenterModel {
  query: string;
  filter: SearchFilter;
  categories: readonly SearchCategory[];
  results: readonly SearchResult[];
  recent: readonly RecentSearch[];
  saved: readonly SavedSearch[];
  preview: SearchPreview | null;
  asOf: string;
}
