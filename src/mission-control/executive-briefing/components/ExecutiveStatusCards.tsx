"use client";

import type { ExecutiveStatusCard } from "../types";
import { cn } from "../../shared/cn";

export function ExecutiveStatusCards({ cards }: { cards: ExecutiveStatusCard[] }) {
  return (
    <section className="space-y-3">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Executive Status
        </p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-100">
          What needs attention across the enterprise
        </h3>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <article
            key={card.id}
            className={cn(
              "rounded-2xl border bg-zinc-950/70 p-4",
              card.tone === "attention"
                ? "border-amber-500/25"
                : card.tone === "positive"
                  ? "border-teal-500/20"
                  : "border-zinc-800",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {card.subtitle}
            </p>
            <h4 className="mt-1 text-base font-semibold text-zinc-50">{card.title}</h4>
            <ul className="mt-3 space-y-2">
              {card.metrics.map((m) => (
                <li key={m.label} className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-zinc-500">{m.label}</span>
                  <span className="text-right text-[12px] font-semibold tabular-nums text-zinc-200">
                    {m.value}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
