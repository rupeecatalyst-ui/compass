"use client";

import { cn } from "../../shared/cn";
import type { SearchResult } from "../types";

export function SearchResultCard({
  result,
  selected,
  onSelect,
  className,
}: {
  result: SearchResult;
  selected?: boolean;
  onSelect?: (result: SearchResult) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(result)}
      className={cn(
        "w-full rounded-xl border px-3 py-2.5 text-left transition",
        selected
          ? "border-teal-500/40 bg-teal-500/10"
          : "border-zinc-800/90 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/40",
        className,
      )}
      aria-pressed={selected}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-zinc-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
          {result.category.replace("_", " ")}
        </span>
        <span className="text-[10px] text-zinc-600">{result.sourceModule}</span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-zinc-50">{result.title}</p>
      {result.subtitle ? (
        <p className="mt-0.5 text-[11px] text-zinc-500">{result.subtitle}</p>
      ) : null}
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{result.summary}</p>
      <p className="mt-2 text-[10px] tabular-nums text-zinc-600">
        Updated · {new Date(result.lastUpdated).toLocaleString()}
      </p>
    </button>
  );
}
