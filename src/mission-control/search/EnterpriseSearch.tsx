"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { WorkspaceLoadingState } from "../shared/ui";
import { MC_HERO, MC_PAGE_EYEBROW, MC_SECTION_EYEBROW } from "../shared/ui/patterns";
import {
  EmptyState,
  FilterBar,
  PreviewPanel,
  RecentSearches,
  SavedSearches,
  SearchBar,
  SearchCategoryTabs,
  SearchResults,
} from "./components";
import { createSearchCenterProvider } from "./providers";
import type {
  RecentSearch,
  SavedSearch,
  SearchCategoryId,
  SearchCenterModel,
  SearchFilter,
  SearchPreview,
  SearchResult,
} from "./types";

/**
 * Enterprise Search Center — unified command-style search UI.
 * Consumes providers only. No indexing, DB, AI, or business logic.
 */
export function EnterpriseSearch() {
  const [model, setModel] = useState<SearchCenterModel | null>(null);
  const [filter, setFilter] = useState<SearchFilter | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [preview, setPreview] = useState<SearchPreview | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void createSearchCenterProvider()
      .getSearchCenterModel(filter ?? undefined)
      .then((page) => {
        if (cancelled) return;
        setModel(page);
        setFilter((prev) => prev ?? page.filter);
        setSelectedId((prev) => {
          if (prev && page.results.some((r) => r.id === prev)) return prev;
          return page.results[0]?.id;
        });
        setPreview(page.preview);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  useEffect(() => {
    if (!selectedId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    void createSearchCenterProvider()
      .getPreview(selectedId)
      .then((next) => {
        if (!cancelled) setPreview(next);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const applyFilter = (next: SearchFilter) => {
    startTransition(() => setFilter(next));
  };

  const onQueryChange = (query: string) => {
    if (!filter) return;
    applyFilter({ ...filter, query });
  };

  const onCategoryChange = (categoryId: SearchCategoryId) => {
    if (!filter) return;
    applyFilter({ ...filter, categoryId });
  };

  const onRecent = (item: RecentSearch) => {
    applyFilter({
      query: item.query,
      categoryId: item.categoryId,
      sourceModules: [],
      updatedWithin: "any",
    });
  };

  const onSaved = (item: SavedSearch) => {
    applyFilter({ ...item.filter });
  };

  const onSelectResult = (result: SearchResult) => {
    setSelectedId(result.id);
  };

  const resultCount = useMemo(() => model?.results.length ?? 0, [model]);

  if (!model || !filter) {
    return <WorkspaceLoadingState label="Preparing Enterprise Search Center…" />;
  }

  return (
    <div className="space-y-4 md:space-y-5" aria-label="Enterprise Search Center">
      <header className={MC_HERO}>
        <p className={`${MC_PAGE_EYEBROW} text-teal-400/80`}>
          Mission Control · Discovery
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
          Enterprise Search Center
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Unified search experience across Catalyst One. Modules publish searchable entities; this
          surface consumes providers only — no indexing, database search, or AI in this sprint.
        </p>
        <div className="mt-4">
          <SearchBar value={filter.query} onChange={onQueryChange} />
        </div>
        <div className="mt-3">
          <SearchCategoryTabs
            categories={model.categories}
            activeId={filter.categoryId}
            onChange={onCategoryChange}
          />
        </div>
      </header>

      <FilterBar filter={filter} onChange={applyFilter} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)_minmax(0,0.95fr)]">
        <aside className="space-y-3">
          <RecentSearches items={model.recent} onSelect={onRecent} />
          <SavedSearches items={model.saved} onSelect={onSaved} />
        </aside>

        <section className="min-w-0 space-y-2" aria-label="Search results">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className={MC_SECTION_EYEBROW}>
              Results
            </p>
            <p className="text-[10px] tabular-nums text-zinc-600">
              {pending ? "Updating…" : `${resultCount} matches`} · as of{" "}
              {new Date(model.asOf).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          {resultCount === 0 && !filter.query ? (
            <EmptyState
              title="Start typing to search"
              description="Or pick a recent / saved search. Categories filter placeholder providers."
            />
          ) : (
            <SearchResults
              results={model.results}
              selectedId={selectedId}
              onSelect={onSelectResult}
            />
          )}
        </section>

        <PreviewPanel preview={preview} />
      </div>
    </div>
  );
}
