"use client";

import type { EnterpriseHighlight } from "../types";
import { TrendIndicator } from "./TrendIndicator";

export function HighlightCard({ highlight }: { highlight: EnterpriseHighlight }) {
  return (
    <article
      className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 shadow-sm shadow-black/20 transition-colors hover:border-zinc-700 focus-within:border-zinc-600"
      aria-label={`${highlight.label}: ${highlight.value}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          {highlight.label}
        </p>
        <TrendIndicator trend={highlight.trend} />
      </div>
      <p className="mt-2 text-base font-semibold tracking-tight text-zinc-50">{highlight.value}</p>
      {highlight.detail && (
        <p className="mt-1 text-[11px] text-zinc-500">{highlight.detail}</p>
      )}
      <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-600">
        {highlight.category}
      </p>
    </article>
  );
}
