"use client";

import type { AccountingPayout } from "@/lib/accounting-workspace";
import { formatINR } from "@/lib/format-currency";
import { cn } from "@/lib/utils";

export function PayoutManagement({ payouts }: { payouts: AccountingPayout[] }) {
  return (
    <section className="flex min-h-0 flex-col space-y-2 rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
          Payout Management
        </p>
        <h2 className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
          Expected · received · pending payouts
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-border/60 bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2.5 py-2 font-semibold">Lender</th>
              <th className="px-2.5 py-2 font-semibold">Product</th>
              <th className="px-2.5 py-2 text-right font-semibold">Expected</th>
              <th className="px-2.5 py-2 text-right font-semibold">Received</th>
              <th className="px-2.5 py-2 text-right font-semibold">Pending</th>
              <th className="px-2.5 py-2 font-semibold">Expected Date</th>
              <th className="px-2.5 py-2 font-semibold">Actual Date</th>
              <th className="px-2.5 py-2 text-right font-semibold">Difference</th>
              <th className="px-2.5 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((row) => {
              const overdue = row.status === "overdue";
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border/50 last:border-0 hover:bg-muted/20",
                    overdue && "bg-amber-500/5",
                  )}
                >
                  <td className="px-2.5 py-2 font-medium text-foreground">{row.lender}</td>
                  <td className="px-2.5 py-2 text-muted-foreground">{row.product}</td>
                  <td className="px-2.5 py-2 text-right tabular-nums text-foreground">
                    {formatINR(row.expectedPayout)}
                  </td>
                  <td className="px-2.5 py-2 text-right tabular-nums text-foreground">
                    {formatINR(row.receivedPayout)}
                  </td>
                  <td className="px-2.5 py-2 text-right tabular-nums text-muted-foreground">
                    {formatINR(row.pendingPayout)}
                  </td>
                  <td className="px-2.5 py-2 tabular-nums text-muted-foreground">
                    {row.expectedDate}
                  </td>
                  <td className="px-2.5 py-2 tabular-nums text-muted-foreground">
                    {row.actualDate ?? "—"}
                  </td>
                  <td className="px-2.5 py-2 text-right tabular-nums text-foreground">
                    {formatINR(row.difference)}
                  </td>
                  <td className="px-2.5 py-2">
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        overdue
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                          : row.status === "received"
                            ? "border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-200"
                            : "border-border/70 bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
