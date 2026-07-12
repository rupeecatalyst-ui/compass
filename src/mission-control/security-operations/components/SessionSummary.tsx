"use client";

import type { SessionSummaryModel } from "../types";

export function SessionSummary({ sessions }: { sessions: SessionSummaryModel }) {
  const tiles = [
    { label: "Active sessions", value: sessions.activeSessionsLabel },
    { label: "Anomalous", value: sessions.anomalousSessionsLabel },
    { label: "Avg duration", value: sessions.avgDurationLabel },
    { label: "Remote access", value: sessions.remoteAccessLabel },
  ];

  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="soc-sessions-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Session Summary
      </p>
      <h2 id="soc-sessions-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Live session awareness
      </h2>
      <p className="mt-1 text-xs text-zinc-500">{sessions.summary}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" role="list">
        {tiles.map((tile) => (
          <li
            key={tile.label}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{tile.label}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-100">{tile.value}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
