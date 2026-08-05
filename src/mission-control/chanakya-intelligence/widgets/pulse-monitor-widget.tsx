"use client";

import type { WidgetComponentProps } from "@/mission-control/shared/widget-framework";
import type { ChanakyaIntelligenceModel } from "@/types/chanakya-intelligence";
import { cn } from "@/mission-control/shared/cn";

type Payload = { model: ChanakyaIntelligenceModel };

const TONE_CLASS = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-100",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-100",
  default: "border-zinc-700 bg-zinc-900/50 text-zinc-200",
} as const;

export function PulseMonitorWidget({ payload }: WidgetComponentProps) {
  const p = payload as Payload | undefined;
  if (!p?.model) return null;
  const { pulse } = p.model;
  const score = pulse.enterprisePulseScore;

  return (
    <div className="flex h-full min-h-[280px] flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-950/40 via-zinc-950 to-zinc-950 p-4">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-teal-400/20 blur-2xl"
          style={{ animation: "pulse 2.8s ease-in-out infinite" }}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300/80">
          Enterprise Pulse
        </p>
        <div className="mt-2 flex items-end gap-3">
          <span className="font-serif text-4xl font-semibold tabular-nums text-zinc-50 md:text-5xl">
            {score}
          </span>
          <span className="mb-1 text-xs text-zinc-400">/ 100</span>
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">
          Consumes Activity Intelligence Engine — operational heartbeat, not stage theatre.
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-2">
        {pulse.metrics
          .filter((m) => m.id !== "pulse")
          .map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-lg border px-2.5 py-2 transition hover:brightness-110",
                TONE_CLASS[m.tone],
              )}
            >
              <p className="text-[9px] font-semibold uppercase tracking-wide opacity-80">
                {m.label}
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{m.value}</p>
              <p className="text-[9px] opacity-70">{m.hint}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
