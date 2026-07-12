"use client";

import type { EnterpriseHighlight } from "../types";

export function HighlightCard({ highlight }: { highlight: EnterpriseHighlight }) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {highlight.label}
      </p>
      <p className="mt-2 text-base font-semibold tracking-tight text-zinc-50">{highlight.value}</p>
      {highlight.detail && (
        <p className="mt-1 text-[11px] text-zinc-500">{highlight.detail}</p>
      )}
    </article>
  );
}
