"use client";

import type { AlertStatistics } from "../types";

export function AlertStatistics({
  statistics,
  embedded = false,
}: {
  statistics: AlertStatistics;
  embedded?: boolean;
}) {
  return (
    <section
      className="space-y-3"
      aria-labelledby={embedded ? undefined : "ac-statistics-heading"}
    >
      {!embedded && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Alert Statistics
          </p>
          <h2 id="ac-statistics-heading" className="mt-1 text-lg font-semibold text-zinc-50">
            Distribution overview
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Placeholder distribution over mock alerts — not calculated KPIs.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            By severity
          </p>
          <ul className="mt-2 space-y-1.5">
            {statistics.bySeverity.map((row) => (
              <li
                key={row.severity}
                className="flex items-center justify-between text-xs text-zinc-300"
              >
                <span className="capitalize">{row.severity}</span>
                <span className="tabular-nums text-zinc-100">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            By status
          </p>
          <ul className="mt-2 space-y-1.5">
            {statistics.byStatus.map((row) => (
              <li
                key={row.status}
                className="flex items-center justify-between text-xs text-zinc-300"
              >
                <span className="capitalize">{row.status.replace(/_/g, " ")}</span>
                <span className="tabular-nums text-zinc-100">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 sm:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            By source module
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {statistics.byModule.map((row) => (
              <li
                key={row.module}
                className="flex items-center justify-between text-xs text-zinc-300"
              >
                <span className="truncate pr-2">{row.module}</span>
                <span className="tabular-nums text-zinc-100">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
