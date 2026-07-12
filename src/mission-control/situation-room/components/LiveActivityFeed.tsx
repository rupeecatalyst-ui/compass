"use client";

import type { ActivityFeedItem } from "../types";
import { ActivityCard } from "./ActivityCard";

export function LiveActivityFeed({
  items,
  embedded = false,
}: {
  items: ActivityFeedItem[];
  embedded?: boolean;
}) {
  const chronological = [...items].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <section className="space-y-3" aria-labelledby={embedded ? undefined : "sr-activity-heading"}>
      {!embedded && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Live Activity Feed
          </p>
          <h2 id="sr-activity-heading" className="mt-1 text-lg font-semibold text-zinc-50">
            Chronological awareness
          </h2>
        </div>
      )}
      <ol className="space-y-3" role="list">
        {chronological.map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
      </ol>
    </section>
  );
}
