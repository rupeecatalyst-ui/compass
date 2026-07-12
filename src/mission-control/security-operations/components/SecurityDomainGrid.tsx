"use client";

import { EnterpriseEngagementCard } from "@/components/catalyst-one/shared/enterprise-engagement-card";
import type { SecurityDomain } from "../types";
import { SecurityHealthBadge, SecuritySeverityBadge } from "./StatusBadges";

export function SecurityDomainGrid({ domains }: { domains: readonly SecurityDomain[] }) {
  return (
    <section aria-labelledby="soc-domains-heading">
      <div className="mb-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Security Domains
        </p>
        <h2 id="soc-domains-heading" className="mt-1 text-sm font-semibold text-zinc-50">
          Identity through threat detection
        </h2>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5" role="list">
        {domains.map((domain) => (
          <li key={domain.id}>
            <EnterpriseEngagementCard
              title={domain.title}
              description={domain.summary}
              tone={
                domain.status === "critical" || domain.status === "elevated"
                  ? "rose"
                  : domain.status === "watch"
                    ? "amber"
                    : "slate"
              }
              badge={domain.signalLabel}
              meta={domain.id.replace("_", " ")}
              className="h-full dark:from-zinc-950 dark:to-zinc-900"
            >
              <div className="mt-2 flex flex-wrap gap-1.5 pl-2">
                <SecurityHealthBadge status={domain.status} />
                <SecuritySeverityBadge severity={domain.severity} />
              </div>
            </EnterpriseEngagementCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
