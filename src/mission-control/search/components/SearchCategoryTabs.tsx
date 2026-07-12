"use client";

import { cn } from "../../shared/cn";
import type { SearchCategory, SearchCategoryId } from "../types";

export function SearchCategoryTabs({
  categories,
  activeId,
  onChange,
  className,
}: {
  categories: readonly SearchCategory[];
  activeId: SearchCategoryId;
  onChange: (id: SearchCategoryId) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex gap-1.5 overflow-x-auto pb-1", className)}
      role="tablist"
      aria-label="Search categories"
    >
      {categories.map((cat) => {
        const active = cat.id === activeId;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(cat.id)}
            className={cn(
              "shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition",
              active
                ? "border-teal-500/40 bg-teal-500/10 text-teal-100"
                : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            {cat.label}
            {typeof cat.count === "number" ? (
              <span className="ml-1.5 tabular-nums text-zinc-500">{cat.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
