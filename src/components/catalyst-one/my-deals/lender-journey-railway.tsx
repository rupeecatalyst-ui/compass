"use client";

/**
 * CO-C1-DEALS-JOURNEY-001 — Compact Gantt / railway track for lender Deal stages.
 * Axis SSOT: ENTERPRISE_JOURNEY_SEGMENTS (Hold / Lost are overlays).
 */

import {
  ENTERPRISE_JOURNEY_SEGMENTS,
  ENTERPRISE_JOURNEY_COLORS,
  deriveJourneyProgressSegments,
} from "@/constants/enterprise-deal-journey-progress";
import { cn } from "@/lib/utils";
import type { LenderCaseStage, PipelineStage } from "@/types/catalyst-one";

type Props = {
  pipelineStage?: PipelineStage | string | null;
  lenderCaseStage?: LenderCaseStage | string | null;
  status?: string | null;
  className?: string;
  /** Show axis labels above the track (use once per card header). */
  showAxisLabels?: boolean;
};

export function LenderJourneyRailway({
  pipelineStage,
  lenderCaseStage,
  status,
  className,
  showAxisLabels = false,
}: Props) {
  const progress = deriveJourneyProgressSegments({
    pipelineStage,
    lenderCaseStage,
    status,
  });
  const currentIndex = Math.max(0, progress.filled - 1);

  return (
    <div
      className={cn("min-w-[280px] flex-1", className)}
      role="img"
      aria-label={`Lender journey: ${progress.segmentLabel}${
        progress.overlay !== "none" ? ` · ${progress.overlay}` : ""
      }`}
    >
      {showAxisLabels ? (
        <div className="mb-1.5 grid grid-cols-6 gap-0.5">
          {ENTERPRISE_JOURNEY_SEGMENTS.map((seg) => (
            <span
              key={seg.id}
              className="truncate text-center text-[9px] font-medium uppercase tracking-wide text-zinc-500"
              title={seg.label}
            >
              {seg.label.replace("Logged In – WIP", "Logged In").replace("Pre-Login", "Prelogin")}
            </span>
          ))}
        </div>
      ) : null}
      <div className="relative flex items-center px-0.5">
        {ENTERPRISE_JOURNEY_SEGMENTS.map((seg, index) => {
          const completed = index < currentIndex;
          const current = index === currentIndex;
          const future = index > currentIndex;
          const connectorDone = index < currentIndex;
          const nodeColor =
            progress.overlay !== "none" && current
              ? progress.overlayColor || seg.color
              : completed || current
                ? seg.color
                : "#3f3f46";

          return (
            <div key={seg.id} className="flex min-w-0 flex-1 items-center">
              <div className="relative z-[1] flex shrink-0 items-center justify-center">
                {progress.overlay === "lost" && current ? (
                  <span
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] font-bold leading-none text-red-400 ring-2 ring-red-500/80"
                    style={{ backgroundColor: "rgba(127,29,29,0.85)" }}
                    title="Lost"
                  >
                    ✕
                  </span>
                ) : progress.overlay === "hold" && current ? (
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-2 ring-orange-400"
                    style={{ backgroundColor: ENTERPRISE_JOURNEY_COLORS.hold }}
                    title="Hold"
                  />
                ) : current ? (
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-2 ring-offset-1 ring-offset-zinc-950"
                    style={{
                      backgroundColor: nodeColor,
                      boxShadow: `0 0 0 2px ${nodeColor}55`,
                    }}
                    title={`Current: ${seg.label}`}
                  />
                ) : completed ? (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: nodeColor }}
                    title={seg.label}
                  />
                ) : (
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-zinc-600 bg-zinc-950"
                    title={seg.label}
                  />
                )}
              </div>
              {index < ENTERPRISE_JOURNEY_SEGMENTS.length - 1 ? (
                <div
                  className={cn(
                    "mx-0.5 h-[2px] min-w-[8px] flex-1 rounded-full",
                    future ? "bg-zinc-800" : "",
                  )}
                  style={
                    connectorDone || current
                      ? {
                          backgroundColor: completed
                            ? seg.color
                            : current
                              ? `${seg.color}99`
                              : undefined,
                        }
                      : undefined
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-1 truncate text-[10px] text-zinc-400">
        <span className="font-medium text-zinc-200">{progress.segmentLabel}</span>
        {progress.overlay === "hold" ? (
          <span className="ml-1.5 text-orange-400">· Hold</span>
        ) : null}
        {progress.overlay === "lost" ? (
          <span className="ml-1.5 text-red-400">· Lost</span>
        ) : null}
      </p>
    </div>
  );
}

export function LenderJourneyAxisHeader({ className }: { className?: string }) {
  return (
    <div className={cn("min-w-[280px] flex-1 px-0.5", className)}>
      <div className="grid grid-cols-6 gap-0.5">
        {ENTERPRISE_JOURNEY_SEGMENTS.map((seg) => (
          <span
            key={seg.id}
            className="truncate text-center text-[9px] font-semibold uppercase tracking-wide text-zinc-500"
            title={seg.label}
          >
            {seg.label
              .replace("Logged In – WIP", "Logged In")
              .replace("Pre-Login", "Prelogin")}
          </span>
        ))}
      </div>
    </div>
  );
}
