"use client";

import type { ComplianceStatusModel } from "../types";
import { SecurityHealthBadge } from "./StatusBadges";

export function ComplianceStatus({ compliance }: { compliance: ComplianceStatusModel }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="soc-compliance-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Compliance Status
          </p>
          <h2 id="soc-compliance-heading" className="mt-1 text-sm font-semibold text-zinc-50">
            Control awareness
          </h2>
        </div>
        <SecurityHealthBadge status={compliance.status} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">{compliance.summary}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Overall</dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-100">{compliance.overallLabel}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Controls</dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-100">
            {compliance.controlsPassingLabel}
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wider text-zinc-500">Findings</dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-100">{compliance.openFindingsLabel}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[10px] text-zinc-600">Next review · {compliance.nextReviewLabel}</p>
    </section>
  );
}
