"use client";

/**
 * CO-ARCH-005 / CO-MC-002 — Mission Control Snapshot metadata (always visible).
 */

import { cn } from "@/lib/utils";

export function MissionControlSnapshotBanner({
  asOf,
  version,
  source,
  className,
}: {
  asOf?: string | null;
  version?: string | null;
  source?: "certified_snapshot" | "awaiting_snapshot" | null;
  className?: string;
}) {
  const when = asOf ? new Date(asOf) : null;
  const dateLabel = when
    ? when.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
  const timeLabel = when
    ? when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-50",
        className,
      )}
      data-testid="mc-snapshot-banner"
    >
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">
          Mission Control Snapshot · CO-MC-002
        </p>
        <p className="text-zinc-100">
          Last Updated · {dateLabel} · {timeLabel}
          {version ? ` · Version ${version}` : ""}
        </p>
        <p className="text-[10px] text-amber-100/70">
          Analytics Refresh · Daily 02:00 AM (Asia/Kolkata) · Read-only precomputed datasets
        </p>
      </div>
      <p className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-medium text-zinc-200">
        {source === "awaiting_snapshot"
          ? "Snapshot pending — Administrator refresh required"
          : "View only · Administrator refresh"}
      </p>
    </div>
  );
}
