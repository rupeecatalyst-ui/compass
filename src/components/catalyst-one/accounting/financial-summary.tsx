"use client";

import { formatINRCompact } from "@/lib/format-currency";
import type { AccountingFinancialSummary } from "@/lib/accounting-workspace";

const OPERATIONAL_CARDS: Array<{ key: keyof AccountingFinancialSummary; label: string }> = [
  { key: "invoicesRaised", label: "Invoices Raised" },
  { key: "outstandingReceivables", label: "Outstanding Receivables" },
  { key: "expectedPayouts", label: "Expected inbound receipts" },
  { key: "gstCollected", label: "GST Collected" },
  { key: "todaysCollections", label: "Today's Collections" },
];

export function FinancialSummary({ summary }: { summary: AccountingFinancialSummary }) {
  return (
    <section className="space-y-2">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
            Operational Financial Summary
          </p>
          <h2 className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
            Today&apos;s accounting execution posture
          </h2>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Executive revenue analytics → Mission Control · Revenue Analytics
        </p>
      </header>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {OPERATIONAL_CARDS.map((card) => {
          const raw = summary[card.key];
          const value =
            card.key === "invoicesRaised"
              ? String(raw)
              : formatINRCompact(raw);
          return (
            <article
              key={card.key}
              className="rounded-lg border border-border/70 bg-card px-3 py-2.5 shadow-sm"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-foreground sm:text-lg">
                {value}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
