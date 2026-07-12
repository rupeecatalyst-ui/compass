"use client";

import type { ServiceStatusItem } from "../types";
import { ServiceStatusBadge } from "./StatusBadges";

export function ServiceStatusPanel({ services }: { services: readonly ServiceStatusItem[] }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="obs-services-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Service Status
      </p>
      <h2 id="obs-services-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Runtime surfaces
      </h2>
      <ul className="mt-3 space-y-2" role="list">
        {services.map((svc) => (
          <li
            key={svc.id}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-100">{svc.name}</p>
              <ServiceStatusBadge status={svc.status} />
            </div>
            <p className="mt-1 text-xs text-zinc-500">{svc.summary}</p>
            <p className="mt-1 text-[10px] text-zinc-600">
              {[svc.regionHint, svc.versionHint].filter(Boolean).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
