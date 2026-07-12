"use client";

import type { EnterpriseHighlight } from "../types";
import { HighlightCard } from "./HighlightCard";

export function HighlightsSection({ highlights }: { highlights: EnterpriseHighlight[] }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Enterprise Highlights
        </p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-50">Standing out today</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((highlight) => (
          <HighlightCard key={highlight.id} highlight={highlight} />
        ))}
      </div>
    </section>
  );
}
