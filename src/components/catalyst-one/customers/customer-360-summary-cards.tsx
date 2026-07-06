"use client";

import { formatINRCompact } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import type { Customer360Metrics } from "@/types/catalyst-one";

const CARDS: {
  key: keyof Customer360Metrics | "pipelineValue";
  label: string;
  accent?: boolean;
  tab?: string;
}[] = [
  { key: "activeLoans", label: "Active Loans", tab: "active-loans" },
  { key: "totalLoanValue", label: "Total Loan Value", accent: true, tab: "active-loans" },
  { key: "revenueGenerated", label: "RC Revenue", tab: "rc-revenue" },
  { key: "pipelineValue", label: "Pipeline Value", accent: true, tab: "active-loans" },
  { key: "completedLoans", label: "Completed Loans", tab: "completed-loans" },
  { key: "pendingTasks", label: "Pending Tasks", tab: "tasks" },
];

function formatValue(key: keyof Customer360Metrics, metrics: Customer360Metrics): string {
  const v = metrics[key];
  if (key === "activeLoans" || key === "completedLoans" || key === "pendingTasks") {
    return String(v);
  }
  return formatINRCompact(v as number);
}

interface Customer360SummaryCardsProps {
  metrics: Customer360Metrics;
  onNavigate?: (tab: string) => void;
  showRcRevenue?: boolean;
}

export function Customer360SummaryCards({
  metrics,
  onNavigate,
  showRcRevenue = false,
}: Customer360SummaryCardsProps) {
  const cards = CARDS.filter((c) => c.key !== "revenueGenerated" || showRcRevenue);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          onClick={() => card.tab && onNavigate?.(card.tab)}
          className={cn(
            "rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-left",
            "hover:border-primary/30 hover:bg-muted/40 transition-colors",
            card.tab && "cursor-pointer",
          )}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{card.label}</p>
          <p
            className={cn(
              "text-base font-semibold tabular-nums mt-0.5",
              card.accent ? "text-success" : "text-foreground",
            )}
          >
            {formatValue(card.key as keyof Customer360Metrics, metrics)}
          </p>
        </button>
      ))}
    </div>
  );
}
