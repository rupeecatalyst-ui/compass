"use client";

import type { EnterpriseHealthIndicator } from "../types";
import { cn } from "../../shared/cn";

export function EnterpriseHealthSection({
  indicators,
}: {
  indicators: EnterpriseHealthIndicator[];
}) {
  return (
    <section className="space-y-3">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Enterprise Health
        </p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-100">
          System posture — healthy / warning only
        </h3>
      </header>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {indicators.map((item) => (
          <article
            key={item.id}
            className={cn(
              "rounded-xl border px-3 py-3",
              item.state === "warning"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-zinc-800 bg-zinc-950/70",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-zinc-200">{item.label}</p>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                  item.state === "warning"
                    ? "bg-amber-500/15 text-amber-200/90"
                    : "bg-zinc-800 text-zinc-400",
                )}
              >
                {item.state === "warning" ? "Warning" : "Healthy"}
              </span>
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-zinc-500">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
