"use client";

import { cn } from "../cn";

/**
 * Shared Mission Control empty state — used by Alert Center, Search, EDW.
 */
export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-10 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
    </div>
  );
}
