"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "../../shared/cn";
import type { SituationTrend } from "../types";

const ICONS = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
  unknown: ArrowRight,
} as const;

export function SituationTrendIndicator({
  trend,
  className,
}: {
  trend: SituationTrend;
  className?: string;
}) {
  const Icon = ICONS[trend.direction] ?? ArrowRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950/80 px-1.5 py-0.5 text-[10px] text-zinc-400",
        className,
      )}
      aria-label={`Trend ${trend.label}${trend.deltaLabel ? ` ${trend.deltaLabel}` : ""}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      <span>{trend.deltaLabel ?? trend.label}</span>
    </span>
  );
}
