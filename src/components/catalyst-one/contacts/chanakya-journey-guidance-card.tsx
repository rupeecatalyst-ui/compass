"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { getChanakyaBusinessJourneyGuidanceCopy } from "@/constants/enterprise-contact-master";
import { cn } from "@/lib/utils";

export type ChanakyaJourneyGuidanceMode = "guide" | "ready" | "open";

export interface ChanakyaJourneyGuidanceCardProps {
  mode: ChanakyaJourneyGuidanceMode;
  userFirstName: string;
  roleLabel: string;
  completionPct: number;
  /** Primary journey button label (ready / open). */
  journeyLabel: string;
  completeProfileLabel?: string;
  onCompleteProfile?: () => void;
  onStartOrOpenJourney?: () => void;
  className?: string;
}

/**
 * CF-CHANAKYA-004 — Compact Business Journey guidance card.
 * Always enabled — guides next step, never blocks.
 */
export function ChanakyaJourneyGuidanceCard({
  mode,
  userFirstName,
  roleLabel,
  completionPct,
  journeyLabel,
  completeProfileLabel,
  onCompleteProfile,
  onStartOrOpenJourney,
  className,
}: ChanakyaJourneyGuidanceCardProps) {
  const profileCta = completeProfileLabel ?? `Complete ${roleLabel} Profile`;
  const copy = getChanakyaBusinessJourneyGuidanceCopy({
    firstName: userFirstName,
    roleLabel,
    journeyLabel,
    mode,
  });
  const pct = Math.min(100, Math.max(0, completionPct));

  return (
    <div
      className={cn(
        "w-full min-w-[240px] max-w-[300px] rounded-lg border border-violet-500/25 bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-950/40 p-3 text-left shadow-sm",
        className,
      )}
    >
      <div className="flex gap-2.5">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-violet-400/30">
          <Image
            src="/images/chanakya-portrait.png"
            alt="CHANAKYA"
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-300/90">
            CHANAKYA
          </p>
          <p className="text-[12px] font-semibold leading-snug text-zinc-50">{copy.headline}</p>
          <p className="text-[11px] leading-snug text-zinc-300">{copy.body}</p>
          {copy.subline && (
            <p className="text-[11px] font-medium leading-snug text-violet-200/90">{copy.subline}</p>
          )}

          {mode === "guide" && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-400">
                <span>{copy.progressLabel ?? "Progress"}</span>
                <span className="tabular-nums font-medium text-violet-200">{pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="mt-1 h-8 w-full rounded-md bg-violet-600 px-2 text-[11px] font-medium hover:bg-violet-500"
                onClick={onCompleteProfile}
              >
                {profileCta}
              </Button>
            </div>
          )}

          {mode === "ready" && (
            <Button
              type="button"
              size="sm"
              className="mt-1 h-8 w-full rounded-md bg-teal-600 px-2 text-[11px] font-medium hover:bg-teal-500"
              onClick={onStartOrOpenJourney}
            >
              {journeyLabel}
            </Button>
          )}

          {mode === "open" && (
            <Button
              type="button"
              size="sm"
              className="mt-1 h-8 w-full rounded-md bg-sky-600 px-2 text-[11px] font-medium hover:bg-sky-500"
              onClick={onStartOrOpenJourney}
            >
              {journeyLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
