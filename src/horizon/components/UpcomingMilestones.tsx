"use client";

import type { UpcomingMilestoneItem } from "../types";
import { EmptyState } from "./EmptyState";
import { HealthBadge } from "./HealthBadge";
import { ProgressIndicator } from "./ProgressIndicator";

export function UpcomingMilestones({
  items,
  onSelect,
}: {
  items: UpcomingMilestoneItem[];
  onSelect?: (item: UpcomingMilestoneItem) => void;
}) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="horizon-milestones-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Upcoming Milestones
      </p>
      <h2 id="horizon-milestones-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Near-horizon markers
      </h2>
      {items.length === 0 ? (
        <EmptyState className="mt-3" title="No upcoming milestones" />
      ) : (
        <ul className="mt-3 space-y-2" role="list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect?.(item)}
                className="w-full rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-left transition hover:border-zinc-700 hover:bg-zinc-900/70"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <HealthBadge health={item.health} />
                  <span className="tabular-nums text-[10px] text-zinc-600">
                    {new Date(item.targetDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-zinc-100">{item.title}</p>
                <p className="text-[11px] text-zinc-500">{item.initiativeTitle}</p>
                <ProgressIndicator value={item.progress} size="sm" className="mt-2" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
