"use client";

import { cn } from "@/lib/utils";
import { OwGlassPanel, OwSectionLabel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

const NEEDLE_ROTATION: Record<string, string> = {
  north: "-rotate-45",
  centre: "rotate-0",
  south: "rotate-45",
};

const NEEDLE_COLOUR: Record<string, string> = {
  green: "bg-emerald-400",
  blue: "bg-teal-400",
  red: "bg-rose-400",
};

const STATUS_LABEL: Record<string, string> = {
  excellent: "Excellent trajectory",
  normal: "Stable trajectory",
  needs_attention: "Needs attention",
};

export function WorkspaceCompassCentrepiece() {
  const { intelligence } = useOpportunityWorkspace();

  const needle = intelligence?.compass.needle ?? "centre";
  const colour = intelligence?.compass.colour ?? "blue";
  const healthScore = intelligence?.health.score ?? 0;
  const pulseLabel = intelligence?.health.pulseLabel ?? "low";
  const pulseIntensity = intelligence?.health.pulseIntensity ?? 0;
  const signal = intelligence?.compass.signal ?? "normal";
  const successProbability = Math.max(5, Math.min(98, Math.round(healthScore * 0.92)));

  return (
    <OwGlassPanel className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.12),transparent_60%)]" />
      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="flex flex-col items-center justify-center py-2">
          <OwSectionLabel>Opportunity Compass</OwSectionLabel>
          <div className="relative mt-4 flex h-44 w-44 items-center justify-center md:h-52 md:w-52">
            <div className="absolute inset-0 rounded-full border border-dashed border-teal-500/30" />
            <div className="absolute inset-3 rounded-full border border-white/10 bg-zinc-950/40" />
            <span className="absolute top-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
              N
            </span>
            <span className="absolute bottom-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400">
              S
            </span>
            <div
              className={cn(
                "absolute left-1/2 top-1/2 h-2 w-20 origin-left rounded-full shadow-lg transition-transform duration-700 ease-out md:w-24",
                NEEDLE_COLOUR[colour],
                NEEDLE_ROTATION[needle],
              )}
              style={{ transformOrigin: "0% 50%", marginLeft: 0 }}
            />
            <div className="absolute h-3.5 w-3.5 rounded-full bg-foreground shadow" />
            <div
              className={cn(
                "absolute inset-8 rounded-full opacity-25 transition-transform duration-700",
                colour === "green" && "bg-emerald-400",
                colour === "blue" && "bg-teal-400",
                colour === "red" && "bg-rose-400",
              )}
              style={{ transform: `scale(${0.55 + pulseIntensity * 0.55})` }}
            />
          </div>
          <p className="mt-3 text-xs capitalize text-muted-foreground">
            Needle {needle} · Pulse {pulseLabel}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Health Score</p>
            <p className="text-5xl font-semibold tabular-nums tracking-tight text-foreground">
              {healthScore}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Compass Status" value={STATUS_LABEL[signal] ?? signal} />
            <Metric label="Success Probability" value={`${successProbability}%`} />
            <Metric label="Pulse Indicator" value={pulseLabel} className="capitalize" />
            <Metric label="Signal" value={intelligence?.compass.rationale ?? "—"} />
          </div>
        </div>
      </div>
    </OwGlassPanel>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/60 p-3 dark:border-white/10 dark:bg-zinc-950/40">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-medium leading-snug text-foreground", className)}>{value}</p>
    </div>
  );
}
