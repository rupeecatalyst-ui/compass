"use client";

import type { HierarchyNodeModel } from "../types";
import { EmptyState } from "./EmptyState";
import { HierarchyNode } from "./HierarchyNode";

export function InitiativesPanel({ hierarchy }: { hierarchy: HierarchyNodeModel[] }) {
  return (
    <section
      className="flex h-full min-h-[28rem] flex-col rounded-xl border border-zinc-800 bg-zinc-950/70"
      aria-labelledby="horizon-initiatives-heading"
    >
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Initiatives
        </p>
        <h2 id="horizon-initiatives-heading" className="mt-1 text-sm font-semibold text-zinc-50">
          Strategic initiative hierarchy
        </h2>
        <p className="mt-0.5 text-[11px] text-zinc-600">
          Initiative → Workstream → Milestone → Activity · expand/collapse · unlimited nesting
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {hierarchy.length === 0 ? (
          <EmptyState title="No initiatives" description="Portfolio hierarchy is empty." />
        ) : (
          <ul className="space-y-1" role="tree" aria-label="Horizon initiative hierarchy">
            {hierarchy.map((node) => (
              <HierarchyNode key={node.id} node={node} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
