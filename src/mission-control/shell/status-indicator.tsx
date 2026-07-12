"use client";

import type { MissionControlStatusIndicatorModel } from "../shared/types";
import { cn } from "../shared/cn";

const STATE_DOT: Record<MissionControlStatusIndicatorModel["state"], string> = {
  unknown: "bg-zinc-500",
  healthy: "bg-emerald-500",
  degraded: "bg-amber-500",
  down: "bg-rose-500",
  idle: "bg-sky-500",
};

export function McStatusIndicator({
  indicator,
  compact = false,
}: {
  indicator: MissionControlStatusIndicatorModel;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-400",
        compact && "gap-1",
      )}
      title={`${indicator.label}: ${indicator.state}`}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATE_DOT[indicator.state])} />
      <span>{indicator.label}</span>
    </div>
  );
}
