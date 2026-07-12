"use client";

import Link from "next/link";
import { EnterpriseEngagementCard } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import type { EngineHealthItem } from "../types";
import { ObservabilityHealthBadge, ObservabilitySeverityBadge } from "./StatusBadges";

export function EngineHealthGrid({ engines }: { engines: readonly EngineHealthItem[] }) {
  return (
    <section aria-labelledby="obs-engines-heading">
      <div className="mb-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Engine Health
        </p>
        <h2 id="obs-engines-heading" className="mt-1 text-sm font-semibold text-zinc-50">
          Catalyst One engines
        </h2>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3" role="list">
        {engines.map((engine) => (
          <li key={engine.id}>
            <EnterpriseEngagementCard
              title={engine.name}
              description={engine.summary}
              tone={
                engine.status === "down" || engine.status === "impaired"
                  ? "rose"
                  : engine.status === "degraded"
                    ? "amber"
                    : "cyan"
              }
              badge={engine.latencyLabel}
              meta="Engine"
              className="h-full dark:from-zinc-950 dark:to-zinc-900"
            >
              <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-2">
                <ObservabilityHealthBadge status={engine.status} />
                <ObservabilitySeverityBadge severity={engine.severity} />
                {engine.viewDetailsAction.href ? (
                  <Link
                    href={engine.viewDetailsAction.href}
                    className="text-[10px] text-teal-300/90 hover:text-teal-200"
                  >
                    {engine.viewDetailsAction.label}
                  </Link>
                ) : null}
              </div>
            </EnterpriseEngagementCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
