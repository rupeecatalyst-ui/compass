import "server-only";

/**
 * CO-C1-ADMIN-USER-MANUAL-001 — Server loader for Markdown articles.
 */

import fs from "node:fs";
import path from "node:path";
import {
  USER_MANUAL_ARTICLE_INDEX,
  USER_MANUAL_CATEGORIES,
  USER_MANUAL_CONTENT_ROOT,
  USER_MANUAL_DEFAULT_SLUG,
} from "@/constants/enterprise-user-manual";
import type {
  UserManualArticle,
  UserManualArticleMeta,
  UserManualCatalog,
  UserManualCategoryId,
} from "@/types/enterprise-user-manual";
import { extractHeadings, parseFrontmatter } from "./parse";

function contentRootAbs(): string {
  return path.join(process.cwd(), USER_MANUAL_CONTENT_ROOT);
}

function readArticleFile(relFile: string): string | null {
  const abs = path.join(contentRootAbs(), relFile);
  if (!abs.startsWith(contentRootAbs())) return null;
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, "utf8");
}

function toMeta(
  entry: (typeof USER_MANUAL_ARTICLE_INDEX)[number],
  data: ReturnType<typeof parseFrontmatter>["data"],
): UserManualArticleMeta {
  return {
    id: data.id || entry.slug.replace(/\//g, "."),
    slug: entry.slug,
    title: data.title || entry.slug,
    summary: data.summary || "",
    categoryId: (data.categoryId as UserManualCategoryId) || entry.categoryId,
    status: data.status || "available",
    audience: data.audience || "admin",
    updated: data.updated || "1970-01-01",
    tags: data.tags || [],
    related: data.related || [],
    file: entry.file,
  };
}

export function listUserManualCatalog(): UserManualCatalog {
  const articles: UserManualArticleMeta[] = [];
  for (const entry of USER_MANUAL_ARTICLE_INDEX) {
    const raw = readArticleFile(entry.file);
    if (!raw) continue;
    const { data } = parseFrontmatter(raw);
    articles.push(toMeta(entry, data));
  }
  return {
    categories: [...USER_MANUAL_CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder),
    articles,
    generatedAt: new Date().toISOString(),
  };
}

export function getUserManualArticle(slug: string): UserManualArticle | null {
  const entry = USER_MANUAL_ARTICLE_INDEX.find((a) => a.slug === slug);
  if (!entry) return null;
  const raw = readArticleFile(entry.file);
  if (!raw) return null;
  const { data, body } = parseFrontmatter(raw);
  const meta = toMeta(entry, data);
  const displayBody = body.replace(/^#\s+[^\n]+\r?\n+/, "");
  return {
    ...meta,
    body: displayBody,
    headings: extractHeadings(displayBody),
  };
}

export function resolveUserManualSlug(slugParts?: string[]): string {
  if (!slugParts?.length) return USER_MANUAL_DEFAULT_SLUG;
  return slugParts.join("/");
}

export function getRelatedArticles(
  article: UserManualArticleMeta,
  catalog: UserManualCatalog,
): UserManualArticleMeta[] {
  const byId = new Map(catalog.articles.map((a) => [a.id, a]));
  const bySlug = new Map(catalog.articles.map((a) => [a.slug, a]));
  const out: UserManualArticleMeta[] = [];
  for (const ref of article.related) {
    const hit = byId.get(ref) || bySlug.get(ref);
    if (hit && hit.slug !== article.slug) out.push(hit);
  }
  return out;
}

export function listRecentlyUpdated(catalog: UserManualCatalog, limit = 8): UserManualArticleMeta[] {
  return [...catalog.articles]
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .slice(0, limit);
}
