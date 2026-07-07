"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutiveBrief } from "@/modules/intelligence/types";
import { InsightCard } from "@/modules/intelligence/components/insight-card";
import { RecommendationCard } from "@/modules/intelligence/components/recommendation-card";
import { PriorityPanel } from "@/modules/intelligence/components/priority-panel";

export interface ExecutiveBriefCardProps {
  brief: ExecutiveBrief;
  modeLabel?: string;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

/** 10.3B — Premium executive briefing (not a chat window). */
export function ExecutiveBriefCard({
  brief,
  modeLabel = "Executive Intelligence",
  collapsed: controlledCollapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  className,
}: ExecutiveBriefCardProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const collapsed = controlledCollapsed ?? internalCollapsed;

  const toggle = () => {
    const next = !collapsed;
    setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-800 bg-[#0c1017]",
        className,
      )}
    >
      <header className="border-b border-slate-800 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Chanakya
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-100">
              {modeLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <>
                Expand <ChevronDown className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Collapse <ChevronUp className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-xl font-medium text-slate-200">{brief.greeting}</p>
          <p className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {brief.headline}
          </p>
        </div>
      </header>

      {!collapsed && (
        <div className="max-h-[min(72vh,640px)] overflow-y-auto px-6 py-6 scrollbar-thin">
          <div className="space-y-10">
            <section>
              <SectionTitle>Business Summary</SectionTitle>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-400">
                {brief.businessSummary}
              </p>
            </section>

            <section>
              <SectionTitle>Priority Items</SectionTitle>
              <div className="mt-4">
                <PriorityPanel items={brief.priorityItems} maxPerLevel={4} />
              </div>
            </section>

            <section>
              <SectionTitle>Recommended Actions</SectionTitle>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {brief.recommendedActions.map((rec) => (
                  <RecommendationCard key={rec.id} {...rec} />
                ))}
              </div>
            </section>

            <section>
              <SectionTitle>Upcoming Risks</SectionTitle>
              <div className="mt-4 space-y-3">
                {brief.upcomingRisks.map((risk) => (
                  <div
                    key={risk.id}
                    className="rounded-lg border border-slate-800 bg-[#111827] px-5 py-4"
                  >
                    <p className="text-sm font-semibold text-slate-200">{risk.title}</p>
                    <p className="mt-2 text-sm text-slate-400">{risk.description}</p>
                    <p className="mt-2 text-xs text-slate-500">Impact · {risk.impact}</p>
                    {risk.mitigation && (
                      <p className="mt-1 text-xs text-slate-500">Mitigation · {risk.mitigation}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {brief.insights.length > 0 && (
              <section>
                <SectionTitle>Intelligence Signals</SectionTitle>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {brief.insights.map((insight) => (
                    <InsightCard key={insight.id} {...insight} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
      {children}
    </h3>
  );
}
