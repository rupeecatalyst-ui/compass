"use client";

import { cn } from "../../shared/cn";
import type { SearchResult } from "../types";
import { EmptyState } from "./EmptyState";
import { SearchResultCard } from "./SearchResultCard";

export function SearchResults({
  results,
  selectedId,
  onSelect,
  className,
}: {
  results: readonly SearchResult[];
  selectedId?: string;
  onSelect?: (result: SearchResult) => void;
  className?: string;
}) {
  if (results.length === 0) {
    return (
      <EmptyState
        className={className}
        title="No results"
        description="Adjust query, category, or filters. Providers return placeholders only."
      />
    );
  }

  return (
    <ul className={cn("space-y-2", className)} role="listbox" aria-label="Search results">
      {results.map((result) => (
        <li key={result.id} role="option" aria-selected={result.id === selectedId}>
          <SearchResultCard
            result={result}
            selected={result.id === selectedId}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}
