/**
 * CO-C1-ADMIN-USER-MANUAL-001 — Client-safe search over article metadata + body snippets.
 */

import type { UserManualArticleMeta, UserManualCategoryDef } from "@/types/enterprise-user-manual";

export function searchUserManualArticles(
  query: string,
  articles: UserManualArticleMeta[],
  categories: UserManualCategoryDef[],
  bodyBySlug?: Record<string, string>,
): UserManualArticleMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return articles;
  const catTitle = new Map(categories.map((c) => [c.id, c.title]));
  return articles.filter((article) => {
    const hay = [
      article.title,
      article.summary,
      article.id,
      article.slug,
      catTitle.get(article.categoryId) ?? "",
      ...article.tags,
      bodyBySlug?.[article.slug]?.slice(0, 4000) ?? "",
    ]
      .join("\n")
      .toLowerCase();
    return hay.includes(q);
  });
}
