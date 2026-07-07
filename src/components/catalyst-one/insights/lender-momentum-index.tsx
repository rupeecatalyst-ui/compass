"use client";

import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { cn } from "@/lib/utils";
import type { LenderMomentumProfile, MomentumTrend } from "@/lib/insights/lender-intelligence";

const TONE_STYLES: Record<LenderMomentumProfile["tone"], { bar: string; text: string; badge: string }> = {
  leading: {
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-500/12 text-emerald-800 border-emerald-500/25 dark:text-emerald-200",
  },
  strong: {
    bar: "bg-emerald-400",
    text: "text-emerald-600 dark:text-emerald-300",
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-200",
  },
  healthy: {
    bar: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-500/10 text-blue-800 border-blue-500/25 dark:text-blue-200",
  },
  slow: {
    bar: "bg-amber-400",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-500/12 text-amber-800 border-amber-500/25 dark:text-amber-200",
  },
  attention: {
    bar: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-300",
    badge: "bg-orange-500/12 text-orange-800 border-orange-500/25 dark:text-orange-200",
  },
  critical: {
    bar: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
    badge: "bg-red-500/12 text-red-800 border-red-500/25 dark:text-red-200",
  },
};

function TrendIndicator({ trend }: { trend: MomentumTrend }) {
  const config = {
    improving: { symbol: "▲", label: "Improving", className: "text-emerald-600" },
    stable: { symbol: "►", label: "Stable", className: "text-slate-500" },
    declining: { symbol: "▼", label: "Declining", className: "text-red-500" },
  }[trend];

  return (
    <span className={cn("flex items-center gap-1 text-[10px] font-medium", config.className)}>
      <span className="text-[9px]">{config.symbol}</span>
      {config.label}
    </span>
  );
}

function MomentumRow({ profile }: { profile: LenderMomentumProfile }) {
  const style = TONE_STYLES[profile.tone];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5",
        profile.isPrimary && "ring-1 ring-amber-400/35",
      )}
    >
      <div className="flex w-[140px] shrink-0 items-center gap-2">
        <LenderLogo lender={profile.lender} size="md" />
        <p className="truncate text-xs font-semibold">{profile.lender}</p>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700", style.bar)}
            style={{ width: `${profile.score}%` }}
          />
        </div>
        <span className={cn("w-8 shrink-0 text-right text-sm font-bold tabular-nums", style.text)}>
          {profile.score}
        </span>
      </div>

      <span className={cn("hidden shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold sm:inline", style.badge)}>
        {profile.label}
      </span>

      <TrendIndicator trend={profile.trend} />
    </div>
  );
}

export function LenderMomentumIndex({ profiles }: { profiles: LenderMomentumProfile[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Lender Momentum Index</h3>
        <p className="text-[11px] text-muted-foreground">
          Weighted execution score — stage, progress, follow-ups, response, documents, activity
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 bg-gradient-to-b from-muted/15 to-background p-3 shadow-sm">
        {profiles.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No active lender cases for momentum scoring.
          </p>
        ) : (
          profiles.map((p) => <MomentumRow key={p.lenderCaseId} profile={p} />)
        )}
      </div>
    </section>
  );
}
