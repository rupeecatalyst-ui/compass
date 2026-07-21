"use client";

import { FlaskConical } from "lucide-react";
import {
  DEMO_SEED_DEVELOPMENT_ONLY_LABEL,
  isDemoSeedEnabled,
} from "@/lib/demo-seed";
import { cn } from "@/lib/utils";

interface DevelopmentOnlyDemoBannerProps {
  className?: string;
}

/**
 * Visible only when demo business seeds are enabled (local `next dev`).
 * Never rendered in Pilot or Production builds.
 */
export function DevelopmentOnlyDemoBanner({ className }: DevelopmentOnlyDemoBannerProps) {
  if (!isDemoSeedEnabled()) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 border-b border-amber-300/80 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100",
        className,
      )}
    >
      <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{DEMO_SEED_DEVELOPMENT_ONLY_LABEL}</span>
      <span className="font-normal text-amber-800/90 dark:text-amber-200/80">
        — In-memory demo records only. Not included in Pilot or Production deployments.
      </span>
    </div>
  );
}
