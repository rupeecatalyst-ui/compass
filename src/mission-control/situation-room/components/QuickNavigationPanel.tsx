"use client";

import Link from "next/link";
import type { QuickNavItem } from "../types";

export function QuickNavigationPanel({
  items,
  embedded = false,
}: {
  items: QuickNavItem[];
  embedded?: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby={embedded ? undefined : "sr-quick-nav-heading"}>
      {!embedded && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Quick Navigation
          </p>
          <h2 id="sr-quick-nav-heading" className="mt-1 text-lg font-semibold text-zinc-50">
            Jump to control surfaces
          </h2>
        </div>
      )}
      <nav aria-label="Situation Room quick navigation">
        <ul className="grid gap-2 sm:grid-cols-2" role="list">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 shadow-sm shadow-black/10 outline-none transition-colors hover:border-zinc-600 hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-teal-500/50"
                aria-label={item.label}
              >
                <span className="block text-sm font-medium text-zinc-100">{item.label}</span>
                {item.description && (
                  <span className="mt-0.5 block text-[11px] text-zinc-500">{item.description}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
