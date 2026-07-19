"use client";

import type { ChanakyaRadarDealRow } from "@/lib/chanakya-radar/derive-dashboard";
import { cn } from "@/lib/utils";

interface ChanakyaRadarActionTableProps {
  rows: ChanakyaRadarDealRow[];
  onOpen: (row: ChanakyaRadarDealRow) => void;
}

/**
 * Compact enterprise table for CHANAKYA Radar action tabs.
 */
export function ChanakyaRadarActionTable({ rows, onOpen }: ChanakyaRadarActionTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center border border-dashed border-border text-[12px] text-muted-foreground">
        No deals in this view.
      </div>
    );
  }

  return (
    <div className="max-h-[min(32vh,320px)] overflow-auto border border-zinc-700 bg-zinc-950/40">
      <table className="w-full min-w-[720px] border-collapse text-left text-[12px] leading-4">
        <thead className="sticky top-0 z-10 bg-zinc-900">
          <tr className="border-b border-zinc-700 text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-1.5 font-semibold">Deal ID</th>
            <th className="px-2 py-1.5 font-semibold">Borrower</th>
            <th className="px-2 py-1.5 font-semibold">Product</th>
            <th className="px-2 py-1.5 text-right font-semibold">Amount</th>
            <th className="px-2 py-1.5 font-semibold">RM</th>
            <th className="px-2 py-1.5 font-semibold">Quadrant</th>
            <th className="px-2 py-1.5 font-semibold">Lender</th>
            <th className="px-2 py-1.5 font-semibold">Last Activity</th>
            <th className="px-2 py-1.5 text-right font-semibold">Docs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onOpen(row)}
              className={cn(
                "cursor-pointer border-b border-zinc-800/80 transition-colors hover:bg-zinc-800/60",
              )}
            >
              <td className="px-2 py-1 font-mono text-[11px] text-muted-foreground">{row.dealId}</td>
              <td className="px-2 py-1 font-medium">{row.borrower}</td>
              <td className="px-2 py-1 text-muted-foreground">{row.product}</td>
              <td className="px-2 py-1 text-right tabular-nums text-emerald-400">
                {row.loanAmountLabel}
              </td>
              <td className="px-2 py-1">{row.assignedRm}</td>
              <td className="px-2 py-1 text-muted-foreground">{row.quadrantLabel}</td>
              <td className="px-2 py-1 text-amber-400/90">{row.lender}</td>
              <td className="px-2 py-1 tabular-nums text-muted-foreground">
                {row.lastActivityLabel}
              </td>
              <td className="px-2 py-1 text-right tabular-nums">{row.pendingDocs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
