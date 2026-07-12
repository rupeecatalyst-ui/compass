"use client";

import { cn } from "../../shared/cn";
import type { AlertCategory } from "../types";

export function CategoryBadge({
  category,
  className,
}: {
  category: AlertCategory;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400",
        className,
      )}
      aria-label={`Category ${category}`}
    >
      {category}
    </span>
  );
}
