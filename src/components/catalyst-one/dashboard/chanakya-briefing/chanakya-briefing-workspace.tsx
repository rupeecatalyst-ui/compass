"use client";

import { useMemo } from "react";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useChanakyaGreeting } from "@/hooks/use-chanakya-greeting";
import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import { deriveChanakyaBriefingDashboard } from "@/lib/chanakya-briefing-dashboard";
import { ChanakyaBriefingCardView } from "./chanakya-briefing-card";

/**
 * CF-CHANAKYA-006 — CHANAKYA Briefing Workspace.
 * Action-first landing — answers "What should I do next?"
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

  return (
    <div className="space-y-4 pb-4">
      <header className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-violet-950/30 p-4 md:p-5">
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
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {briefing.cards.map((card) => (
          <ChanakyaBriefingCardView key={card.id} card={card} />
        ))}
      </div>

      <p className="text-[10px] uppercase tracking-wider text-slate-600 tabular-nums">
        Briefing generated · {new Date(briefing.generatedAt).toLocaleString("en-IN")}
      </p>
    </div>
  );
}
