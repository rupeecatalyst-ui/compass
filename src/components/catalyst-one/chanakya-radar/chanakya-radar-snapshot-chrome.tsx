"use client";



/**

 * CO-ARCH-007 — Snapshot metadata + CHANAKYA philosophy on Radar landing.

 */



import { cn } from "@/lib/utils";

import {

  CHANAKYA_PHILOSOPHY_ATTRIBUTION,

  CHANAKYA_PHILOSOPHY_QUOTE,

} from "@/constants/chanakya-operating-model";

import type { CertifiedRadarSnapshotMeta } from "@/lib/chanakya-radar/load-certified-radar-snapshot";



export function ChanakyaRadarSnapshotChrome({

  meta,

  className,

}: {

  meta: CertifiedRadarSnapshotMeta;

  className?: string;

}) {

  const when = meta.asOf ? new Date(meta.asOf) : null;

  const next = meta.nextScheduledRefresh ? new Date(meta.nextScheduledRefresh) : null;

  const dateLabel = when

    ? when.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

    : "—";

  const timeLabel = when

    ? when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })

    : "—";

  const nextLabel = next

    ? `${next.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${next.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`

    : "—";



  return (

    <div className={cn("space-y-2", className)} data-testid="chanakya-radar-snapshot-chrome">

      <blockquote className="rounded-lg border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-transparent px-3 py-2.5">

        <p className="font-serif text-sm italic leading-snug text-amber-50/95 md:text-[15px]">

          “{CHANAKYA_PHILOSOPHY_QUOTE}”

        </p>

        <footer className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/80">

          — {CHANAKYA_PHILOSOPHY_ATTRIBUTION}

        </footer>

      </blockquote>



      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-3 py-2 text-[11px] text-zinc-300">

        <div className="space-y-0.5">

          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">

            Last Intelligence Refresh

          </p>

          <p className="text-zinc-100">

            {dateLabel} · {timeLabel}

            {meta.version ? ` · Version ${meta.version}` : ""}

          </p>

        </div>

        <div className="space-y-0.5 text-right">

          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">

            Next Scheduled Refresh

          </p>

          <p className="text-zinc-200">{nextLabel}</p>

        </div>

        <p className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-medium text-zinc-300">

          {meta.source === "awaiting_snapshot"

            ? "Snapshot pending — Administrator refresh required"

            : "View only · Administrator refresh"}

        </p>

      </div>

    </div>

  );

}


