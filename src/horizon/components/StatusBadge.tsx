"use client";

import { cn } from "@/lib/utils";
import type { Status } from "../types";

const STYLES: Record<Status, string> = {
  draft: "border-zinc-700 bg-zinc-950 text-zinc-400",
  planned: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  active: "border-teal-500/35 bg-teal-500/10 text-teal-200",
  paused: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  completed: "border-sky-500/35 bg-sky-500/10 text-sky-200",
  cancelled: "border-zinc-600 bg-zinc-900 text-zinc-500",
  blocked: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

const LABELS: Record<Status, string> = {
  draft: "Draft",
  planned: "Planned",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  blocked: "Blocked",
};

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        STYLES[status],
        className,
      )}
      aria-label={`Status ${LABELS[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
