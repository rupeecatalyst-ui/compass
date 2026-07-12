"use client";

import { cn } from "@/lib/utils";

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
        "rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-6 text-center",
        className,
      )}
      role="status"
    >
      <p className="text-xs font-medium text-zinc-400">{title}</p>
      {description && <p className="mt-1 text-[11px] text-zinc-600">{description}</p>}
    </div>
  );
}
