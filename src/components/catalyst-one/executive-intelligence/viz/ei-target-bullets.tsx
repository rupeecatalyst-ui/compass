"use client";

import type { EiBulletTarget } from "@/types/executive-intelligence-platform";
import { cn } from "@/lib/utils";

function formatUnit(value: number, unit: EiBulletTarget["unit"]): string {
  if (unit === "cr") return `₹${value} Cr`;
  if (unit === "lakh") return `₹${value} L`;
  if (unit === "pct") return `${value}%`;
  return String(value);
}

/** Bullet / range attainment — plan vs reality on one axis. */
export function EiTargetBullets({ bullets }: { bullets: EiBulletTarget[] }) {
  return (
    <div className="space-y-4">
      {bullets.map((b) => {
        const max = Math.max(b.target, b.actual, 1);
        const actualPct = Math.min(100, (b.actual / max) * 100);
        const targetPct = Math.min(100, (b.target / max) * 100);
        const onTrack = b.actual >= b.target * 0.85;
        return (
          <div key={b.id}>
            <div className="mb-1 flex items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold">{b.label}</p>
                <p className="text-[10px] text-muted-foreground">{b.insight}</p>
              </div>
              <p className="text-[11px] tabular-nums">
                <span className="font-semibold">{formatUnit(b.actual, b.unit)}</span>
                <span className="text-muted-foreground"> / {formatUnit(b.target, b.unit)}</span>
              </p>
            </div>
            <div className="relative h-3 rounded-full bg-muted/70">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  onTrack ? "bg-teal-600" : "bg-amber-500",
                )}
                style={{ width: `${actualPct}%` }}
              />
              <div
                className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-foreground"
                style={{ left: `${targetPct}%` }}
                title="Target"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
