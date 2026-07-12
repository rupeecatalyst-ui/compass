"use client";

import type { AlertSummary } from "../types";

export function AlertSummaryStrip({
  summary,
  embedded = false,
}: {
  summary: AlertSummary;
  embedded?: boolean;
}) {
  const asOf = new Date(summary.asOf).toLocaleString();

  const tiles = [
    { id: "total", label: "Total", value: summary.total, tone: "text-zinc-50" },
    { id: "open", label: "Open", value: summary.open, tone: "text-zinc-50" },
    { id: "critical", label: "Critical", value: summary.critical, tone: "text-rose-200" },
    {
      id: "acked",
      label: "Acknowledged",
      value: summary.acknowledged,
      tone: "text-sky-200",
    },
    {
      id: "unacked",
      label: "Unacknowledged",
      value: summary.unacknowledged,
      tone: "text-amber-200",
    },
  ];

  return (
    <section
      className={
        embedded
          ? undefined
          : "rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 shadow-sm shadow-black/20 md:p-4"
      }
      aria-label="Alert summary strip"
    >
      {!embedded && (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Alert Summary
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Placeholder counts from mock alerts — not computed KPIs.
            </p>
          </div>
          <p className="tabular-nums text-[10px] uppercase tracking-wider text-zinc-600">
            As of · {asOf}
          </p>
        </div>
      )}
      <ul className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5" role="list">
        {tiles.map((tile) => (
          <li
            key={tile.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{tile.label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${tile.tone}`}>{tile.value}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
