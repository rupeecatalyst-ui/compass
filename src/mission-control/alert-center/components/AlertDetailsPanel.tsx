"use client";

import Link from "next/link";
import type { EnterpriseAlert } from "../types";
import { AlertStatusBadge } from "./AlertStatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import { EmptyState } from "./EmptyState";
import { SeverityBadge } from "./SeverityBadge";

export function AlertDetailsPanel({
  alert,
  embedded = false,
}: {
  alert: EnterpriseAlert | null;
  embedded?: boolean;
}) {
  if (!alert) {
    return (
      <section className="space-y-3" aria-labelledby={embedded ? undefined : "ac-details-heading"}>
        {!embedded && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Alert Details
            </p>
            <h2 id="ac-details-heading" className="mt-1 text-lg font-semibold text-zinc-50">
              Selected alert
            </h2>
          </div>
        )}
        <EmptyState
          title="Select an alert"
          description="Choose an alert from the timeline to inspect details."
        />
      </section>
    );
  }

  const generated = new Date(alert.generatedAt).toLocaleString();

  return (
    <section
      className="space-y-3"
      aria-labelledby={embedded ? undefined : "ac-details-heading"}
      aria-live="polite"
    >
      {!embedded && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Alert Details
          </p>
          <h2 id="ac-details-heading" className="mt-1 text-lg font-semibold text-zinc-50">
            Selected alert
          </h2>
        </div>
      )}
      <article className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-sm shadow-black/20">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={alert.severity} />
          <CategoryBadge category={alert.category} />
          <AlertStatusBadge status={alert.status} />
          <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
            {alert.acknowledged ? "Acknowledged" : "Unacknowledged"}
          </span>
        </div>
        <h3 className="mt-3 text-base font-semibold text-zinc-50">{alert.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{alert.summary}</p>
        <p className="mt-3 text-xs leading-relaxed text-zinc-400">{alert.description}</p>
        <dl className="mt-4 space-y-1.5 text-[11px] text-zinc-400">
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold uppercase tracking-wide text-zinc-600">Module</dt>
            <dd>{alert.sourceModule}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold uppercase tracking-wide text-zinc-600">
              Generated
            </dt>
            <dd className="tabular-nums">{generated}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold uppercase tracking-wide text-zinc-600">
              Recommended
            </dt>
            <dd>{alert.recommendedAction}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {alert.viewDetails.href ? (
            <Link
              href={alert.viewDetails.href}
              className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-200 outline-none transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-teal-500/50"
            >
              {alert.viewDetails.label}
            </Link>
          ) : null}
          {alert.dismissAction && (
            <button
              type="button"
              className="inline-flex rounded-md border border-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-500 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
              title="Placeholder — no dismiss workflow"
              aria-label={`${alert.dismissAction.label} (placeholder)`}
            >
              {alert.dismissAction.label}
            </button>
          )}
        </div>
      </article>
    </section>
  );
}
