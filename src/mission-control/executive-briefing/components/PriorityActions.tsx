"use client";

import type { PriorityAction } from "../types";
import { PriorityActionCard } from "./PriorityActionCard";

export function PriorityActions({ actions }: { actions: PriorityAction[] }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Priority Actions
        </p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-50">What needs attention</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <PriorityActionCard key={action.id} action={action} />
        ))}
      </div>
    </section>
  );
}
