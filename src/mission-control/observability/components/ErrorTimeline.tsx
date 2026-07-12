"use client";

import type { ErrorTimelineEvent } from "../types";
import { ObservabilitySeverityBadge } from "./StatusBadges";

export function ErrorTimeline({ events }: { events: readonly ErrorTimelineEvent[] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="obs-errors-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Error Timeline
      </p>
      <h2 id="obs-errors-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Recent error signals
      </h2>
      <ol className="mt-3 space-y-0" role="list">
        {sorted.map((event, index) => (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-400/80" aria-hidden />
              {index < sorted.length - 1 ? (
                <span className="mt-1 w-px flex-1 bg-zinc-800" aria-hidden />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <ObservabilitySeverityBadge severity={event.severity} />
                <span className="tabular-nums text-[10px] text-zinc-600">
                  {new Date(event.occurredAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-100">{event.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{event.summary}</p>
              <p className="mt-1 text-[10px] text-zinc-600">{event.sourceModule}</p>
              <button
                type="button"
                className="mt-2 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400"
                disabled
                title="Placeholder — no lifecycle mutation"
              >
                {event.acknowledgeAction.label}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
