"use client";

import type { WidgetComponentProps } from "@/mission-control/shared/widget-framework";
import type { ChanakyaIntelligenceModel } from "@/types/chanakya-intelligence";
import { cn } from "@/mission-control/shared/cn";

type Payload = { model: ChanakyaIntelligenceModel };

export function RiverFlowWidget({ payload }: WidgetComponentProps) {
  const p = payload as Payload | undefined;
  if (!p?.model) return null;
  const { river } = p.model;
  const maxVol = Math.max(1, ...river.stages.map((s) => s.volume));

  return (
    <div className="flex h-full min-h-[280px] flex-col gap-3">
      <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
        <span>
          Pipeline velocity{" "}
          <strong className="text-teal-300 tabular-nums">{river.pipelineVelocity}</strong>
        </span>
        <span>
          Overall conversion{" "}
          <strong className="text-zinc-100 tabular-nums">{river.overallConversionPct}%</strong>
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-0">
        {river.stages.map((stage, idx) => {
          const widthPct = Math.max(12, Math.round((stage.volume / maxVol) * 100));
          return (
            <div key={stage.id} className="relative">
              <div
                className={cn(
                  "mx-auto flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500",
                  stage.isBottleneck
                    ? "border-amber-500/40 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.12)]"
                    : "border-zinc-800 bg-zinc-900/55",
                )}
                style={{ width: `${widthPct}%`, minWidth: "55%" }}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-50">{stage.label}</p>
                  <p className="text-[10px] text-zinc-500">
                    Vol {stage.volume} · Avg {stage.avgDays}d · Conv {stage.conversionPct}%
                    {stage.isBottleneck ? " · Bottleneck" : ""}
                  </p>
                </div>
                <div className="text-right text-[10px] text-zinc-400">
                  {idx < river.stages.length - 1 ? (
                    <span className="tabular-nums text-rose-300/90">
                      −{stage.dropOffPct}% drop
                    </span>
                  ) : (
                    <span className="text-emerald-300/90">Terminal</span>
                  )}
                </div>
              </div>
              {idx < river.stages.length - 1 ? (
                <div className="flex justify-center py-1" aria-hidden>
                  <div className="h-4 w-px bg-gradient-to-b from-zinc-600 to-zinc-800" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
