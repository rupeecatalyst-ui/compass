"use client";

import { cn } from "../../shared/cn";

export function MissionControlBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-teal-200",
        className,
      )}
    >
      Mission Control
    </span>
  );
}
