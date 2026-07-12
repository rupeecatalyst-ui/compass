"use client";

import type { AvailabilitySnapshot } from "../types";
import { ObservabilityHealthBadge } from "./StatusBadges";

export function AvailabilityPanel({ availability }: { availability: AvailabilitySnapshot }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="obs-avail-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Availability
          </p>
          <h2 id="obs-avail-heading" className="mt-1 text-sm font-semibold text-zinc-50">
            Uptime posture
          </h2>
        </div>
        <ObservabilityHealthBadge status={availability.status} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">{availability.summary}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Overall</dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-100">{availability.overallLabel}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Uptime</dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-100">{availability.uptimeLabel}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-zinc-500">SLO</dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-100">{availability.sloLabel}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Incidents</dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-100">
            {availability.incidentsOpenLabel}
          </dd>
        </div>
      </dl>
    </section>
  );
}
