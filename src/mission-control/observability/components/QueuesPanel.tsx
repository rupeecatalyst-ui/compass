"use client";

import type { QueueItem } from "../types";
import { QueuePressureBadge } from "./StatusBadges";

export function QueuesPanel({ queues }: { queues: readonly QueueItem[] }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="obs-queues-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Queues
      </p>
      <h2 id="obs-queues-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Queue pressure
      </h2>
      <ul className="mt-3 space-y-2" role="list">
        {queues.map((queue) => (
          <li
            key={queue.id}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-sm font-medium text-zinc-100">{queue.name}</p>
              <QueuePressureBadge pressure={queue.pressure} />
            </div>
            <p className="mt-1 text-xs text-zinc-500">{queue.summary}</p>
            <p className="mt-1 text-[10px] tabular-nums text-zinc-600">
              Depth {queue.depthLabel} · {queue.consumersLabel}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
