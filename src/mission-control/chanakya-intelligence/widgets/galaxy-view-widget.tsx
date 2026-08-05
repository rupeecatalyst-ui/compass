"use client";

import type { WidgetComponentProps } from "@/mission-control/shared/widget-framework";
import type { ChanakyaIntelligenceModel } from "@/types/chanakya-intelligence";
import { CI_TONE_DOT, CI_TONE_FILL, CI_TONE_LABEL } from "./tone";
import { cn } from "@/mission-control/shared/cn";

type Payload = {
  model: ChanakyaIntelligenceModel;
  selectedCluster: string | null;
  setSelectedCluster: (k: string | null) => void;
  onOpenDeal: (href: string) => void;
};

export function GalaxyViewWidget({ payload }: WidgetComponentProps) {
  const p = payload as Payload | undefined;
  if (!p?.model) return null;
  const { model, selectedCluster, setSelectedCluster, onOpenDeal } = p;
  const focusIds = selectedCluster
    ? new Set(
        model.galaxy.clusters.find((c) => c.key === selectedCluster)?.nodeIds ?? [],
      )
    : null;

  return (
    <div className="flex h-full min-h-[280px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-400">
        {(Object.keys(CI_TONE_LABEL) as (keyof typeof CI_TONE_LABEL)[]).map((tone) => (
          <span key={tone} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", CI_TONE_DOT[tone])} />
            {CI_TONE_LABEL[tone]}
          </span>
        ))}
        <span className="ml-auto tabular-nums text-zinc-500">
          {model.galaxy.nodes.length} transactions
        </span>
      </div>

      <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-xl border border-zinc-800/80 bg-[radial-gradient(ellipse_at_center,_rgba(15,23,42,0.2),_rgba(9,9,11,0.95))]">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.25) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label="Galaxy portfolio">
          {model.galaxy.nodes.map((n) => {
            const dimmed = focusIds ? !focusIds.has(n.id) : false;
            const r = 0.9 + Math.min(2.2, n.amount / 25_000_000);
            return (
              <circle
                key={n.id}
                cx={n.x * 100}
                cy={n.y * 100}
                r={r}
                fill={CI_TONE_FILL[n.tone]}
                opacity={dimmed ? 0.18 : 0.92}
                className="cursor-pointer transition-opacity duration-300"
                onClick={() => onOpenDeal(n.href)}
              >
                <title>
                  {n.borrower} · {n.dealId} · {n.product} · Momentum {n.activityMomentumScore}
                </title>
              </circle>
            );
          })}
        </svg>
        {model.galaxy.nodes.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
            No active transactions for current filters.
          </p>
        ) : null}
      </div>

      <div className="flex max-h-24 gap-2 overflow-x-auto pb-1">
        {model.galaxy.clusters.slice(0, 12).map((c) => {
          const active = selectedCluster === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelectedCluster(active ? null : c.key)}
              className={cn(
                "shrink-0 rounded-lg border px-2.5 py-1.5 text-left transition",
                active
                  ? "border-teal-500/50 bg-teal-500/10 text-teal-100"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600",
              )}
            >
              <p className="max-w-[10rem] truncate text-[11px] font-medium">{c.label}</p>
              <p className="text-[10px] text-zinc-500">
                {c.count} · {CI_TONE_LABEL[c.tone]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
