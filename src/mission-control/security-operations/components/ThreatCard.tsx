"use client";

import Link from "next/link";
import type { ThreatItem } from "../types";
import { SecuritySeverityBadge } from "./StatusBadges";

export function ThreatCard({ threat }: { threat: ThreatItem }) {
  return (
    <article className="rounded-xl border border-rose-500/20 bg-zinc-950/70 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <SecuritySeverityBadge severity={threat.severity} />
        <span className="text-[10px] uppercase tracking-wider text-zinc-600">
          {threat.category}
        </span>
        <span className="tabular-nums text-[10px] text-zinc-600">
          {new Date(threat.detectedAt).toLocaleString()}
        </span>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-zinc-50">{threat.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{threat.summary}</p>
      <p className="mt-2 text-[11px] text-zinc-400">
        Recommended · {threat.recommendedAction}
      </p>
      <p className="mt-1 text-[10px] text-zinc-600">{threat.sourceModule}</p>
      {threat.viewDetailsAction.href ? (
        <Link
          href={threat.viewDetailsAction.href}
          className="mt-3 inline-flex text-[11px] text-teal-300/90 transition hover:text-teal-200"
        >
          {threat.viewDetailsAction.label}
        </Link>
      ) : (
        <p className="mt-3 text-[11px] text-zinc-500">{threat.viewDetailsAction.label}</p>
      )}
    </article>
  );
}

export function ThreatCards({ threats }: { threats: readonly ThreatItem[] }) {
  return (
    <section aria-labelledby="soc-threats-heading">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Active threats
      </p>
      <h2 id="soc-threats-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Detection signals
      </h2>
      <ul className="mt-3 grid gap-2.5 sm:grid-cols-2" role="list">
        {threats.map((threat) => (
          <li key={threat.id}>
            <ThreatCard threat={threat} />
          </li>
        ))}
      </ul>
    </section>
  );
}
