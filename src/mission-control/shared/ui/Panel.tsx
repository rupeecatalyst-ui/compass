"use client";

import type { ReactNode } from "react";
import { cn } from "../cn";
import { MC_PANEL, MC_PANEL_COMPACT } from "./patterns";

/**
 * Standard Mission Control panel surface.
 */
export function Panel({
  children,
  className,
  compact,
  labelledBy,
  label,
}: {
  children: ReactNode;
  className?: string;
  compact?: boolean;
  labelledBy?: string;
  label?: string;
}) {
  return (
    <section
      className={cn(compact ? MC_PANEL_COMPACT : MC_PANEL, className)}
      aria-labelledby={labelledBy}
      aria-label={label}
    >
      {children}
    </section>
  );
}
