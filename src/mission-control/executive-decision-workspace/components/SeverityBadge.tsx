"use client";

import { cn } from "../../shared/cn";
import type { SeverityLevel } from "../types";

const STYLES: Record<SeverityLevel, string> = {
  critical: "border-zinc-500 text-rose-200",
  high: "border-zinc-600 text-orange-200/90",
  medium: "border-zinc-700 text-amber-200/80",
  low: "border-zinc-700 text-zinc-300",
  info: "border-zinc-800 text-zinc-400",
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: SeverityLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-zinc-950 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm shadow-black/20",
        STYLES[severity],
        className,
      )}
      aria-label={`Severity ${severity}`}
    >
      {severity}
    </span>
  );
}
