"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Clock3,
  Search,
  TriangleAlert,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { USER_MANUAL_STATUS_LABELS } from "@/constants/enterprise-user-manual";
import { searchUserManualArticles } from "@/lib/enterprise-user-manual/search";
import type {
  UserManualArticle,
  UserManualArticleMeta,
  UserManualCatalog,
} from "@/types/enterprise-user-manual";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { UserManualMarkdown } from "./user-manual-markdown";

function articleHref(slug: string) {
  return `${ROUTES.ADMIN_USER_MANUAL}/${slug}`;
}

function StatusBadge({ status }: { status: UserManualArticleMeta["status"] }) {
  const tone =
    status === "available"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
      : status === "fixture"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
        : status === "partial"
          ? "border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100"
          : "border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-100";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {USER_MANUAL_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function UserManualWorkspace({
  catalog,
  article,
  related,
  recent,
  prev,
  next,
}: {
  catalog: UserManualCatalog;
  article: UserManualArticle;
  related: UserManualArticleMeta[];
  recent: UserManualArticleMeta[];
  prev: UserManualArticleMeta | null;
  next: UserManualArticleMeta | null;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeCategory, setActiveCategory] = useState<string | "all">(
    article.categoryId,
  );

  const filtered = useMemo(() => {
    const base =
      activeCategory === "all"
        ? catalog.articles
        : catalog.articles.filter((a) => a.categoryId === activeCategory);
    return searchUserManualArticles(deferredQuery, base, catalog.categories);
  }, [activeCategory, catalog.articles, catalog.categories, deferredQuery]);

  const categoryTitle =
    catalog.categories.find((c) => c.id === article.categoryId)?.title ??
    article.categoryId;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:px-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-20 lg:w-64 lg:self-start">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-800 dark:text-teal-200">
              <BookOpen className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
                Knowledge Center
              </p>
              <h1 className="text-sm font-semibold tracking-tight">User Manual</h1>
            </div>
          </div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search manuals…"
              className="h-9 pl-8 text-sm"
              aria-label="Search user manual"
            />
          </div>
        </div>

        <nav
          aria-label="Manual categories"
          className="rounded-xl border bg-card p-2 shadow-sm"
        >
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={cn(
              "mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] font-medium",
              activeCategory === "all"
                ? "bg-teal-500/15 text-teal-900 dark:text-teal-100"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            All categories
            <span className="text-[10px] tabular-nums">{catalog.articles.length}</span>
          </button>
          {catalog.categories.map((category) => {
            const count = catalog.articles.filter(
              (a) => a.categoryId === category.id,
            ).length;
            if (count === 0) return null;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "mb-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] font-medium",
                  activeCategory === category.id
                    ? "bg-teal-500/15 text-teal-900 dark:text-teal-100"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span className="pr-2">{category.title}</span>
                <span className="text-[10px] tabular-nums">{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="rounded-xl border bg-card p-2 shadow-sm">
          <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Articles
          </p>
          <ul className="max-h-[40vh] space-y-0.5 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-2.5 py-3 text-[12px] text-muted-foreground">
                No articles match your search.
              </li>
            ) : (
              filtered.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={articleHref(item.slug)}
                    className={cn(
                      "block rounded-lg px-2.5 py-2 text-[12px] leading-snug transition-colors",
                      item.slug === article.slug
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-4">
        <header className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Link
              href={ROUTES.ADMIN}
              className="hover:text-foreground hover:underline"
            >
              Administration Console
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span>User Manual</span>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span>{categoryTitle}</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                {article.title}
              </h2>
              <p className="max-w-3xl text-sm text-muted-foreground">
                {article.summary}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={article.status} />
              <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock3 className="h-3 w-3" aria-hidden />
                Updated {article.updated}
              </p>
            </div>
          </div>
          {(article.status === "fixture" || article.status === "partial") && (
            <p className="mt-4 inline-flex items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2 text-[12px] text-amber-950 dark:text-amber-100">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Feature readiness is marked honestly. Do not assume live production
              behaviour for gated capabilities.
            </p>
          )}
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
          <article className="rounded-xl border bg-card p-5 shadow-sm md:p-6">
            <UserManualMarkdown body={article.body} />

            <nav
              aria-label="Article navigation"
              className="mt-8 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-between"
            >
              {prev ? (
                <Link
                  href={articleHref(prev.slug)}
                  className="rounded-lg border px-3 py-2 text-[12px] hover:bg-muted/50"
                >
                  <span className="block text-[10px] uppercase text-muted-foreground">
                    Previous
                  </span>
                  {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  href={articleHref(next.slug)}
                  className="rounded-lg border px-3 py-2 text-right text-[12px] hover:bg-muted/50 sm:ml-auto"
                >
                  <span className="block text-[10px] uppercase text-muted-foreground">
                    Next
                  </span>
                  {next.title}
                </Link>
              ) : null}
            </nav>
          </article>

          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            {article.headings.length > 0 ? (
              <div className="rounded-xl border bg-card p-3 shadow-sm">
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  On this page
                </p>
                <ul className="space-y-1">
                  {article.headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={cn(
                          "block rounded px-1 py-1 text-[12px] text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          h.level === 3 && "pl-3",
                        )}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {related.length > 0 ? (
              <div className="rounded-xl border bg-card p-3 shadow-sm">
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Related articles
                </p>
                <ul className="space-y-1">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={articleHref(item.slug)}
                        className="block rounded px-1 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-xl border bg-card p-3 shadow-sm">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recently updated
              </p>
              <ul className="space-y-1">
                {recent.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={articleHref(item.slug)}
                      className="block rounded px-1 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    >
                      <span className="block">{item.title}</span>
                      <span className="text-[10px] opacity-80">{item.updated}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
