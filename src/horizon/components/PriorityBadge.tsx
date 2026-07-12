"use client";

import { cn } from "@/lib/utils";
import type { Priority } from "../types";

const STYLES: Record<Priority, string> = {
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  high: "border-orange-500/35 bg-orange-500/10 text-orange-200",
  medium: "border-zinc-600 bg-zinc-900 text-zinc-300",
  low: "border-zinc-700 bg-zinc-950 text-zinc-500",
};

const LABELS: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        STYLES[priority],
        className,
      )}
      aria-label={`Priority ${LABELS[priority]}`}
    >
      {LABELS[priority]}
    </span>
  );
}
