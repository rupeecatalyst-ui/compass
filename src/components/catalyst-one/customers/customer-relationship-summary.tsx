"use client";

import { formatINRCompact } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import type { CustomerRelationshipSummary } from "@/types/catalyst-one";

const CARDS: {
  key: keyof CustomerRelationshipSummary;
  label: string;
  currency?: boolean;
  accent?: boolean;
  tab?: string;
}[] = [
  { key: "activeLoans", label: "Active Loans", tab: "portfolio" },
  { key: "closedLoans", label: "Closed Loans", tab: "portfolio" },
  { key: "expectedRevenue", label: "Expected Revenue", currency: true, accent: true, tab: "rc-revenue" },
  { key: "receivedRevenue", label: "Received Revenue", currency: true, tab: "rc-revenue" },
  { key: "outstandingRevenue", label: "Outstanding Revenue", currency: true, tab: "rc-revenue" },
  { key: "crossSellOpportunities", label: "Cross-sell Opportunities", tab: "overview" },
];

interface CustomerRelationshipSummaryProps {
  summary: CustomerRelationshipSummary;
  onNavigate?: (tab: string) => void;
}

export function CustomerRelationshipSummary({
  summary,
  onNavigate,
}: CustomerRelationshipSummaryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {CARDS.map((card) => {
        const value = summary[card.key];
        const display = card.currency ? formatINRCompact(value) : String(value);
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => card.tab && onNavigate?.(card.tab)}
            className={cn(
              "rounded-xl border border-border bg-muted/20 px-3 py-3 text-left",
              "hover:border-primary/30 hover:bg-muted/40 transition-all duration-200",
              card.tab && "cursor-pointer",
            )}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">
              {card.label}
            </p>
            <p
              className={cn(
                "text-base font-semibold tabular-nums mt-1",
                card.accent ? "text-success" : "text-foreground",
              )}
            >
              {display}
            </p>
          </button>
        );
      })}
    </div>
  );
}
