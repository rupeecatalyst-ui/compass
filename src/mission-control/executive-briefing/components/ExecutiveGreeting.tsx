"use client";

import type { ExecutiveGreeting } from "../types";
import { EnterpriseHealthBadge } from "./EnterpriseHealthBadge";
import { MissionControlBadge } from "./MissionControlBadge";

export function ExecutiveGreeting({ greeting }: { greeting: ExecutiveGreeting }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MissionControlBadge />
            <EnterpriseHealthBadge health={greeting.health} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
            {greeting.salutation}, {greeting.userDisplayName}
          </h1>
          <p className="text-sm text-zinc-400">
            {greeting.dateLabel}
            <span className="mx-2 text-zinc-600">·</span>
            <span className="tabular-nums text-zinc-300">{greeting.timeLabel}</span>
          </p>
        </div>
        <div className="rounded-xl border border-teal-500/25 bg-teal-500/10 px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-teal-300/90">
            Presented by
          </p>
          <p className="text-sm font-semibold text-teal-50">CHANAKYA</p>
        </div>
      </div>
    </section>
  );
}
