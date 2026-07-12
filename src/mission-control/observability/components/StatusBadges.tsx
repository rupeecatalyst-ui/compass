"use client";

import { cn } from "../../shared/cn";
import type {
  JobStatus,
  ObservabilityHealth,
  ObservabilitySeverity,
  QueuePressure,
  ServiceRuntimeStatus,
} from "../types";

const HEALTH: Record<ObservabilityHealth, string> = {
  healthy: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  degraded: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  impaired: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  down: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  unknown: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

export function ObservabilityHealthBadge({
  status,
  className,
}: {
  status: ObservabilityHealth;
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
      {status}
    </span>
  );
}

const SEVERITY: Record<ObservabilitySeverity, string> = {
  critical: "border-rose-500/40 text-rose-200",
  high: "border-orange-500/35 text-orange-200",
  medium: "border-amber-500/30 text-amber-200",
  low: "border-zinc-700 text-zinc-300",
  info: "border-zinc-800 text-zinc-400",
};

export function ObservabilitySeverityBadge({
  severity,
  className,
}: {
  severity: ObservabilitySeverity;
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

const SERVICE: Record<ServiceRuntimeStatus, string> = {
  up: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  degraded: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  down: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  maintenance: "border-sky-500/35 bg-sky-500/10 text-sky-200",
  unknown: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

export function ServiceStatusBadge({
  status,
  className,
}: {
  status: ServiceRuntimeStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        SERVICE[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

const JOB: Record<JobStatus, string> = {
  running: "border-teal-500/35 text-teal-200",
  queued: "border-zinc-600 text-zinc-300",
  succeeded: "border-emerald-500/35 text-emerald-200",
  failed: "border-rose-500/40 text-rose-200",
  delayed: "border-amber-500/35 text-amber-200",
  unknown: "border-zinc-700 text-zinc-400",
};

export function JobStatusBadge({
  status,
  className,
}: {
  status: JobStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-zinc-950 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        JOB[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

const QUEUE: Record<QueuePressure, string> = {
  normal: "border-emerald-500/30 text-emerald-200",
  elevated: "border-amber-500/35 text-amber-200",
  saturated: "border-rose-500/40 text-rose-200",
  unknown: "border-zinc-700 text-zinc-400",
};

export function QueuePressureBadge({
  pressure,
  className,
}: {
  pressure: QueuePressure;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-zinc-950 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
        QUEUE[pressure],
        className,
      )}
    >
      {pressure}
    </span>
  );
}
