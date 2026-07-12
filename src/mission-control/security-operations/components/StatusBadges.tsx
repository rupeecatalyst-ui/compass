"use client";

import { cn } from "../../shared/cn";
import type { SecurityHealthStatus, SecuritySeverity } from "../types";

const HEALTH: Record<SecurityHealthStatus, string> = {
  healthy: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  watch: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  elevated: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  unknown: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

export function SecurityHealthBadge({
  status,
  className,
}: {
  status: SecurityHealthStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        HEALTH[status],
        className,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

const SEVERITY: Record<SecuritySeverity, string> = {
  critical: "border-rose-500/40 text-rose-200",
  high: "border-orange-500/35 text-orange-200",
  medium: "border-amber-500/30 text-amber-200",
  low: "border-zinc-700 text-zinc-300",
  info: "border-zinc-800 text-zinc-400",
};

export function SecuritySeverityBadge({
  severity,
  className,
}: {
  severity: SecuritySeverity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-zinc-950 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        SEVERITY[severity],
        className,
      )}
    >
      {severity}
    </span>
  );
}
