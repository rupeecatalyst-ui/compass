"use client";

import type { WaitingItem } from "../types";
import { EmptyState } from "./EmptyState";

export function WaitingOn({ items }: { items: WaitingItem[] }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="horizon-waiting-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Waiting On
      </p>
      <h2 id="horizon-waiting-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        External dependencies
      </h2>
      {items.length === 0 ? (
        <EmptyState className="mt-3" title="No waiting items" />
      ) : (
        <ul className="mt-3 space-y-2" role="list">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2"
            >
              <p className="text-sm font-medium text-zinc-100">{item.title}</p>
              <p className="mt-1 text-[11px] text-zinc-400">
                Waiting on <span className="text-zinc-200">{item.waitingOn}</span>
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">
                {item.initiativeTitle ?? "Portfolio"} · Since{" "}
                {new Date(item.since).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
