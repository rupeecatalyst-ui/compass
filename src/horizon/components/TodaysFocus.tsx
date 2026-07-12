"use client";

import type { FocusItem } from "../types";
import { EmptyState } from "./EmptyState";

export function TodaysFocus({
  items,
  onSelect,
}: {
  items: FocusItem[];
  onSelect?: (item: FocusItem) => void;
}) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="horizon-today-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Today&apos;s Focus
      </p>
      <h2 id="horizon-today-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        What matters now
      </h2>
      {items.length === 0 ? (
        <EmptyState className="mt-3" title="Nothing queued for today" />
      ) : (
        <ul className="mt-3 space-y-2" role="list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect?.(item)}
                className="w-full rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-left transition hover:border-zinc-700 hover:bg-zinc-900/70"
              >
                <p className="text-[9px] uppercase tracking-wider text-zinc-600">
                  {item.kind} · {item.initiativeTitle}
                </p>
                <p className="mt-0.5 text-sm font-medium text-zinc-100">{item.title}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{item.reason}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
