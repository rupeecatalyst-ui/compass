"use client";

import type { IdentityOverviewModel } from "../types";

export function IdentityOverview({ identity }: { identity: IdentityOverviewModel }) {
  const tiles = [
    { label: "Active principals", value: identity.activePrincipalsLabel },
    { label: "Privileged accounts", value: identity.privilegedAccountsLabel },
    { label: "Pending reviews", value: identity.pendingReviewsLabel },
    { label: "Federation", value: identity.federationStatusLabel },
  ];

  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
      aria-labelledby="soc-identity-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Identity Overview
      </p>
      <h2 id="soc-identity-heading" className="mt-1 text-sm font-semibold text-zinc-50">
        Directory posture
      </h2>
      <p className="mt-1 text-xs text-zinc-500">{identity.summary}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" role="list">
        {tiles.map((tile) => (
          <li
            key={tile.label}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{tile.label}</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">{tile.value}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
