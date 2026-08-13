/**
 * CO-C1-ADMIN-USER-MANUAL-001 — Audience filter helpers.
 * Manual lives under /admin (Admin / Super Admin). Extra article audience tags
 * allow future expansion without leaking admin-only procedures.
 */

import type { UserManualArticleMeta, UserManualAudience } from "@/types/enterprise-user-manual";

export function canViewUserManualArticle(
  article: UserManualArticleMeta,
  viewer: { role: string },
): boolean {
  const isAdmin = viewer.role === "SUPER_ADMIN" || viewer.role === "ADMIN";
  if (!isAdmin) {
    // Ordinary users are not routed to /admin today; keep closed.
    return article.audience === "all";
  }
  // audience tags: admin | operator | all — status may be admin_only (draft gate)
  if (article.audience === "admin" || article.status === "admin_only") {
    return viewer.role === "SUPER_ADMIN" || viewer.role === "ADMIN";
  }
  return true;
}

export function filterArticlesForAudience(
  articles: UserManualArticleMeta[],
  viewer: { role: string },
): UserManualArticleMeta[] {
  return articles.filter((a) => canViewUserManualArticle(a, viewer));
}

export function normalizeAudience(value?: string): UserManualAudience {
  if (value === "operator" || value === "all" || value === "admin") return value;
  return "admin";
}
