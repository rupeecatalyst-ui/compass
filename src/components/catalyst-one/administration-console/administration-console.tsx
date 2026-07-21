"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Shield,
  GitBranch,
  Package,
  Handshake,
  Brain,
  Network,
  SlidersHorizontal,
  Search,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import {
  ADMINISTRATION_CATEGORIES,
  ADMINISTRATION_CONSOLE_NAME,
  ADMINISTRATION_CONSOLE_SEARCH_PLACEHOLDER,
  ADMINISTRATION_CONSOLE_TAGLINE,
  administrationCategoryHref,
  searchAdministrationModules,
  type AdministrationCategoryId,
} from "@/constants/administration-console";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<AdministrationCategoryId, LucideIcon> = {
  organization: Building2,
  "identity-access": Shield,
  workflow: GitBranch,
  products: Package,
  "lenders-partners": Handshake,
  ai: Brain,
  enterprise: Network,
  system: SlidersHorizontal,
};

const CATEGORY_ACCENT: Record<AdministrationCategoryId, string> = {
  organization: "border-sky-500/35 hover:border-sky-500/55 hover:bg-sky-500/[0.06]",
  "identity-access":
    "border-violet-500/35 hover:border-violet-500/55 hover:bg-violet-500/[0.06]",
  workflow: "border-emerald-500/35 hover:border-emerald-500/55 hover:bg-emerald-500/[0.06]",
  products: "border-amber-500/35 hover:border-amber-500/55 hover:bg-amber-500/[0.06]",
  "lenders-partners":
    "border-teal-500/35 hover:border-teal-500/55 hover:bg-teal-500/[0.06]",
  ai: "border-indigo-500/35 hover:border-indigo-500/55 hover:bg-indigo-500/[0.06]",
  enterprise: "border-slate-500/35 hover:border-slate-500/55 hover:bg-slate-500/[0.06]",
  system: "border-rose-500/35 hover:border-rose-500/55 hover:bg-rose-500/[0.06]",
};

const CATEGORY_ICON_TONE: Record<AdministrationCategoryId, string> = {
  organization: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  "identity-access": "bg-violet-500/15 text-violet-800 dark:text-violet-200",
  workflow: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  products: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  "lenders-partners": "bg-teal-500/15 text-teal-800 dark:text-teal-200",
  ai: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200",
  enterprise: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
  system: "bg-rose-500/15 text-rose-800 dark:text-rose-200",
};

/** Enterprise Configuration Console — categorized hub for platform administration. */
export function AdministrationConsole() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const searchResults = useMemo(
    () => searchAdministrationModules(deferredQuery),
    [deferredQuery],
  );
  const isSearching = deferredQuery.trim().length > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col px-4 py-8 md:px-6">
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
          Enterprise control center
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {ADMINISTRATION_CONSOLE_NAME}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {ADMINISTRATION_CONSOLE_TAGLINE}
        </p>
      </header>

      <div className="relative mb-8 max-w-xl">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ADMINISTRATION_CONSOLE_SEARCH_PLACEHOLDER}
          className="h-11 pl-9"
          aria-label="Search administration configuration"
        />
      </div>

      {isSearching ? (
        <section aria-label="Search results" className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            {searchResults.length} configuration
            {searchResults.length === 1 ? "" : "s"} matching “{deferredQuery.trim()}”
          </p>
          {searchResults.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
              No configuration modules match your search.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {searchResults.map((module) => (
                <li key={`${module.categoryId}-${module.id}`}>
                  <Link
                    href={module.href}
                    className="group flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-teal-500/45 hover:bg-teal-500/[0.04]"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {module.categoryTitle}
                    </p>
                    <p className="mt-1 text-sm font-semibold tracking-tight">
                      {module.title}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                      {module.description}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 opacity-0 transition-opacity group-hover:opacity-100 dark:text-teal-200">
                      Open module
                      <ArrowRight className="h-3 w-3" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section
          aria-label="Administration categories"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {ADMINISTRATION_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.id];
            return (
              <Link
                key={category.id}
                href={administrationCategoryHref(category.id)}
                className={cn(
                  "group flex min-h-[148px] flex-col rounded-xl border bg-card p-5 shadow-sm transition-colors",
                  CATEGORY_ACCENT[category.id],
                )}
              >
                <div
                  className={cn(
                    "mb-3 flex h-9 w-9 items-center justify-center rounded-lg",
                    CATEGORY_ICON_TONE[category.id],
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <p className="text-base font-semibold tracking-tight">{category.title}</p>
                <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-muted-foreground">
                  {category.description}
                </p>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {category.modules.length} module
                  {category.modules.length === 1 ? "" : "s"}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-teal-800 opacity-0 transition-opacity group-hover:opacity-100 dark:text-teal-200">
                  Open category
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </p>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
