"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { selectChanakyaGreeting } from "@/lib/chanakya-greeting-engine";
import { cn } from "@/lib/utils";
import type { ChanakyaGreetingContext } from "@/types/chanakya-greeting";

export type ChanakyaJourneyGuidanceMode = "guide" | "ready" | "open";

export interface ChanakyaJourneyGuidanceCardProps {
  mode: ChanakyaJourneyGuidanceMode;
  userFirstName: string;
  roleLabel: string;
  completionPct: number;
  /** Short business explanation (guide mode). */
  explanation?: string;
  /** Primary journey button label (ready / open). */
  journeyLabel: string;
  completeProfileLabel?: string;
  onCompleteProfile?: () => void;
  onStartOrOpenJourney?: () => void;
  className?: string;
  /** Optional surface key for sticky greeting (defaults to role+mode). */
  surfaceKey?: string;
}

function contextForMode(mode: ChanakyaJourneyGuidanceMode): ChanakyaGreetingContext {
  if (mode === "guide") return "guidance";
  if (mode === "ready") return "completion";
  return "resume";
}

/**
 * CF-CON-041 / CF-CHANAKYA-002 — Compact CHANAKYA guidance for Role Dashboard.
 * Personalized greeting from the Greeting Library.
 */
export function ChanakyaJourneyGuidanceCard({
  mode,
  userFirstName,
  roleLabel,
  completionPct,
  explanation,
  journeyLabel,
  completeProfileLabel,
  onCompleteProfile,
  onStartOrOpenJourney,
  className,
  surfaceKey,
}: ChanakyaJourneyGuidanceCardProps) {
  const profileCta = completeProfileLabel ?? `Complete ${roleLabel} Profile`;
  const greeting = useMemo(
    () =>
      selectChanakyaGreeting({
        firstName: userFirstName,
        context: contextForMode(mode),
        surfaceKey: surfaceKey ?? `journey-card:${roleLabel}:${mode}`,
      }),
    [userFirstName, mode, roleLabel, surfaceKey],
  );

  return (
    <div
      className={cn(
        "w-full min-w-[220px] max-w-[280px] rounded-lg border border-violet-500/25 bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-950/40 p-2.5 text-left shadow-sm",
        className,
      )}
    >
      <div className="flex gap-2">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-violet-400/30">
          <Image
            src="/images/chanakya-portrait.png"
            alt="CHANAKYA"
            fill
            className="object-cover"
            sizes="36px"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-300/90">
            CHANAKYA
          </p>
          <p className="text-[11px] font-medium leading-snug text-zinc-100">{greeting.text}</p>
          {mode === "guide" && (
            <>
              <p className="text-[10px] leading-snug text-zinc-400">
                {explanation ??
                  `Your ${roleLabel} journey is ${completionPct}% ready. A few profile details unlock the next business step.`}
              </p>
              <div className="pt-0.5">
                <div className="mb-1 h-1 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${Math.min(100, Math.max(0, completionPct))}%` }}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 w-full rounded-md bg-violet-600 px-2 text-[11px] hover:bg-violet-500"
                  onClick={onCompleteProfile}
                >
                  {profileCta}
                </Button>
              </div>
            </>
          )}
          {mode === "ready" && (
            <>
              <p className="text-[10px] leading-snug text-zinc-300">
                Your {roleLabel} Profile is complete.
                <br />
                You can now begin the {journeyLabel.replace(/^Start\s+/i, "")}.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-0.5 h-7 w-full rounded-md bg-teal-600 px-2 text-[11px] hover:bg-teal-500"
                onClick={onStartOrOpenJourney}
              >
                {journeyLabel}
              </Button>
            </>
          )}
          {mode === "open" && (
            <>
              <p className="text-[10px] leading-snug text-zinc-400">
                Continue in the active {roleLabel} workspace — no need to start again.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-0.5 h-7 w-full rounded-md bg-sky-600 px-2 text-[11px] hover:bg-sky-500"
                onClick={onStartOrOpenJourney}
              >
                {journeyLabel}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
