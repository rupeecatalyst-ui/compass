"use client";

import { Clock } from "lucide-react";
import { cn } from "../../shared/cn";
import type { RecentSearch } from "../types";
import { EmptyState } from "./EmptyState";

export function RecentSearches({
  items,
  onSelect,
  className,
}: {
  items: readonly RecentSearch[];
  onSelect?: (item: RecentSearch) => void;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5", className)}>
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Recent searches
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState className="mt-3 py-6" title="No recent searches" />
      ) : (
        <ul className="mt-2.5 space-y-1" role="list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect?.(item)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-zinc-900/70"
              >
                <span className="truncate text-xs text-zinc-200">{item.query}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-600">
                  {item.categoryId.replace("_", " ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
