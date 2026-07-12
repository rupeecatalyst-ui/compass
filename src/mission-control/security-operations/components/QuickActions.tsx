"use client";

import Link from "next/link";
import type { SecurityAlertItem, SecurityQuickAction } from "../types";
import { SecuritySeverityBadge } from "./StatusBadges";

export function SecurityAlerts({ alerts }: { alerts: readonly SecurityAlertItem[] }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="soc-alerts-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Security Alerts
      </p>
      <h2 id="soc-alerts-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Priority signals
      </h2>
      <ul className="mt-3 space-y-2" role="list">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <SecuritySeverityBadge severity={alert.severity} />
              <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                {alert.category}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-zinc-100">{alert.title}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{alert.recommendedAction}</p>
            {alert.viewDetailsAction.href ? (
              <Link
                href={alert.viewDetailsAction.href}
                className="mt-2 inline-flex text-[11px] text-teal-300/90 hover:text-teal-200"
              >
                {alert.viewDetailsAction.label}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function QuickActions({ actions }: { actions: readonly SecurityQuickAction[] }) {
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="soc-actions-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Quick Actions
      </p>
      <h2 id="soc-actions-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Executive shortcuts
      </h2>
      <ul className="mt-3 space-y-2" role="list">
        {actions.map((action) => (
          <li key={action.id}>
            {action.href && !action.placeholder ? (
              <Link
                href={action.href}
                className="block rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5 transition hover:border-zinc-700 hover:bg-zinc-900/70"
              >
                <p className="text-sm font-medium text-zinc-100">{action.label}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{action.description}</p>
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-full rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-2.5 text-left"
                title="Placeholder action — no execution"
              >
                <p className="text-sm font-medium text-zinc-400">{action.label}</p>
                <p className="mt-0.5 text-[11px] text-zinc-600">{action.description}</p>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
