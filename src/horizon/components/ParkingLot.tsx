"use client";

import type { ParkingItem } from "../types";
import { EmptyState } from "./EmptyState";

export function ParkingLot({ items }: { items: ParkingItem[] }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="horizon-parking-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Parking Lot
      </p>
      <h2 id="horizon-parking-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Intentionally deferred
      </h2>
      {items.length === 0 ? (
        <EmptyState className="mt-3" title="Parking lot is empty" />
      ) : (
        <ul className="mt-3 space-y-2" role="list">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2"
            >
              <p className="text-sm font-medium text-zinc-100">{item.title}</p>
              {item.notes && <p className="mt-1 text-[11px] text-zinc-500">{item.notes}</p>}
              <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">
                {item.initiativeTitle ?? "Portfolio"} · Parked{" "}
                {new Date(item.parkedAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
