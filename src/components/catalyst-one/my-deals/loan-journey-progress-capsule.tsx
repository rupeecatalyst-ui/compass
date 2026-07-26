"use client";

/**
 * CO-UX-003 — Catalyst One Loan Journey Progress Capsule.
 * Segmented journey indicator derived from stage SSOT — never manually maintained.
 */

import {
  ENTERPRISE_JOURNEY_SEGMENTS,
  deriveJourneyProgressSegments,
} from "@/constants/enterprise-deal-journey-progress";
import { cn } from "@/lib/utils";
import type { LenderCaseStage, PipelineStage } from "@/types/catalyst-one";

interface LoanJourneyProgressCapsuleProps {
  pipelineStage?: PipelineStage | string | null;
  lenderCaseStage?: LenderCaseStage | string | null;
  status?: string | null;
  className?: string;
  /** Compact ~56px width for dense lender rows. */
  size?: "sm" | "md";
}

export function LoanJourneyProgressCapsule({
  pipelineStage,
  lenderCaseStage,
  status,
  className,
  size = "sm",
}: LoanJourneyProgressCapsuleProps) {
  const progress = deriveJourneyProgressSegments({
    pipelineStage,
    lenderCaseStage,
    status,
  });

  const width = size === "sm" ? "w-[56px]" : "w-[72px]";
  const title = [
    progress.segmentLabel,
    progress.overlay !== "none"
      ? `· ${progress.overlay === "hold" ? "Hold" : "Lost"}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cn("inline-flex flex-col items-start gap-0.5", className)}
      title={title}
      role="img"
      aria-label={`Journey progress: ${title}`}
    >
      <div
        className={cn(
          "flex h-[7px] items-stretch gap-px overflow-hidden rounded-full bg-zinc-800/80 ring-1 ring-zinc-700/80",
          width,
        )}
      >
        {ENTERPRISE_JOURNEY_SEGMENTS.map((seg, index) => {
          const filled = index < progress.filled;
          const isTip = index === progress.filled - 1;
          return (
            <span
              key={seg.id}
              className="min-w-0 flex-1 first:rounded-l-full last:rounded-r-full"
              style={{
                backgroundColor: filled
                  ? isTip && progress.overlayColor
                    ? progress.overlayColor
                    : seg.color
                  : "transparent",
                opacity: filled ? 1 : 0.25,
              }}
            />
          );
        })}
      </div>
      {progress.overlay !== "none" ? (
        <span
          className="text-[8px] font-semibold uppercase leading-none tracking-wide"
          style={{ color: progress.overlayColor ?? undefined }}
        >
          {progress.overlay === "hold" ? "Hold" : "Lost"}
        </span>
      ) : null}
    </div>
  );
}
