"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useChanakyaGreeting } from "@/hooks/use-chanakya-greeting";
import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import { deriveChanakyaBriefingDashboard } from "@/lib/chanakya-briefing-dashboard";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { ChanakyaBriefingCardView } from "./chanakya-briefing-card";

/**
 * CF-CHANAKYA-006 / Prompt 011 — Briefing Workspace with priority hierarchy + quick actions.
 */
export function ChanakyaBriefingWorkspace() {
  const { user } = useAuthContext();
  const firstName = user?.firstName?.trim() || "Rahul";

  const briefing = useMemo(
    () => deriveChanakyaBriefingDashboard({ firstName }),
    [firstName],
  );

  const greeting = useChanakyaGreeting({
    context: "guidance",
    firstName,
    surfaceKey: "briefing:dashboard",
  });

  const p1 = briefing.cards.filter((c) => c.priority === 1);
  const p2 = briefing.cards.filter((c) => c.priority === 2);
  const p3 = briefing.cards.filter((c) => c.priority === 3);

  return (
    <div className="space-y-5 pb-4">
      <header className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-violet-950/30 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3 md:gap-4">
            <ChanakyaAvatar size="lg" priority />
            <div className="min-w-0 flex-1">
              <ChanakyaIdentityLabel surface="briefing" className="tracking-[0.16em] text-violet-300/90" />
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-50 md:text-xl">
                {briefing.greeting}
              </h1>
              <p className="mt-1 text-sm font-medium text-violet-200/90">{greeting.text}</p>
              <p className="mt-2 text-sm text-slate-400">{briefing.tagline}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="h-9 gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500">
              <Link href={`${ROUTES.CONTACTS}?create=1`}>
                <Plus className="h-3.5 w-3.5" />
                Add Contact
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 gap-1.5 rounded-lg border-violet-400/40">
              <Link href={`${ROUTES.LOAN_FILES}?create=1`}>
                <Plus className="h-3.5 w-3.5" />
                Add Loan
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 gap-1.5 rounded-lg border-violet-400/40">
              <Link href={`${ROUTES.CONTACTS}?create=1&intent=investor`}>
                <Plus className="h-3.5 w-3.5" />
                Add Investment
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {p1.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400/90">
            Priority 1 · Immediate Attention
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {p1.map((card) => (
              <ChanakyaBriefingCardView key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}

      {p2.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-400/90">
            Priority 2 · Operational
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {p2.map((card) => (
              <ChanakyaBriefingCardView key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}

      {p3.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Priority 3 · Informational
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {p3.map((card) => (
              <ChanakyaBriefingCardView key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}

      <p className="text-[10px] uppercase tracking-wider text-slate-600 tabular-nums">
        Briefing generated · {new Date(briefing.generatedAt).toLocaleString("en-IN")}
      </p>
    </div>
  );
}
