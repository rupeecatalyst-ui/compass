"use client";

import Link from "next/link";
import type { AlertNavigateAction } from "../types";

export function QuickActions({
  actions,
  embedded = false,
}: {
  actions: AlertNavigateAction[];
  embedded?: boolean;
}) {
  return (
    <section
      className="space-y-3"
      aria-labelledby={embedded ? undefined : "ac-quick-actions-heading"}
    >
      {!embedded && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Quick Actions
          </p>
          <h2 id="ac-quick-actions-heading" className="mt-1 text-lg font-semibold text-zinc-50">
            Navigate related surfaces
          </h2>
        </div>
      )}
      <nav aria-label="Alert Center quick actions">
        <ul className="grid gap-2 sm:grid-cols-2" role="list">
          {actions.map((action) => (
            <li key={action.label}>
              {action.href ? (
                <Link
                  href={action.href}
                  className="block rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 text-sm font-medium text-zinc-100 outline-none transition-colors hover:border-zinc-600 hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-teal-500/50"
                >
                  {action.label}
                </Link>
              ) : (
                <span className="block rounded-xl border border-zinc-800 px-3 py-3 text-sm text-zinc-500">
                  {action.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

/** @deprecated Prefer QuickActions */
export const AlertQuickActions = QuickActions;
