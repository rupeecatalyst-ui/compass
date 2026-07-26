"use client";

import type { ChanakyaFinancialInsight } from "@/lib/accounting-workspace";
import { cn } from "@/lib/utils";

export function ChanakyaFinancialInsights({
  insights,
}: {
  insights: ChanakyaFinancialInsight[];
}) {
  return (
    <aside className="flex flex-col rounded-xl border border-border/70 bg-card shadow-sm">
      <header className="border-b border-border/60 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
          CHANAKYA
        </p>
        <h2 className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
          Financial Insights
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Mock recommendations only</p>
      </header>
      <ul className="max-h-[min(70vh,36rem)] space-y-1.5 overflow-y-auto p-2.5">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className={cn(
              "rounded-lg border px-2.5 py-2",
              insight.tone === "attention" &&
                "border-amber-500/30 bg-amber-500/5",
              insight.tone === "info" && "border-border/70 bg-muted/20",
              insight.tone === "positive" && "border-teal-500/25 bg-teal-500/5",
            )}
          >
            <p className="text-[12px] font-semibold text-foreground">{insight.title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {insight.message}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
