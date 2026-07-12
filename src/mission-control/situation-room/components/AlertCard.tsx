"use client";

import type { CriticalAlert } from "../types";
import { SituationSeverityBadge } from "./StatusBadges";

/**
 * Alert actions are inert placeholders — no workflow execution.
 */
export function AlertCard({ alert }: { alert: CriticalAlert }) {
  return (
    <article
      className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-sm shadow-black/20 transition-colors hover:border-zinc-700 focus-within:border-zinc-600"
      aria-labelledby={`alert-${alert.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SituationSeverityBadge severity={alert.severity} />
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{alert.category}</span>
      </div>
      <h3 id={`alert-${alert.id}`} className="mt-2 text-sm font-semibold text-zinc-50">
        {alert.title}
      </h3>
      <p className="mt-2 text-[11px] text-zinc-400">
        <span className="font-semibold uppercase tracking-wide text-zinc-600">Recommended · </span>
        {alert.recommendedAction}
      </p>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-600">
        Source · {alert.sourceModule}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-300 outline-none transition-colors hover:border-zinc-500 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-teal-500/50"
          aria-label={`${alert.acknowledgeAction.label} ${alert.title} (placeholder)`}
          title="Placeholder — no alert workflow"
        >
          {alert.acknowledgeAction.label}
        </button>
        <button
          type="button"
          className="inline-flex rounded-md border border-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-500 outline-none transition-colors hover:border-zinc-700 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-teal-500/50"
          aria-label={`${alert.escalateAction.label} ${alert.title} (placeholder)`}
          title="Placeholder — no escalation workflow"
        >
          {alert.escalateAction.label}
        </button>
      </div>
    </article>
  );
}
