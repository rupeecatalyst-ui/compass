/**
 * CO-C1-ADMIN-USER-MANUAL-001 — Enterprise User Manual types.
 */

export type UserManualAudience = "admin" | "operator" | "all";

/** Article readiness — do not invent production-ready claims. */
export type UserManualArticleStatus =
  | "available"
  | "fixture"
  | "partial"
  | "admin_only";

export type UserManualCategoryId =
  | "getting-started"
  | "contacts"
  | "opportunities"
  | "deals"
  | "lenders"
  | "accounting"
  | "products"
  | "policies"
  | "workflow"
  | "partners"
  | "communication"
  | "marketing"
  | "ai"
  | "administration";

export interface UserManualCategoryDef {
  id: UserManualCategoryId;
  title: string;
  description: string;
  sortOrder: number;
}

export interface UserManualArticleMeta {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryId: UserManualCategoryId;
  status: UserManualArticleStatus;
  audience: UserManualAudience;
  updated: string;
  tags: string[];
  related: string[];
  /** Relative path under content/enterprise-user-manual */
  file: string;
}

export interface UserManualArticle extends UserManualArticleMeta {
  body: string;
  headings: Array<{ id: string; text: string; level: 2 | 3 }>;
}

export interface UserManualCatalog {
  categories: UserManualCategoryDef[];
  articles: UserManualArticleMeta[];
  generatedAt: string;
}
