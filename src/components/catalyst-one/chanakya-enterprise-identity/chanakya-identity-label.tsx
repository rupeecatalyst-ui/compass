"use client";

import { formatChanakyaEyebrow } from "@/lib/chanakya-enterprise-identity";
import type { ChanakyaPresentationSurface } from "@/types/chanakya-enterprise-identity";
import { cn } from "@/lib/utils";

export interface ChanakyaIdentityLabelProps {
  surface?: ChanakyaPresentationSurface;
  className?: string;
}

/** Presentation-layer identity eyebrow for CHANAKYA surfaces. */
export function ChanakyaIdentityLabel({ surface, className }: ChanakyaIdentityLabelProps) {
  return (
    <p
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300",
        className,
      )}
    >
      {formatChanakyaEyebrow(surface)}
    </p>
  );
}
