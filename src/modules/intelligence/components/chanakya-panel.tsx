"use client";

import { cn } from "@/lib/utils";
import type { ChanakyaMode, ChanakyaPanelVariant, PriorityLevel } from "@/modules/intelligence/types";
import { useExecutiveBrief } from "@/modules/intelligence/hooks";
import { ExecutiveBriefCard } from "@/modules/intelligence/components/executive-brief-card";
import { PriorityPanel } from "@/modules/intelligence/components/priority-panel";

const MODE_LABELS: Record<ChanakyaMode, string> = {
  executive: "Executive Intelligence",
  manager: "Manager Intelligence",
  relationship_manager: "Relationship Manager Intelligence",
  credit: "Credit Intelligence",
  operations: "Operations Intelligence",
};

export interface ChanakyaPanelProps {
  mode: ChanakyaMode;
  variant?: ChanakyaPanelVariant;
  priority?: PriorityLevel;
  userName?: string;
  userId?: string;
  loanId?: string;
  customerId?: string;
  className?: string;
}

/** 10.3B — Reusable Chanakya intelligence panel (service-driven, AI-ready). */
export function ChanakyaPanel({
  mode,
  variant = "expanded",
  priority,
  userName,
  userId,
  loanId,
  customerId,
  className,
}: ChanakyaPanelProps) {
  const { data: brief, loading, error } = useExecutiveBrief({
    mode,
    userName,
    userId,
    loanId,
    customerId,
  });

  if (loading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-xl border border-slate-800 bg-[#0c1017] px-6 py-8",
          className,
        )}
      >
        <div className="h-4 w-24 rounded bg-slate-800" />
        <div className="mt-4 h-8 w-64 rounded bg-slate-800" />
        <div className="mt-6 h-20 rounded bg-slate-800/60" />
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div
        className={cn(
          "rounded-xl border border-red-900/50 bg-[#0c1017] px-6 py-6 text-sm text-red-300",
          className,
        )}
      >
        Intelligence unavailable. Please retry.
      </div>
    );
  }

  const filteredPriorities = priority
    ? brief.priorityItems.filter((p) => p.level === priority)
    : brief.priorityItems;

  const filteredBrief = priority
    ? { ...brief, priorityItems: filteredPriorities }
    : brief;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-xl border border-slate-800 bg-[#0c1017] px-5 py-4",
          className,
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Chanakya · {MODE_LABELS[mode]}
        </p>
        <p className="mt-2 text-sm font-medium text-slate-300">{brief.greeting}</p>
        <p className="mt-1 text-base font-semibold text-slate-100">{brief.headline}</p>
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {brief.businessSummary}
        </p>
        <div className="mt-4 border-t border-slate-800 pt-4">
          <PriorityPanel items={filteredPriorities.slice(0, 3)} />
        </div>
      </div>
    );
  }

  return (
    <ExecutiveBriefCard
      brief={filteredBrief}
      modeLabel={MODE_LABELS[mode]}
      className={className}
    />
  );
}

export { InsightCard } from "@/modules/intelligence/components/insight-card";
export { RecommendationCard } from "@/modules/intelligence/components/recommendation-card";
export { PriorityPanel } from "@/modules/intelligence/components/priority-panel";
export { ExecutiveBriefCard } from "@/modules/intelligence/components/executive-brief-card";
