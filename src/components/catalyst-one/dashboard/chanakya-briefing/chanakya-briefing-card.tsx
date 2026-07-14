"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChanakyaBriefingCard } from "@/types/chanakya-briefing-dashboard";
import { cn } from "@/lib/utils";

const CARD_ACCENT: Record<ChanakyaBriefingCard["id"], string> = {
  priority_actions: "border-rose-500/30 from-rose-950/20",
  pending_tasks: "border-amber-500/30 from-amber-950/15",
  profile_completion: "border-violet-500/30 from-violet-950/20",
  opportunity_watch: "border-sky-500/30 from-sky-950/15",
  lender_intelligence: "border-cyan-500/30 from-cyan-950/15",
  business_health: "border-teal-500/30 from-teal-950/15",
  risk_watch: "border-orange-500/30 from-orange-950/15",
  recommendations: "border-emerald-500/30 from-emerald-950/15",
  daily_wisdom: "border-indigo-500/30 from-indigo-950/20",
};

export function ChanakyaBriefingCardView({ card }: { card: ChanakyaBriefingCard }) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border bg-gradient-to-br to-slate-900/50 p-4 shadow-sm backdrop-blur-sm",
        CARD_ACCENT[card.id],
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {card.title}
      </p>
      <h3 className="mt-2 text-sm font-semibold leading-snug text-slate-50">{card.headline}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">{card.insight}</p>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        <span className="font-semibold uppercase tracking-wide text-slate-600">Why shown · </span>
        {card.reason}
      </p>
      <div className="mt-auto pt-4">
        <Button
          asChild
          size="sm"
          className="h-8 w-full rounded-lg bg-violet-600 text-[11px] font-medium hover:bg-violet-500"
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
