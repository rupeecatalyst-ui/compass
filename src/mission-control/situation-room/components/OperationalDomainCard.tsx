"use client";

import Link from "next/link";
import type { OperationalDomain } from "../types";
import { SituationTrendIndicator } from "./SituationTrendIndicator";
import { HealthStatusBadge, SituationSeverityBadge } from "./StatusBadges";

export function OperationalDomainCard({ domain }: { domain: OperationalDomain }) {
  return (
    <article
      className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-sm shadow-black/20 transition-colors hover:border-zinc-700 focus-within:border-zinc-600"
      aria-labelledby={`domain-${domain.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <HealthStatusBadge status={domain.status} />
        <SituationSeverityBadge severity={domain.severity} />
        <SituationTrendIndicator trend={domain.trend} />
      </div>
      <h3 id={`domain-${domain.id}`} className="mt-3 text-sm font-semibold text-zinc-50">
        {domain.title}
      </h3>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-zinc-400">{domain.summary}</p>
      <div className="mt-4">
        <Link
          href={domain.viewDetailsAction.href}
          className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-200 outline-none transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-teal-500/50"
          aria-label={`${domain.viewDetailsAction.label}: ${domain.title}`}
        >
          {domain.viewDetailsAction.label}
        </Link>
      </div>
    </article>
  );
}
