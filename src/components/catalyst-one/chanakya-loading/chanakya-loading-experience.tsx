"use client";

/**
 * CO-UX-008 — Enterprise CHANAKYA Loading Experience (canonical).
 * Replaces traditional spinners. Levels, priority messages, soft fade only.
 */

import { ChanakyaAvatar } from "@/components/catalyst-one/chanakya-enterprise-identity/chanakya-avatar";
import { useChanakyaLoadingSession } from "@/lib/chanakya-loading/use-chanakya-loading-session";
import { cn } from "@/lib/utils";
import type {
  ChanakyaLoadingDensity,
  ChanakyaLoadingLiveSignals,
  ChanakyaLoadingModule,
  ChanakyaLoadingSurface,
} from "@/types/chanakya-loading";

export interface ChanakyaLoadingExperienceProps {
  module?: ChanakyaLoadingModule;
  /** Optional secondary status / Level-2 preparing line. */
  statusLabel?: string;
  density?: ChanakyaLoadingDensity;
  surface?: ChanakyaLoadingSurface;
  fullScreen?: boolean;
  className?: string;
  /** Controlled loading — when false, shows completion then clears (EnterpriseLoadingSurface). */
  loading?: boolean;
  signals?: ChanakyaLoadingLiveSignals | null;
  useEbiSignals?: boolean;
  /** When loading ends and phase is done, notify parent to unmount overlay. */
  onComplete?: () => void;
}

export function ChanakyaLoadingExperience({
  module = "enterprise",
  statusLabel,
  density = "page",
  surface = "default",
  fullScreen = false,
  className,
  loading = true,
  signals,
  useEbiSignals = true,
  onComplete,
}: ChanakyaLoadingExperienceProps) {
  const session = useChanakyaLoadingSession({
    module,
    loading,
    signals,
    useEbiSignals,
    statusLabel,
  });

  if (session.phase === "done" && !loading) {
    if (onComplete) {
      queueMicrotask(() => onComplete());
    }
    return null;
  }

  // Level 1 — no loading screen
  if (!session.visible) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy={loading}
        data-sprint="CO-UX-008"
        data-chanakya-loading={module}
        data-loading-level={session.level}
        className={cn(
          "sr-only",
          density === "page" && !fullScreen && "min-h-[calc(100vh-4rem)]",
        )}
      >
        Preparing…
      </div>
    );
  }

  const isCommand = surface === "command";
  const isInline = density === "inline";
  const isPanel = density === "panel";
  const isComplete = session.phase === "complete";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={loading && !isComplete}
      data-sprint="CO-UX-008"
      data-chanakya-loading={module}
      data-loading-level={session.level}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        fullScreen && "fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-sm",
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
          "animate-in fade-in-0 duration-500",
          isCommand || fullScreen
            ? "border-zinc-800 bg-zinc-950/90 shadow-[0_0_40px_-12px_rgba(20,184,166,0.22)]"
            : "border-teal-500/25 bg-card/80 shadow-lg shadow-teal-950/10 dark:bg-zinc-950/70",
          isInline && "max-w-sm gap-3 rounded-xl px-4 py-5",
        )}
      >
        <div className="relative">
          <ChanakyaAvatar
            size={isInline ? "sm" : "md"}
            animate={!isComplete}
            priority
            className="ring-2 ring-teal-500/20 ring-offset-2 ring-offset-background dark:ring-offset-zinc-950"
          />
          {!isComplete ? (
            <span
              aria-hidden
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-teal-500/80",
                "animate-pulse",
              )}
            />
          ) : (
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[9px] font-bold text-white"
            >
              ✓
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.18em]",
              isCommand || fullScreen ? "text-teal-300/90" : "text-teal-700 dark:text-teal-300",
            )}
          >
            CHANAKYA
          </p>
          <p
            key={session.displayText}
            className={cn(
              "text-sm font-medium leading-relaxed animate-in fade-in-0 duration-500",
              isCommand || fullScreen ? "text-zinc-100" : "text-foreground",
              isInline ? "text-[13px]" : "sm:text-[15px]",
            )}
          >
            {session.displayText}
          </p>
        </div>

        {!isComplete && statusLabel && session.phase === "rotating" ? (
          <p
            className={cn(
              "text-[11px]",
              isCommand || fullScreen ? "text-zinc-500" : "text-muted-foreground",
            )}
          >
            {statusLabel}
          </p>
        ) : null}

        {!isComplete ? (
          <div aria-hidden className="flex w-full max-w-[12rem] items-center gap-1.5 pt-1">
            <span className="h-1 flex-1 animate-pulse rounded-full bg-teal-500/25" />
            <span className="h-1 flex-1 animate-pulse rounded-full bg-teal-500/40 [animation-delay:150ms]" />
            <span className="h-1 flex-1 animate-pulse rounded-full bg-teal-500/25 [animation-delay:300ms]" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
