"use client";

import { cn } from "@/lib/utils";
import { OwGlassPanel, OwPanelHeader } from "./workspace-design";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";

export function WorkspaceChanakyaInsightsPanel() {
  const { intelligence, chanakyaAdvisory } = useOpportunityWorkspace();
  const insights = intelligence?.insights ?? [];
  const reactions = chanakyaAdvisory?.reactions ?? [];

  return (
    <OwGlassPanel className="h-full">
      <OwPanelHeader
        title="CHANAKYA Insights"
        badge="Advisory"
        description="Rule-based reactions to workspace actions"
      />
      <div className="space-y-2">
        {reactions.map((reaction) => (
          <div
            key={reaction}
            className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
                Reaction
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground">{reaction}</p>
          </div>
        ))}
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              "rounded-xl border p-3 transition-colors",
              insight.severity === "attention"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-zinc-200/70 bg-zinc-50/50 dark:border-white/10 dark:bg-zinc-950/40",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
                CHANAKYA
              </span>
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                {insight.severity}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground">{insight.message}</p>
          </div>
        ))}
        {reactions.length === 0 && insights.length === 0 && (
          <p className="text-xs text-muted-foreground">Insights will appear as activity unfolds.</p>
        )}
      </div>
    </OwGlassPanel>
  );
}
