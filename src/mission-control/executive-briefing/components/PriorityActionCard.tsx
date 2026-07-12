"use client";

import Link from "next/link";
import type { ExecutiveBriefingPriority, PriorityAction } from "../types";
import { cn } from "../../shared/cn";

const PRIORITY_STYLES: Record<ExecutiveBriefingPriority, string> = {
  critical: "border-rose-500/45 bg-rose-500/15 text-rose-200",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  medium: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  low: "border-sky-500/35 bg-sky-500/10 text-sky-200",
};

export function PriorityActionCard({ action }: { action: PriorityAction }) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 transition-colors hover:border-zinc-700">
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
            PRIORITY_STYLES[action.priority],
          )}
        >
          {action.priority}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-zinc-50">{action.title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{action.description}</p>
      <p className="mt-3 text-[11px] text-zinc-500">
        <span className="font-semibold uppercase tracking-wide text-zinc-600">Reason · </span>
        {action.reason}
      </p>
      <p className="mt-2 text-[11px] text-zinc-400">
        <span className="font-semibold uppercase tracking-wide text-zinc-600">Recommended · </span>
        {action.recommendedAction}
      </p>
      <div className="mt-auto pt-4">
        <Link
          href={action.navigateTo}
          className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
        >
          {action.navigateLabel ?? "Navigate"}
        </Link>
      </div>
    </article>
  );
}
