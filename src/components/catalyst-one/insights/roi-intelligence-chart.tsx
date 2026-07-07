"use client";

import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format-currency";
import {
  type LenderRoiProfile,
  type ProductRoiScale,
  roiToPercent,
} from "@/lib/insights/lender-intelligence";

function RoiMarker({
  value,
  kind,
  left,
}: {
  value: number;
  kind: "policy" | "offered" | "negotiated";
  left: number;
}) {
  const styles = {
    policy: "h-3 w-3 rotate-45 border-2 border-slate-500 bg-slate-100 dark:bg-slate-800",
    offered: "h-2.5 w-2.5 rounded-full border-2 border-blue-600 bg-blue-500/30",
    negotiated: "h-0 w-0 border-x-[5px] border-b-[8px] border-x-transparent border-b-emerald-600",
  };

  const labels = {
    policy: "Policy ROI",
    offered: "Offered ROI",
    negotiated: "Negotiated ROI",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${left}%` }}
        >
          <div className={cn(styles[kind], "shadow-sm")} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[11px]">
        {labels[kind]}: {value.toFixed(2)}%
      </TooltipContent>
    </Tooltip>
  );
}

function RankBadge({ rank }: { rank: 1 | 2 | 3 }) {
  const label = rank === 1 ? "Best" : rank === 2 ? "2nd Best" : "3rd Best";
  const cls =
    rank === 1
      ? "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-200"
      : rank === 2
        ? "bg-slate-500/10 text-slate-700 border-slate-500/25 dark:text-slate-200"
        : "bg-orange-500/10 text-orange-800 border-orange-500/25 dark:text-orange-200";

  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", cls)}>
      {label}
    </span>
  );
}

function RoiRow({
  profile,
  scale,
}: {
  profile: LenderRoiProfile;
  scale: ProductRoiScale;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5",
        profile.isPrimary && "ring-1 ring-amber-400/35",
      )}
    >
      <div className="flex w-[148px] shrink-0 items-center gap-2">
        <LenderLogo lender={profile.lender} size="md" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{profile.lender}</p>
          {profile.rank && <RankBadge rank={profile.rank} />}
        </div>
      </div>

      <div className="relative h-10 min-w-[320px] flex-1">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-muted/40">
          {scale.bands.map((band) => {
            const left = roiToPercent(band.min, scale);
            const width = roiToPercent(band.max, scale) - left;
            return (
              <div
                key={band.id}
                className={cn("absolute inset-y-0 border-r border-background/20", band.className)}
                style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
              />
            );
          })}
        </div>

        <RoiMarker value={profile.policyRoi} kind="policy" left={roiToPercent(profile.policyRoi, scale)} />
        <RoiMarker value={profile.offeredRoi} kind="offered" left={roiToPercent(profile.offeredRoi, scale)} />
        <RoiMarker
          value={profile.negotiatedRoi}
          kind="negotiated"
          left={roiToPercent(profile.negotiatedRoi, scale)}
        />
      </div>

      <div className="hidden w-16 shrink-0 text-right sm:block">
        <p className="text-[10px] text-muted-foreground">Neg.</p>
        <p className="text-xs font-semibold tabular-nums">{profile.negotiatedRoi.toFixed(2)}%</p>
      </div>
    </div>
  );
}

export function RoiIntelligenceChart({
  scale,
  profiles,
  savings,
}: {
  scale: ProductRoiScale;
  profiles: LenderRoiProfile[];
  savings: ReturnType<typeof import("@/lib/insights/lender-intelligence").computeInterestSavings>;
}) {
  return (
    <TooltipProvider delayDuration={200}>
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">ROI Intelligence</h3>
          <p className="text-[11px] text-muted-foreground">
            {scale.productName} · {scale.policyName}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 border-2 border-slate-500 bg-slate-100" />
            Policy ROI
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border-2 border-blue-600 bg-blue-500/30" />
            Offered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-emerald-600" />
            Negotiated
          </span>
        </div>
      </div>

      {savings && savings.amount > 0 && (
        <div className="rounded-lg border border-emerald-600/25 bg-gradient-to-r from-emerald-500/8 to-transparent px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
            Potential Interest Saving
          </p>
          <p className="mt-1 text-sm text-foreground">
            Choosing <span className="font-semibold">{savings.bestLender}</span> instead of{" "}
            <span className="font-semibold">{savings.compareLender}</span> saves{" "}
            <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
              {formatINR(savings.amount)}
            </span>{" "}
            over {Math.round(savings.tenureMonths / 12)} years.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-gradient-to-b from-muted/15 to-background p-3 shadow-sm">
        <div className="mb-2 flex min-w-[560px] gap-3 pl-[148px]">
          <div className="relative flex-1">
            {scale.ticks.map((tick) => (
              <span
                key={tick}
                className="absolute -translate-x-1/2 text-[9px] tabular-nums text-muted-foreground"
                style={{ left: `${roiToPercent(tick, scale)}%` }}
              >
                {tick.toFixed(2)}%
              </span>
            ))}
          </div>
          <div className="hidden w-16 sm:block" />
        </div>

        <div className="mb-3 flex min-w-[560px] gap-3">
          <div className="w-[148px] shrink-0" />
          <div className="relative h-4 flex-1">
            {scale.bands.map((band) => {
              const left = roiToPercent(band.min, scale);
              const width = roiToPercent(band.max, scale) - left;
              return (
                <div
                  key={band.id}
                  className="absolute top-0 flex h-full items-center justify-center"
                  style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                >
                  <span className="truncate px-0.5 text-[8px] font-medium uppercase tracking-wide text-muted-foreground/80">
                    {band.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          {profiles.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active lender cases for ROI comparison.
            </p>
          ) : (
            profiles.map((p) => <RoiRow key={p.lenderCaseId} profile={p} scale={scale} />)
          )}
        </div>
      </div>
    </section>
    </TooltipProvider>
  );
}
