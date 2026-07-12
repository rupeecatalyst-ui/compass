"use client";

import type { ExecutiveWatchItem } from "../types";
import { EmptyState } from "./EmptyState";
import { SectionHeader } from "./SectionHeader";
import { WatchListCard } from "./WatchListCard";

export function ExecutiveWatchList({ items }: { items: ExecutiveWatchItem[] }) {
  return (
    <section className="space-y-3" aria-labelledby="edw-watch-list-heading">
      <SectionHeader
        eyebrow="Executive Watch List"
        title="What should be monitored"
        description="Placeholder watch items — not live monitoring feeds."
      />
      <h2 id="edw-watch-list-heading" className="sr-only">
        Executive Watch List
      </h2>
      {items.length === 0 ? (
        <EmptyState
          title="Watch list is empty"
          description="No items require monitoring in this placeholder set."
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2" role="list">
          {items.map((item) => (
            <WatchListCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
