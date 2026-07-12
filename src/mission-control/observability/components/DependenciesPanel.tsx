"use client";

import type { DependencyItem } from "../types";
import { ObservabilityHealthBadge } from "./StatusBadges";

export function DependenciesPanel({
  dependencies,
}: {
  dependencies: readonly DependencyItem[];
}) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="obs-deps-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Dependencies
      </p>
      <h2 id="obs-deps-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Upstream & adjacent
      </h2>
      <ul className="mt-3 space-y-2" role="list">
        {dependencies.map((dep) => (
          <li
            key={dep.id}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-100">{dep.name}</p>
              <ObservabilityHealthBadge status={dep.status} />
            </div>
            <p className="mt-1 text-xs text-zinc-500">{dep.summary}</p>
            <p className="mt-1 text-[10px] text-zinc-600">
              {dep.kind}
              {dep.ownerModule ? ` · ${dep.ownerModule}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
