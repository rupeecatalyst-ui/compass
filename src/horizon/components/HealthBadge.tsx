"use client";

import { cn } from "@/lib/utils";
import type { Health } from "../types";

const STYLES: Record<Health, string> = {
  on_track: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  at_risk: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  blocked: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  completed: "border-sky-500/35 bg-sky-500/10 text-sky-200",
  unknown: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

const LABELS: Record<Health, string> = {
  on_track: "On track",
  at_risk: "At risk",
  blocked: "Blocked",
  completed: "Completed",
  unknown: "Unknown",
};

export function HealthBadge({
  health,
  className,
}: {
  health: Health;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        STYLES[health],
        className,
      )}
      aria-label={`Health ${LABELS[health]}`}
    >
      {LABELS[health]}
    </span>
  );
}
