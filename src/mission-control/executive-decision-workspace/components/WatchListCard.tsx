"use client";

import Link from "next/link";
import type { ExecutiveWatchItem } from "../types";
import { SeverityBadge } from "./SeverityBadge";

export function WatchListCard({ item }: { item: ExecutiveWatchItem }) {
  const updatedLabel = new Date(item.lastUpdated).toLocaleString();

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-sm shadow-black/20 transition-colors hover:border-zinc-700 focus-within:border-zinc-600">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={item.severity} />
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              {item.category}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-zinc-50">{item.title}</h3>
        </div>
        <Link
          href={item.viewDetailsAction.href}
          className="inline-flex shrink-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-200 outline-none transition-colors hover:border-zinc-500 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-teal-500/50"
          aria-label={`${item.viewDetailsAction.label} for ${item.title}`}
        >
          {item.viewDetailsAction.label}
        </Link>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{item.description}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-zinc-600">
        <span>Source · {item.sourceModule}</span>
        <span className="tabular-nums">Updated · {updatedLabel}</span>
      </div>
    </li>
  );
}

/** @deprecated Prefer WatchListCard */
export const WatchListItem = WatchListCard;
