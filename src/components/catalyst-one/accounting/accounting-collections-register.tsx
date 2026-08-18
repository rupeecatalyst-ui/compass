"use client";

import { formatINR } from "@/lib/format-currency";
import type { EnterpriseAccountingInvoiceDto } from "@/types/enterprise-accounting-invoice";

export function AccountingCollectionsRegister({
  invoices,
  loading,
  error,
}: {
  invoices: EnterpriseAccountingInvoiceDto[];
  loading: boolean;
  error: string | null;
}) {
  const rows = invoices.filter((inv) => inv.documentStatus !== "cancelled");
  return (
    <section className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">Collections</h3>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Derived outstanding from Invoice net receivable minus posted payments minus posted credit notes. This is not a
        writable receivable ledger.
      </p>
      {loading ? (
        <p className="mt-3 text-[11px] text-muted-foreground">Loading collections…</p>
      ) : error ? (
        <p className="mt-3 text-[11px] text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          No raised invoices. Collections appear after Raise Invoice.
        </p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-2">Invoice</th>
                <th className="py-1.5 pr-2">Customer</th>
                <th className="py-1.5 pr-2">Invoice Party</th>
                <th className="py-1.5 pr-2">Deal</th>
                <th className="py-1.5 pr-2">Invoice date</th>
                <th className="py-1.5 pr-2">Due date</th>
                <th className="py-1.5 pr-2">Net receivable</th>
                <th className="py-1.5 pr-2">Received</th>
                <th className="py-1.5 pr-2">Credit notes</th>
                <th className="py-1.5 pr-2">Outstanding</th>
                <th className="py-1.5">Payment status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className="border-t border-border/50">
                  <td className="py-2 pr-2 font-medium">{inv.invoiceNumber}</td>
                  <td className="py-2 pr-2">{inv.customerName ?? "—"}</td>
                  <td className="py-2 pr-2">{inv.partyDisplayName}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{inv.dealNumber ?? inv.dealId.slice(0, 10)}</td>
                  <td className="py-2 pr-2 tabular-nums">{inv.invoiceDate.slice(0, 10)}</td>
                  <td className="py-2 pr-2 tabular-nums">{inv.dueDate ? inv.dueDate.slice(0, 10) : "—"}</td>
                  <td className="py-2 pr-2 tabular-nums">{formatINR(inv.netReceivable)}</td>
                  <td className="py-2 pr-2 tabular-nums">{formatINR(inv.amountReceived)}</td>
                  <td className="py-2 pr-2 tabular-nums">{formatINR(inv.creditNoteAmount)}</td>
                  <td className="py-2 pr-2 tabular-nums font-medium">{formatINR(inv.outstanding)}</td>
                  <td className="py-2">{inv.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
