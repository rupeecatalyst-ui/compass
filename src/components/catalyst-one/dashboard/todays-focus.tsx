"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { focusTiles } from "@/data/catalyst-one/dashboard";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { useDashboardPersona } from "@/hooks/use-dashboard-persona";
import { scaleCount } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";

const urgencyStyles = {
  critical: "border-red-500/25 bg-red-950/20 hover:border-red-500/40",
  high: "border-amber-500/25 bg-amber-950/15 hover:border-amber-500/40",
  medium: "border-slate-700/80 bg-slate-900/40 hover:border-teal-500/30",
} as const;

const urgencyCountStyles = {
  critical: "text-red-300",
  high: "text-amber-300",
  medium: "text-slate-100",
} as const;

export function TodaysFocus() {
  const { dateRange } = useDashboardFilter();
  const { config } = useDashboardPersona();

  const tiles = config.focusTileIds
    .map((id) => focusTiles.find((t) => t.id === id))
    .filter(Boolean) as typeof focusTiles;

  if (tiles.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {tiles.map((tile) => (
        <Link
          key={tile.id}
          href={tile.href}
          className={cn(
            "group flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 backdrop-blur-sm shadow-sm transition-colors",
            urgencyStyles[tile.urgency],
          )}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 truncate">
              {tile.label}
            </p>
            <p
              className={cn(
                "text-xl font-semibold tabular-nums mt-0.5",
                urgencyCountStyles[tile.urgency],
              )}
            >
              {scaleCount(tile.count, dateRange.scaleFactor)}
            </p>
            {tile.id === "compliance_due" && tile.count >= 2 && (
              <p className="text-[9px] text-red-400/90 mt-0.5">2 critical</p>
            )}
          </div>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-colors group-hover:text-teal-400" />
        </Link>
      ))}
    </div>
  );
}
