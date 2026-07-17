"use client";

import type { EiTimelineEvent } from "@/types/executive-intelligence-platform";
import { cn } from "@/lib/utils";

/**
 * Timeline → Timeline Chart
 * Horizontal chronological spine — time is the axis executives scan.
 */
export function EiTimelineChart({ events }: { events: EiTimelineEvent[] }) {
  if (events.length === 0) {
    return null;
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  const times = sorted.map((e) => new Date(e.at).getTime());
  const min = times[0]!;
  const max = times[times.length - 1]!;
  const span = Math.max(1, max - min);

  return (
    <div className="pt-2">
      <div className="relative mx-1 h-28">
        <div className="absolute left-0 right-0 top-10 h-px bg-gradient-to-r from-transparent via-teal-700/40 to-transparent" />
        {sorted.map((e, i) => {
          const t = new Date(e.at).getTime();
          const pct = ((t - min) / span) * 100;
          const above = i % 2 === 0;
          return (
            <div
              key={e.id}
              className="absolute top-10 w-px -translate-x-1/2"
              style={{ left: `${pct}%` }}
            >
              <span
                className={cn(
                  "absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background",
                  e.tone === "success" && "bg-teal-600",
                  e.tone === "warning" && "bg-amber-500",
                  e.tone === "info" && "bg-sky-600",
                  e.tone === "neutral" && "bg-slate-400",
                )}
              />
              <div
                className={cn(
                  "absolute left-1/2 w-28 -translate-x-1/2 text-center",
                  above ? "bottom-3" : "top-3",
                )}
              >
                <p className="text-[9px] tabular-nums text-muted-foreground">
                  {new Date(e.at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-snug">
                  {e.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Left → right = earlier → later
      </p>
    </div>
  );
}
