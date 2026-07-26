"use client";

/**
 * CO-UX-024 — Enterprise CHANAKYA Loading Experience.
 * Replaces generic spinners with branded, contextual business insights.
 */

import { useEffect, useState } from "react";
import { ChanakyaAvatar } from "@/components/catalyst-one/chanakya-enterprise-identity/chanakya-avatar";
import { getChanakyaLoadingInsights } from "@/constants/chanakya-loading";
import { pickChanakyaLoadingInsight } from "@/lib/chanakya-loading";
import { cn } from "@/lib/utils";
import type {
  ChanakyaLoadingDensity,
  ChanakyaLoadingModule,
  ChanakyaLoadingSurface,
} from "@/types/chanakya-loading";

export interface ChanakyaLoadingExperienceProps {
  /** Module that owns the insight catalog. */
  module?: ChanakyaLoadingModule;
  /** Optional secondary status line (e.g. “Opening Deal Workspace…”). */
  statusLabel?: string;
  density?: ChanakyaLoadingDensity;
  surface?: ChanakyaLoadingSurface;
  fullScreen?: boolean;
  className?: string;
}

export function ChanakyaLoadingExperience({
  module = "enterprise",
  statusLabel,
  density = "page",
  surface = "default",
  fullScreen = false,
  className,
}: ChanakyaLoadingExperienceProps) {
  const catalog = getChanakyaLoadingInsights(module);
  const [insight, setInsight] = useState(catalog[0] ?? "");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const next = pickChanakyaLoadingInsight(module);
    setInsight(next);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [module]);

  const isCommand = surface === "command";
  const isInline = density === "inline";
  const isPanel = density === "panel";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-sprint="CO-UX-024"
      data-chanakya-loading={module}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        fullScreen && "fixed inset-0 z-50 bg-background/85 backdrop-blur-sm",
        density === "page" && !fullScreen && "min-h-[calc(100vh-4rem)] w-full px-4 py-10",
        isPanel && "min-h-[40vh] w-full px-4 py-8",
        isInline && "min-h-[8rem] w-full px-3 py-6",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex max-w-md flex-col items-center gap-4",
          "rounded-2xl border px-6 py-7 sm:px-8 sm:py-8",
          "transition-opacity duration-500 ease-out",
          visible ? "opacity-100" : "opacity-0",
          isCommand
            ? "border-zinc-800 bg-zinc-950/80 shadow-[0_0_40px_-12px_rgba(20,184,166,0.25)]"
            : "border-teal-500/25 bg-card/80 shadow-lg shadow-teal-950/10 dark:bg-zinc-950/70 dark:shadow-teal-500/5",
          isInline && "max-w-sm gap-3 rounded-xl px-4 py-5",
        )}
      >
        <div className="relative">
          <ChanakyaAvatar
            size={isInline ? "sm" : "md"}
            animate
            priority
            className="ring-2 ring-teal-500/20 ring-offset-2 ring-offset-background dark:ring-offset-zinc-950"
          />
          <span
            aria-hidden
            className={cn(
              "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-t-transparent animate-spin",
              isCommand ? "border-teal-400" : "border-teal-600 dark:border-teal-400",
            )}
          />
        </div>

        <div className="space-y-1.5">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.18em]",
              isCommand ? "text-teal-300/90" : "text-teal-700 dark:text-teal-300",
            )}
          >
            CHANAKYA Insight
          </p>
          <p
            key={insight}
            className={cn(
              "text-sm font-medium leading-relaxed animate-in fade-in-0 duration-500",
              isCommand ? "text-zinc-100" : "text-foreground",
              isInline ? "text-[13px]" : "sm:text-[15px]",
            )}
          >
            {insight}
          </p>
        </div>

        {statusLabel ? (
          <p
            className={cn(
              "text-[11px]",
              isCommand ? "text-zinc-500" : "text-muted-foreground",
            )}
          >
            {statusLabel}
          </p>
        ) : null}

        <div
          aria-hidden
          className="flex w-full max-w-[12rem] items-center gap-1.5 pt-1"
        >
          <span className="h-1 flex-1 animate-pulse rounded-full bg-teal-500/25" />
          <span className="h-1 flex-1 animate-pulse rounded-full bg-teal-500/40 [animation-delay:150ms]" />
          <span className="h-1 flex-1 animate-pulse rounded-full bg-teal-500/25 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
