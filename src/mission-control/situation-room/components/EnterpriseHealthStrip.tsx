"use client";

import type { EnterpriseHealthIndicator } from "../types";
import { cn } from "../../shared/cn";
import { HealthStatusBadge } from "./StatusBadges";

export function EnterpriseHealthStrip({
  indicators,
  embedded = false,
}: {
  indicators: EnterpriseHealthIndicator[];
  embedded?: boolean;
}) {
  return (
    <section
      className={cn(
        !embedded &&
          "rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 shadow-sm shadow-black/20 md:p-4",
      )}
      aria-label="Enterprise Health Strip"
    >
      {!embedded && (
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Enterprise Health
        </p>
      )}
      <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6" role="list">
        {indicators.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-zinc-200">{item.label}</p>
              {item.detail && (
                <p className="truncate text-[10px] text-zinc-600">{item.detail}</p>
              )}
            </div>
            <HealthStatusBadge status={item.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
