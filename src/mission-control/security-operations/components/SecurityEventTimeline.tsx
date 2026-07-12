"use client";

import type { SecurityEvent } from "../types";
import { SecuritySeverityBadge } from "./StatusBadges";

export function SecurityEventTimeline({ events }: { events: readonly SecurityEvent[] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="soc-timeline-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Threat Timeline
      </p>
      <h2 id="soc-timeline-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Active security events
      </h2>
      <ol className="mt-3 space-y-0" role="list">
        {sorted.map((event, index) => (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-rose-400/80" aria-hidden />
              {index < sorted.length - 1 ? (
                <span className="mt-1 w-px flex-1 bg-zinc-800" aria-hidden />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <SecuritySeverityBadge severity={event.severity} />
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                  {event.kind} · {event.domainId.replace("_", " ")}
                </span>
                <span className="tabular-nums text-[10px] text-zinc-600">
                  {new Date(event.occurredAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-100">{event.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{event.summary}</p>
              <p className="mt-1 text-[10px] text-zinc-600">{event.sourceModule}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-300"
                  disabled
                  title="Placeholder — no lifecycle mutation"
                >
                  {event.acknowledgeAction.label}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-300"
                  disabled
                  title="Placeholder — no investigation workflow"
                >
                  {event.investigateAction.label}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
