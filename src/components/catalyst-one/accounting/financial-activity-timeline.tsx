"use client";

import type { FinancialActivityEvent } from "@/lib/accounting-workspace";

const KIND_LABEL: Record<FinancialActivityEvent["kind"], string> = {
  invoice_created: "Invoice Created",
  invoice_shared: "Invoice Shared",
  payment_received: "Payment Received",
  payout_received: "Payout Received",
  adjustment: "Adjustment",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

export function FinancialActivityTimeline({
  events,
}: {
  events: FinancialActivityEvent[];
}) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <section className="flex min-h-0 flex-col space-y-2 rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
          Financial Activity
        </p>
        <h2 className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
          Enterprise timeline
        </h2>
      </header>
      <ol className="min-h-0 flex-1 space-y-0 overflow-y-auto rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5">
        {sorted.map((event, index) => (
          <li key={event.id} className="relative flex gap-2.5 pb-3 last:pb-0">
            {index < sorted.length - 1 && (
              <span className="absolute left-[5px] top-3 h-[calc(100%-4px)] w-px bg-border" />
            )}
            <span className="relative mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-600/70" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <p className="text-[12px] font-semibold text-foreground">
                  {KIND_LABEL[event.kind] ?? event.title}
                </p>
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {new Date(event.at).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {event.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
