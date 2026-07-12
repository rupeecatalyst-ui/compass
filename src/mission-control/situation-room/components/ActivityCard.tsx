"use client";

import type { ActivityFeedItem } from "../types";
import { SituationSeverityBadge } from "./StatusBadges";

export function ActivityCard({ item }: { item: ActivityFeedItem }) {
  const timeLabel = new Date(item.timestamp).toLocaleString();

  return (
    <li className="relative border-l border-zinc-800 pl-4">
      <span
        className="absolute -left-1 top-1.5 h-2 w-2 rounded-full bg-zinc-600"
        aria-hidden
      />
      <article
        className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 shadow-sm shadow-black/10 transition-colors hover:border-zinc-700"
        aria-labelledby={`activity-${item.id}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <SituationSeverityBadge severity={item.severity} />
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">{item.category}</span>
          <span className="tabular-nums text-[10px] text-zinc-600">{timeLabel}</span>
        </div>
        <h3 id={`activity-${item.id}`} className="mt-2 text-sm font-medium text-zinc-100">
          {item.title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{item.description}</p>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-600">
          Source · {item.sourceModule}
        </p>
      </article>
    </li>
  );
}
