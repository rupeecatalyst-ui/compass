"use client";

import Link from "next/link";
import type { PriorityAction } from "../types";
import { PriorityBadge } from "./PriorityBadge";
import { SeverityBadge } from "./SeverityBadge";

export function PriorityActionCard({ action }: { action: PriorityAction }) {
  return (
    <article
      className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-sm shadow-black/20 transition-colors hover:border-zinc-700 focus-within:border-zinc-600"
      aria-labelledby={`priority-action-${action.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={action.priority} />
        <SeverityBadge severity={action.severity} />
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {action.category}
        </span>
      </div>
      <h3
        id={`priority-action-${action.id}`}
        className="mt-3 text-sm font-semibold text-zinc-50"
      >
        {action.title}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{action.summary}</p>
      <p className="mt-3 text-[11px] text-zinc-500">
        <span className="font-semibold uppercase tracking-wide text-zinc-600">Reason · </span>
        {action.reason}
      </p>
      <p className="mt-2 text-[11px] text-zinc-400">
        <span className="font-semibold uppercase tracking-wide text-zinc-600">Recommended · </span>
        {action.recommendedAction}
      </p>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-600">
        Module · {action.sourceModule}
      </p>
      <div className="mt-auto pt-4">
        <Link
          href={action.navigateAction.href}
          className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-200 outline-none transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-teal-500/50"
          aria-label={`${action.navigateAction.label}: ${action.title}`}
        >
          {action.navigateAction.label}
        </Link>
      </div>
    </article>
  );
}
