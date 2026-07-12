"use client";

import type { EnterpriseAlert } from "../types";
import { AlertCard } from "./AlertCard";
import { EmptyState } from "./EmptyState";

export function AlertTimeline({
  alerts,
  selectedId,
  onSelect,
  embedded = false,
}: {
  alerts: EnterpriseAlert[];
  selectedId?: string;
  onSelect?: (alert: EnterpriseAlert) => void;
  embedded?: boolean;
}) {
  const chronological = [...alerts].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );

  return (
    <section className="space-y-3" aria-labelledby={embedded ? undefined : "ac-timeline-heading"}>
      {!embedded && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Alert Timeline
          </p>
          <h2 id="ac-timeline-heading" className="mt-1 text-lg font-semibold text-zinc-50">
            Chronological alerts
          </h2>
        </div>
      )}
      {chronological.length === 0 ? (
        <EmptyState
          title="No alerts match the current filters"
          description="Adjust severity, category, module, status, date range, acknowledgement, or search."
        />
      ) : (
        <ol className="space-y-3" role="list">
          {chronological.map((alert) => (
            <li key={alert.id}>
              <AlertCard
                alert={alert}
                selected={alert.id === selectedId}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
