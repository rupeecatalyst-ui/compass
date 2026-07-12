"use client";

import type { EnterpriseHighlight } from "../types";
import { EmptyState } from "./EmptyState";
import { HighlightCard } from "./HighlightCard";
import { SectionHeader } from "./SectionHeader";

export function EnterpriseHighlightsSection({
  highlights,
}: {
  highlights: EnterpriseHighlight[];
}) {
  return (
    <section className="space-y-3" aria-labelledby="edw-highlights-heading">
      <SectionHeader
        eyebrow="Enterprise Highlights"
        title="What positive developments occurred"
        description="Placeholder highlights with trend indicators — not computed KPIs."
      />
      <h2 id="edw-highlights-heading" className="sr-only">
        Enterprise Highlights
      </h2>
      {highlights.length === 0 ? (
        <EmptyState
          title="No highlights available"
          description="Highlights will appear when providers return data."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {highlights.map((highlight) => (
            <HighlightCard key={highlight.id} highlight={highlight} />
          ))}
        </div>
      )}
    </section>
  );
}
