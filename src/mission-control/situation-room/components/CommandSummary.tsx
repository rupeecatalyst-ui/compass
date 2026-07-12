"use client";

import type { CommandSummaryModel } from "../types";
import { cn } from "../../shared/cn";

export function CommandSummary({
  summary,
  embedded = false,
}: {
  summary: CommandSummaryModel;
  embedded?: boolean;
}) {
  const asOfLabel = new Date(summary.asOf).toLocaleString();

  return (
    <section
      className={cn(
        !embedded &&
          "rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-5 shadow-sm shadow-black/20 md:p-6",
      )}
      aria-labelledby="sr-command-summary-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          {!embedded && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Top Command Summary
            </p>
          )}
          <h1
            id="sr-command-summary-heading"
            className={cn(
              "font-semibold tracking-tight text-zinc-50",
              embedded ? "text-xl md:text-2xl" : "text-2xl md:text-3xl",
            )}
          >
            {summary.title}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-300">{summary.summary}</p>
        </div>
        <div className="rounded-xl border border-teal-500/25 bg-teal-500/10 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-teal-300/90">
            Enterprise posture
          </p>
          <p className="text-sm font-semibold text-teal-50">{summary.postureLabel}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-800/80 pt-3 text-[10px] uppercase tracking-wider text-zinc-600">
        <span className="tabular-nums">As of · {asOfLabel}</span>
        <span>Sources · {summary.sourceModules.join(", ") || "—"}</span>
      </div>
    </section>
  );
}
