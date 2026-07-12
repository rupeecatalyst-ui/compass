"use client";

import Link from "next/link";
import type { EnterpriseAlert } from "../types";
import { AlertStatusBadge } from "./AlertStatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import { SeverityBadge } from "./SeverityBadge";
import { cn } from "../../shared/cn";

export function AlertCard({
  alert,
  selected,
  onSelect,
}: {
  alert: EnterpriseAlert;
  selected?: boolean;
  onSelect?: (alert: EnterpriseAlert) => void;
}) {
  const generated = new Date(alert.generatedAt).toLocaleString();

  return (
    <article
      className={cn(
        "rounded-xl border bg-zinc-950/80 p-4 shadow-sm shadow-black/20 transition-colors",
        selected ? "border-teal-500/40" : "border-zinc-800 hover:border-zinc-700",
        "focus-within:border-zinc-600",
      )}
      aria-labelledby={`alert-card-${alert.id}`}
    >
      <button
        type="button"
        onClick={() => onSelect?.(alert)}
        className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
        aria-pressed={selected}
        aria-label={`Select alert ${alert.title}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={alert.severity} />
          <CategoryBadge category={alert.category} />
          <AlertStatusBadge status={alert.status} />
          <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
            {alert.acknowledged ? "Acked" : "Unacked"}
          </span>
        </div>
        <h3 id={`alert-card-${alert.id}`} className="mt-2 text-sm font-semibold text-zinc-50">
          {alert.title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{alert.summary}</p>
        <p className="mt-2 text-[11px] text-zinc-500">
          <span className="font-semibold uppercase tracking-wide text-zinc-600">Recommended · </span>
          {alert.recommendedAction}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-zinc-600">
          <span>Module · {alert.sourceModule}</span>
          <span className="tabular-nums">Generated · {generated}</span>
        </div>
      </button>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800/80 pt-3">
        {alert.viewDetails.href ? (
          <Link
            href={alert.viewDetails.href}
            className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-200 outline-none transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-teal-500/50"
            aria-label={`${alert.viewDetails.label}: ${alert.title}`}
          >
            {alert.viewDetails.label}
          </Link>
        ) : (
          <button
            type="button"
            className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            aria-label={`${alert.viewDetails.label} (placeholder)`}
          >
            {alert.viewDetails.label}
          </button>
        )}
        {alert.dismissAction && (
          <button
            type="button"
            className="inline-flex rounded-md border border-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-500 outline-none transition-colors hover:border-zinc-700 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-teal-500/50"
            aria-label={`${alert.dismissAction.label} ${alert.title} (placeholder — no action)`}
            title="Placeholder — no dismiss workflow"
          >
            {alert.dismissAction.label}
          </button>
        )}
      </div>
    </article>
  );
}
