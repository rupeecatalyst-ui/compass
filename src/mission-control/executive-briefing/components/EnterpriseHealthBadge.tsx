"use client";

import { cn } from "../../shared/cn";
import type { EnterpriseHealth } from "../types";

const HEALTH_STYLES: Record<EnterpriseHealth["status"], string> = {
  normal: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  attention: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  elevated: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  unknown: "border-zinc-600 bg-zinc-800 text-zinc-300",
};

export function EnterpriseHealthBadge({
  health,
  className,
}: {
  health: EnterpriseHealth;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        HEALTH_STYLES[health.status],
        className,
      )}
      title={health.observedAt ? `Observed ${health.observedAt}` : undefined}
    >
      Enterprise Health · {health.label}
    </span>
  );
}
