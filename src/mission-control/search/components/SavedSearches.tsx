"use client";

import { Bookmark } from "lucide-react";
import { cn } from "../../shared/cn";
import type { SavedSearch } from "../types";
import { EmptyState } from "./EmptyState";

export function SavedSearches({
  items,
  onSelect,
  className,
}: {
  items: readonly SavedSearch[];
  onSelect?: (item: SavedSearch) => void;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5", className)}>
      <div className="flex items-center gap-2">
        <Bookmark className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Saved searches
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState className="mt-3 py-6" title="No saved searches" />
      ) : (
        <ul className="mt-2.5 space-y-1.5" role="list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect?.(item)}
                className="w-full rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-2 text-left transition hover:border-zinc-700"
              >
                <p className="text-xs font-medium text-zinc-100">{item.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                  {item.query} · {item.categoryId.replace("_", " ")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
