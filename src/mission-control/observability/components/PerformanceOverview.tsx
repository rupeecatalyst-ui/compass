"use client";

import type { PerformanceMetric } from "../types";
import { ObservabilityHealthBadge } from "./StatusBadges";

export function PerformanceOverview({ metrics }: { metrics: readonly PerformanceMetric[] }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="obs-perf-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Performance Overview
      </p>
      <h2 id="obs-perf-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Placeholder performance signals
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" role="list">
        {metrics.map((metric) => (
          <li
            key={metric.id}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">{metric.label}</p>
              <ObservabilityHealthBadge status={metric.status} />
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-50">
              {metric.valueLabel}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{metric.trendLabel}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
