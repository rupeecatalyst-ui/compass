"use client";

import { cn } from "../../shared/cn";
import type { SituationHealthStatus, SituationSeverity } from "../types";

const HEALTH_STYLES: Record<SituationHealthStatus, string> = {
  healthy: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  unknown: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

export function HealthStatusBadge({
  status,
  className,
}: {
  status: SituationHealthStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        HEALTH_STYLES[status],
        className,
      )}
      aria-label={`Status ${status}`}
    >
      {status}
    </span>
  );
}

const SEVERITY_STYLES: Record<SituationSeverity, string> = {
  critical: "border-zinc-500 text-rose-200",
  high: "border-zinc-600 text-orange-200/90",
  medium: "border-zinc-700 text-amber-200/80",
  low: "border-zinc-700 text-zinc-300",
  info: "border-zinc-800 text-zinc-400",
};

export function SituationSeverityBadge({
  severity,
  className,
}: {
  severity: SituationSeverity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-zinc-950 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        SEVERITY_STYLES[severity],
        className,
      )}
      aria-label={`Severity ${severity}`}
    >
      {severity}
    </span>
  );
}
