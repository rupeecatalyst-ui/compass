"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChanakyaBriefingCard } from "@/types/chanakya-briefing-dashboard";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<
  ChanakyaBriefingCard["priority"],
  { shell: string; badge: string; badgeLabel: string; cta: string }
> = {
  1: {
    shell:
      "border-amber-500/40 bg-gradient-to-br from-amber-950/35 via-slate-900/70 to-slate-900/40 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]",
    badge: "bg-amber-500/20 text-amber-200 border-amber-500/30",
    badgeLabel: "Immediate",
    cta: "bg-amber-600 hover:bg-amber-500",
  },
  2: {
    shell: "border-violet-500/25 bg-gradient-to-br from-violet-950/25 via-slate-900/60 to-slate-900/40",
    badge: "bg-violet-500/15 text-violet-200 border-violet-500/25",
    badgeLabel: "Operational",
    cta: "bg-violet-600 hover:bg-violet-500",
  },
  3: {
    shell: "border-slate-600/40 bg-gradient-to-br from-slate-900/40 to-slate-950/30 opacity-95",
    badge: "bg-slate-700/40 text-slate-300 border-slate-600/40",
    badgeLabel: "Informational",
    cta: "bg-slate-700 hover:bg-slate-600",
  },
};

export function ChanakyaBriefingCardView({ card }: { card: ChanakyaBriefingCard }) {
  const style = PRIORITY_STYLES[card.priority];

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border p-4 shadow-sm backdrop-blur-sm",
        style.shell,
        card.priority === 3 && "md:col-span-1",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {card.title}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
            style.badge,
          )}
        >
          {style.badgeLabel}
        </span>
      </div>
      <h3
        className={cn(
          "mt-2 font-semibold leading-snug text-slate-50",
          card.priority === 1 ? "text-base" : "text-sm",
        )}
      >
        {card.headline}
      </h3>
      <p
        className={cn(
          "mt-2 text-xs leading-relaxed",
          card.priority === 3 ? "text-slate-400" : "text-slate-300",
        )}
      >
        {card.insight}
      </p>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        <span className="font-semibold uppercase tracking-wide text-slate-600">Why shown · </span>
        {card.reason}
      </p>
      <div className="mt-auto pt-4">
        <Button
          asChild
          size="sm"
          className={cn("h-8 w-full rounded-lg text-[11px] font-medium", style.cta)}
        >
          <Link href={card.actionHref} className="inline-flex items-center justify-center gap-1.5">
            {card.actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
