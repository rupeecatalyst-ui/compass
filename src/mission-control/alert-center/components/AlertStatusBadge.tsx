"use client";

import { cn } from "../../shared/cn";
import type { AlertStatus } from "../types";

const STYLES: Record<AlertStatus, string> = {
  open: "border-amber-500/35 text-amber-200",
  acknowledged: "border-sky-500/35 text-sky-200",
  investigating: "border-orange-500/35 text-orange-200",
  resolved: "border-emerald-500/35 text-emerald-200",
  dismissed: "border-zinc-700 text-zinc-400",
};

export function AlertStatusBadge({
  status,
  className,
}: {
  status: AlertStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-zinc-950 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        STYLES[status],
        className,
      )}
      aria-label={`Status ${status}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
