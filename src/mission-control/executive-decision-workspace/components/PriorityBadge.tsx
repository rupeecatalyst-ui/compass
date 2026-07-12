"use client";

import { cn } from "../../shared/cn";
import type { PriorityLevel } from "../types";

const STYLES: Record<PriorityLevel, string> = {
  critical: "border-zinc-500 bg-zinc-800 text-rose-200",
  high: "border-zinc-600 bg-zinc-900 text-orange-200/90",
  medium: "border-zinc-700 bg-zinc-950 text-amber-200/80",
  low: "border-zinc-800 bg-zinc-950 text-zinc-300",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: PriorityLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm shadow-black/20",
        STYLES[priority],
        className,
      )}
      aria-label={`Priority ${priority}`}
    >
      {priority}
    </span>
  );
}
