"use client";

import type { ProgressEntry } from "../types";
import { EmptyState } from "./EmptyState";

export function RecentProgress({ entries }: { entries: ProgressEntry[] }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="horizon-progress-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Recent Progress
      </p>
      <h2 id="horizon-progress-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Latest movement
      </h2>
      {entries.length === 0 ? (
        <EmptyState className="mt-3" title="No recent progress" />
      ) : (
        <ol className="mt-3 space-y-2" role="list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2"
            >
              <p className="text-[10px] tabular-nums uppercase tracking-wider text-zinc-600">
                {new Date(entry.at).toLocaleString()} · {entry.initiativeTitle}
              </p>
              <p className="mt-0.5 text-sm font-medium text-zinc-100">{entry.title}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{entry.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
