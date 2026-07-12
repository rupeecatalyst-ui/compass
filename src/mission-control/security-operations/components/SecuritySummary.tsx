"use client";

import { Shield } from "lucide-react";
import type { SecuritySummaryModel } from "../types";

export function SecuritySummary({ summary }: { summary: SecuritySummaryModel }) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-5 shadow-sm shadow-black/20 md:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 0% 0%, rgba(244,63,94,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 20%, rgba(45,212,191,0.08), transparent 50%)",
        }}
        aria-hidden
      />
      <div className="relative space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200">
                <Shield className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200/80">
                Security Operations Center
              </p>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
              {summary.title}
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">{summary.summary}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Posture</p>
            <p className="mt-0.5 text-sm font-semibold text-amber-200">{summary.postureLabel}</p>
            <p className="mt-1 text-[10px] tabular-nums text-zinc-600">
              As of · {new Date(summary.asOf).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
          <span>
            Open events <span className="tabular-nums text-zinc-200">{summary.openEvents}</span>
          </span>
          <span>
            Elevated domains{" "}
            <span className="tabular-nums text-zinc-200">{summary.elevatedDomains}</span>
          </span>
          <span className="truncate">Sources · {summary.sourceModules.join(" · ")}</span>
        </div>
      </div>
    </header>
  );
}
