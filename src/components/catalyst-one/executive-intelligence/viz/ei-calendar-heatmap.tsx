"use client";

import type { EiCalendarDay } from "@/types/executive-intelligence-platform";

/** Daily Activity → Calendar Heatmap */
export function EiCalendarHeatmap({ days }: { days: EiCalendarDay[] }) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.count} events`}
            className="aspect-square rounded-sm border border-border/40"
            style={{
              backgroundColor:
                d.count === 0
                  ? "hsl(var(--muted) / 0.35)"
                  : `rgba(13, 148, 136, ${0.18 + d.intensity * 0.75})`,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
        <span>Less</span>
        <span>Last 35 days</span>
        <span>More</span>
      </div>
    </div>
  );
}
