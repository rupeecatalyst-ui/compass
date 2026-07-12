"use client";

import type { ProviderHealthItem } from "../types";
import { ObservabilityHealthBadge } from "./StatusBadges";

export function ProviderHealthPanel({
  providers,
}: {
  providers: readonly ProviderHealthItem[];
}) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="obs-providers-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Provider Health
      </p>
      <h2 id="obs-providers-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Framework providers
      </h2>
      <ul className="mt-3 space-y-2" role="list">
        {providers.map((provider) => (
          <li
            key={provider.id}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-100">{provider.name}</p>
              <ObservabilityHealthBadge status={provider.status} />
            </div>
            <p className="mt-1 text-xs text-zinc-500">{provider.summary}</p>
            <p className="mt-1 text-[10px] text-zinc-600">
              {provider.category} · {provider.latencyLabel}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
