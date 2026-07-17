"use client";

import type { EiGauge } from "@/types/executive-intelligence-platform";
import { cn } from "@/lib/utils";

/** Technical Health → Multi Gauge Dashboard */
export function EiMultiGaugeDashboard({ gauges }: { gauges: EiGauge[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {gauges.map((g) => {
        const r = 34;
        const c = 2 * Math.PI * r;
        const dash = (Math.min(100, g.pct) / 100) * c;
        return (
          <div
            key={g.id}
            className="flex flex-col items-center rounded-xl border border-border/60 bg-muted/15 p-3"
          >
            <svg width={88} height={88} viewBox="0 0 88 88">
              <circle
                cx={44}
                cy={44}
                r={r}
                fill="none"
                className="stroke-muted"
                strokeWidth={8}
              />
              <circle
                cx={44}
                cy={44}
                r={r}
                fill="none"
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c - dash}`}
                transform="rotate(-90 44 44)"
                className={cn(
                  g.tone === "healthy" && "stroke-teal-600",
                  g.tone === "watch" && "stroke-amber-500",
                  g.tone === "critical" && "stroke-rose-500",
                )}
              />
              <text
                x={44}
                y={46}
                textAnchor="middle"
                className="fill-foreground text-[12px] font-bold"
              >
                {g.pct}%
              </text>
            </svg>
            <p className="mt-1 text-center text-[10px] font-semibold">{g.label}</p>
          </div>
        );
      })}
    </div>
  );
}
