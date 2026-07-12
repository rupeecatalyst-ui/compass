"use client";

import type { QuickAction } from "../types";
import { QuickActionButton } from "./QuickActionButton";

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Quick Actions
        </p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-50">Navigate the control plane</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {actions.map((action) => (
          <QuickActionButton key={action.id} action={action} />
        ))}
      </div>
    </section>
  );
}
