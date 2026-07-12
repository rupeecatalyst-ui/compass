"use client";

import { useMemo, useState } from "react";
import type { PriorityAction, PriorityLevel } from "../types";
import { EmptyState } from "./EmptyState";
import { PriorityActionCard } from "./PriorityActionCard";
import { SectionHeader } from "./SectionHeader";
import { cn } from "../../shared/cn";

const FILTERS: Array<{ id: "all" | PriorityLevel; label: string }> = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

/**
 * Priority filter is UI-only (client presentation). No business rules.
 */
export function PriorityActionsSection({ actions }: { actions: PriorityAction[] }) {
  const [filter, setFilter] = useState<"all" | PriorityLevel>("all");

  const visible = useMemo(() => {
    if (filter === "all") return actions;
    return actions.filter((a) => a.priority === filter);
  }, [actions, filter]);

  return (
    <section className="space-y-3" aria-labelledby="edw-priority-actions-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeader
          eyebrow="Priority Actions"
          title="What needs immediate attention"
          description="Placeholder actions for executive triage — not live signals."
        />
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Filter priority actions"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-500/50",
                filter === f.id
                  ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                  : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
              )}
              aria-pressed={filter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <h2 id="edw-priority-actions-heading" className="sr-only">
        Priority Actions
      </h2>
      {visible.length === 0 ? (
        <EmptyState
          title="No priority actions for this filter"
          description="Adjust the priority filter or wait for provider updates."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((action) => (
            <PriorityActionCard key={action.id} action={action} />
          ))}
        </div>
      )}
    </section>
  );
}
