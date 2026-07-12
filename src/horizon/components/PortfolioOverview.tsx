"use client";

import { EnterpriseEngagementCard } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import type { Portfolio } from "../types";

export function PortfolioOverview({ portfolio }: { portfolio: Portfolio }) {
  const tiles = [
    { label: "Initiatives", value: portfolio.initiativeCount, tone: "cyan" as const },
    { label: "On track", value: portfolio.onTrackCount, tone: "emerald" as const },
    { label: "At risk", value: portfolio.atRiskCount, tone: "amber" as const },
    { label: "Blocked", value: portfolio.blockedCount, tone: "rose" as const },
  ];

  return (
    <section className="space-y-3" aria-label="Portfolio overview">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Portfolio Overview
            </p>
            <h2 className="mt-1 text-base font-semibold text-zinc-50">{portfolio.name}</h2>
            <p className="mt-1 max-w-2xl text-xs text-zinc-500">{portfolio.summary}</p>
          </div>
          <p className="tabular-nums text-[10px] uppercase tracking-wider text-zinc-600">
            As of · {new Date(portfolio.asOf).toLocaleString()}
          </p>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="list">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <EnterpriseEngagementCard
              title={tile.label}
              tone={tile.tone}
              meta="Portfolio signal"
              className="h-full dark:from-zinc-950 dark:to-zinc-900"
            >
              <p className="pl-2 text-2xl font-semibold tabular-nums text-zinc-50">{tile.value}</p>
            </EnterpriseEngagementCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
