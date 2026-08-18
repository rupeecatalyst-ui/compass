"use client";

import { inboundPayoutView } from "@/lib/enterprise-accounting-invoice/receivable";
import { formatINR } from "@/lib/format-currency";
import type { EnterpriseAccountingInvoiceDto } from "@/types/enterprise-accounting-invoice";

export function AccountingInboundReceiptsRegister({
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
      <h3 className="text-sm font-semibold text-foreground">Inbound Commission Receipts</h3>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Derived from Invoice net receivable and posted payments (and posted credit notes). This is
        not RM / Wealth Partner payouts, and it is not a writable payout ledger.
      </p>
      {loading ? (
        <p className="mt-3 text-[11px] text-muted-foreground">Loading inbound receipts…</p>
      ) : error ? (
        <p className="mt-3 text-[11px] text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          No raised invoices. Inbound commission receipts appear after Raise Invoice.
        </p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-2">Invoice Number</th>
                <th className="py-1.5 pr-2">Customer</th>
                <th className="py-1.5 pr-2">Deal</th>
                <th className="py-1.5 pr-2">Product</th>
                <th className="py-1.5 pr-2">Invoice Party / Commission Payer</th>
                <th className="py-1.5 pr-2">Invoice Date</th>
                <th className="py-1.5 pr-2">Invoice Total</th>
                <th className="py-1.5 pr-2">TDS</th>
                <th className="py-1.5 pr-2">Expected / Net Receivable</th>
                <th className="py-1.5 pr-2">Received</th>
                <th className="py-1.5 pr-2">Pending</th>
                <th className="py-1.5">Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => {
                const view = inboundPayoutView({
                  netReceivable: inv.netReceivable,
                  amountReceived: inv.amountReceived,
                  outstanding: inv.outstanding,
                  paymentStatus: inv.paymentStatus,
                });
                return (
                  <tr key={inv.id} className="border-t border-border/50">
                    <td className="py-2 pr-2 font-medium">{inv.invoiceNumber}</td>
                    <td className="py-2 pr-2">{inv.customerName ?? "—"}</td>
                    <td className="py-2 pr-2 text-muted-foreground">
                      {inv.dealNumber ?? inv.dealId.slice(0, 10)}
                    </td>
                    <td className="py-2 pr-2">{inv.productLabel ?? inv.productCode ?? "—"}</td>
                    <td className="py-2 pr-2">{inv.partyDisplayName}</td>
                    <td className="py-2 pr-2 tabular-nums">{inv.invoiceDate.slice(0, 10)}</td>
                    <td className="py-2 pr-2 tabular-nums">{formatINR(inv.invoiceTotal)}</td>
                    <td className="py-2 pr-2 tabular-nums">{formatINR(inv.tdsAmount)}</td>
                    <td className="py-2 pr-2 tabular-nums">{formatINR(view.expected)}</td>
                    <td className="py-2 pr-2 tabular-nums">{formatINR(view.received)}</td>
                    <td className="py-2 pr-2 tabular-nums font-medium">{formatINR(view.pending)}</td>
                    <td className="py-2">{view.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
