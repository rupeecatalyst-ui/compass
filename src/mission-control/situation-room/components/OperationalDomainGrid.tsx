"use client";

import type { OperationalDomain } from "../types";
import { OperationalDomainCard } from "./OperationalDomainCard";

export function OperationalDomainGrid({
  domains,
  embedded = false,
}: {
  domains: OperationalDomain[];
  embedded?: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby={embedded ? undefined : "sr-domains-heading"}>
      {!embedded && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Operational Domains
          </p>
          <h2 id="sr-domains-heading" className="mt-1 text-lg font-semibold text-zinc-50">
            Domain awareness grid
          </h2>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {domains.map((domain) => (
          <OperationalDomainCard key={domain.id} domain={domain} />
        ))}
      </div>
    </section>
  );
}
