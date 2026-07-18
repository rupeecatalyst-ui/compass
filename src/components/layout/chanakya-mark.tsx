"use client";

import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Permanent CHANAKYA identity mark — intelligence / energy / strategic guidance.
 * Status colours are UI foundation only (no notification logic yet).
 */
export type ChanakyaMarkStatus = "normal" | "insights" | "attention";

const STATUS_SURFACE: Record<ChanakyaMarkStatus, string> = {
  /** Green — Normal */
  normal:
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  /** Amber — New Insights Available */
  insights:
    "border-amber-500/45 bg-amber-500/15 text-amber-800 dark:text-amber-200",
  /** Red — Immediate Attention Required */
  attention:
    "border-rose-500/45 bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const SIZE_MAP = {
  xs: { wrap: "h-5 w-5", icon: "h-3 w-3" },
  sm: { wrap: "h-6 w-6", icon: "h-3.5 w-3.5" },
  md: { wrap: "h-7 w-7", icon: "h-4 w-4" },
  lg: { wrap: "h-9 w-9", icon: "h-5 w-5" },
} as const;

export function ChanakyaMark({
  status = "normal",
  size = "sm",
  className,
  title,
}: {
  status?: ChanakyaMarkStatus;
  size?: keyof typeof SIZE_MAP;
  className?: string;
  title?: string;
}) {
  const dims = SIZE_MAP[size];
  const statusTitle =
    title ??
    (status === "insights"
      ? "CHANAKYA — new insights available"
      : status === "attention"
        ? "CHANAKYA — immediate attention required"
        : "CHANAKYA — normal");

  return (
    <span
      role="img"
      aria-label={statusTitle}
      title={statusTitle}
      data-chanakya-status={status}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border shadow-sm",
        dims.wrap,
        STATUS_SURFACE[status],
        className,
      )}
    >
      <BrainCircuit className={dims.icon} aria-hidden strokeWidth={2.25} />
    </span>
  );
}
