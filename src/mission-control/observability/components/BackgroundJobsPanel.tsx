"use client";

import type { BackgroundJobItem } from "../types";
import { JobStatusBadge } from "./StatusBadges";

export function BackgroundJobsPanel({ jobs }: { jobs: readonly BackgroundJobItem[] }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="obs-jobs-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Background Jobs
      </p>
      <h2 id="obs-jobs-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Job fabric awareness
      </h2>
      <ul className="mt-3 space-y-2" role="list">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-100">{job.name}</p>
              <JobStatusBadge status={job.status} />
            </div>
            <p className="mt-1 text-xs text-zinc-500">{job.summary}</p>
            <p className="mt-1 text-[10px] text-zinc-600">
              {[job.queueHint, job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
