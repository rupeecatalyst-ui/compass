"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { OpportunityHealthBand } from "@/types/enterprise-opportunity-intelligence";
import { OwGlassPanel, OwSectionLabel } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

const HEADLINE_FALLBACK: Record<OpportunityHealthBand, string> = {
  excellent: "Excellent Progress",
  good: "Steady Progress",
  needs_attention: "Needs Attention",
  critical: "Critical",
};

export function WorkspaceChanakyaAdvisory() {
  const { intelligence, chanakyaAdvisory } = useOpportunityWorkspace();
  const band = intelligence?.health.band ?? "needs_attention";
  const headline = chanakyaAdvisory?.headline ?? HEADLINE_FALLBACK[band];
  const message =
    chanakyaAdvisory?.message ??
    intelligence?.insights?.[0]?.message ??
    "Opportunity is progressing. Maintain scheduled follow-ups.";
  const reactions = chanakyaAdvisory?.reactions ?? [];

  return (
    <OwGlassPanel className="overflow-hidden">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-2xl border border-teal-500/25 shadow-lg sm:mx-0 sm:h-32 sm:w-32">
          <Image
            src="/images/chanakya-portrait.png"
            alt="CHANAKYA"
            fill
            className="object-cover"
            sizes="128px"
            priority
          />
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <OwSectionLabel>CHANAKYA</OwSectionLabel>
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
              Advisory
            </span>
          </div>
          <h2
            className={cn(
              "text-lg font-semibold tracking-tight",
              band === "excellent" && "text-emerald-700 dark:text-emerald-300",
              band === "good" && "text-teal-800 dark:text-teal-200",
              band === "needs_attention" && "text-amber-800 dark:text-amber-200",
              band === "critical" && "text-rose-700 dark:text-rose-300",
            )}
          >
            {headline}
          </h2>
          <p
            key={message}
            className="max-w-2xl text-sm leading-relaxed text-muted-foreground animate-in fade-in duration-500"
          >
            “{message}”
          </p>
          {reactions.length > 0 && (
            <ul className="space-y-1">
              {reactions.map((r) => (
                <li key={r} className="text-[11px] text-violet-800/90 dark:text-violet-200/90">
                  · {r}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </OwGlassPanel>
  );
}
