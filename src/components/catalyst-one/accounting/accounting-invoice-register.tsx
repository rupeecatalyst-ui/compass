"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ACCOUNTING_PAYMENT_MODES } from "@/constants/enterprise-accounting-payment";
import { formatINR } from "@/lib/format-currency";
import { todayIsoDateInTimeZone } from "@/lib/enterprise-accounting-invoice/financial-year";
import { splitCreditNoteFromInvoiceGst } from "@/lib/enterprise-accounting-invoice/receivable";
import { enterpriseAccountingCreditNoteClient } from "@/lib/enterprise-accounting-credit-note/client";
import { enterpriseAccountingPaymentClient } from "@/lib/enterprise-accounting-payment/client";
import type { EnterpriseAccountingInvoiceDto } from "@/types/enterprise-accounting-invoice";

export function AccountingInvoiceRegister({
  invoices,
  loading,
  error,
  canPostPayment,
  onReload,
}: {
  invoices: EnterpriseAccountingInvoiceDto[];
  loading: boolean;
  error: string | null;
  canPostPayment?: boolean;
  onReload?: () => Promise<void> | void;
}) {
  const [posting, setPosting] = useState<EnterpriseAccountingInvoiceDto | null>(null);
  const [crediting, setCrediting] = useState<EnterpriseAccountingInvoiceDto | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    paymentDate: todayIsoDateInTimeZone("Asia/Kolkata"),
    paymentReference: "",
    paymentMode: "neft",
    notes: "",
  });
  const [creditForm, setCreditForm] = useState({
    amount: "",
    creditNoteDate: todayIsoDateInTimeZone("Asia/Kolkata"),
    reason: "",
  });

  const openPost = (invoice: EnterpriseAccountingInvoiceDto) => {
    setPosting(invoice);
    setForm({
      amount: invoice.outstanding > 0 ? String(invoice.outstanding) : "",
      paymentDate: todayIsoDateInTimeZone("Asia/Kolkata"),
      paymentReference: "",
      paymentMode: "neft",
      notes: "",
    });
  };

  const submitPost = async () => {
    if (!posting) return;
    const amount = Number(form.amount);
    if (!form.paymentReference.trim()) {
      toast.error("Payment reference is required");
      return;
    }
    setBusy(true);
    try {
      await enterpriseAccountingPaymentClient.post({
        invoiceId: posting.id,
        invoiceRowVersion: posting.rowVersion,
        amount,
        paymentDate: form.paymentDate,
        paymentReference: form.paymentReference.trim(),
        paymentMode: form.paymentMode,
        notes: form.notes.trim() || null,
      });
      toast.success("Payment posted. Invoice billed values were not changed.");
      setPosting(null);
      await onReload?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Post Payment failed");
    } finally {
      setBusy(false);
    }
  };

  const submitVoid = async () => {
    if (!voidingId) return;
    if (!voidReason.trim()) {
      toast.error("Void reason is required");
      return;
    }
    setBusy(true);
    try {
      await enterpriseAccountingPaymentClient.void(voidingId, { reason: voidReason.trim() });
      toast.success("Payment voided. The payment record remains auditable.");
      setVoidingId(null);
      setVoidReason("");
      await onReload?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Void payment failed");
    } finally {
      setBusy(false);
    }
  };

  const openCredit = (invoice: EnterpriseAccountingInvoiceDto) => {
    setCrediting(invoice);
    setCreditForm({
      amount: invoice.outstanding > 0 ? String(invoice.outstanding) : "",
      creditNoteDate: todayIsoDateInTimeZone("Asia/Kolkata"),
      reason: "",
    });
  };

  const submitCredit = async () => {
    if (!crediting) return;
    const amount = Number(creditForm.amount);
    if (!creditForm.reason.trim()) {
      toast.error("Credit Note reason is required");
      return;
    }
    setBusy(true);
    try {
      await enterpriseAccountingCreditNoteClient.create({
        invoiceId: crediting.id,
        invoiceRowVersion: crediting.rowVersion,
        creditNoteAmount: amount,
        creditNoteDate: creditForm.creditNoteDate,
        reason: creditForm.reason.trim(),
      });
      toast.success("Credit Note created. Original invoice billed values were not changed.");
      setCrediting(null);
      await onReload?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Issue Credit Note failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">Durable invoices</h3>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Raised invoices only. Mark Paid, Cancel, PDF, and Share are not available in Phase 1.
        Post Payment records money received; it does not mark the invoice paid as a fake status.
        Issue Credit Note reduces derived outstanding and does not rewrite the original invoice.
      </p>
      {loading ? (
        <p className="mt-3 text-[11px] text-muted-foreground">Loading invoices…</p>
      ) : error ? (
        <p className="mt-3 text-[11px] text-destructive">{error}</p>
      ) : invoices.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          No invoices have been raised. Confirmation Received creates an Accounting Case only.
        </p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-2">Invoice</th>
                <th className="py-1.5 pr-2">Invoice Party</th>
                <th className="py-1.5 pr-2">Deal / Customer</th>
                <th className="py-1.5 pr-2">Date</th>
                <th className="py-1.5 pr-2">Invoice total</th>
                <th className="py-1.5 pr-2">Net receivable</th>
                <th className="py-1.5 pr-2">Received</th>
                <th className="py-1.5 pr-2">Credit notes</th>
                <th className="py-1.5 pr-2">Outstanding</th>
                <th className="py-1.5 pr-2">Payment</th>
                <th className="py-1.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <InvoiceRows
                  key={inv.id}
                  invoice={inv}
                  canPostPayment={Boolean(canPostPayment)}
                  onPost={() => openPost(inv)}
                  onCredit={() => openCredit(inv)}
                  onVoid={(id) => {
                    setVoidingId(id);
                    setVoidReason("");
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(posting)} onOpenChange={(open) => !open && setPosting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post Payment</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            Records money received against {posting?.invoiceNumber}. Outstanding{" "}
            {posting ? formatINR(posting.outstanding) : "—"}. Overpayment is blocked.
          </p>
          <div className="grid gap-2">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Amount</Label>
              <Input
                className="mt-1 h-8 text-xs"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Payment date</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-xs"
                value={form.paymentDate}
                onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Reference</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={form.paymentReference}
                onChange={(e) => setForm((f) => ({ ...f, paymentReference: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Mode</Label>
              <select
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={form.paymentMode}
                onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))}
              >
                {ACCOUNTING_PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Notes</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setPosting(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void submitPost()}>
              Post Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(crediting)} onOpenChange={(open) => !open && setCrediting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Credit Note</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            Reduces derived outstanding for {crediting?.invoiceNumber}. Original invoice billed
            values stay immutable. Remaining outstanding{" "}
            {crediting ? formatINR(crediting.outstanding) : "—"}. GST uses the invoice snapshot rate
            {crediting ? ` (${crediting.gstRatePercent}%)` : ""}.
          </p>
          <div className="grid gap-2">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Credit Note amount</Label>
              <Input
                className="mt-1 h-8 text-xs"
                inputMode="decimal"
                value={creditForm.amount}
                onChange={(e) => setCreditForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            {crediting && Number(creditForm.amount) > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                {(() => {
                  try {
                    const split = splitCreditNoteFromInvoiceGst(
                      Number(creditForm.amount),
                      crediting.gstRatePercent,
                    );
                    return `Taxable ${formatINR(split.taxableAmount)} · GST ${formatINR(split.gstAmount)}`;
                  } catch {
                    return "Enter a credit-note amount greater than 0.";
                  }
                })()}
              </p>
            ) : null}
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Credit Note date</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-xs"
                value={creditForm.creditNoteDate}
                onChange={(e) => setCreditForm((f) => ({ ...f, creditNoteDate: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Reason</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={creditForm.reason}
                onChange={(e) => setCreditForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setCrediting(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void submitCredit()}>
              Issue Credit Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(voidingId)} onOpenChange={(open) => !open && setVoidingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Void Payment</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            The posted payment remains on record. Outstanding will be recalculated from remaining posted payments.
          </p>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Reason</Label>
            <Input
              className="mt-1 h-8 text-xs"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setVoidingId(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void submitVoid()}>
              Void Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function InvoiceRows({
  invoice,
  canPostPayment,
  onPost,
  onCredit,
  onVoid,
}: {
  invoice: EnterpriseAccountingInvoiceDto;
  canPostPayment: boolean;
  onPost: () => void;
  onCredit: () => void;
  onVoid: (paymentId: string) => void;
}) {
  const eligible =
    invoice.documentStatus === "raised" || invoice.documentStatus === "shared";
  return (
    <>
      <tr className="border-t border-border/50">
        <td className="py-2 pr-2 font-medium">{invoice.invoiceNumber}</td>
        <td className="py-2 pr-2">{invoice.partyDisplayName}</td>
        <td className="py-2 pr-2 text-muted-foreground">
          {invoice.dealNumber ?? invoice.dealId.slice(0, 10)}
          {invoice.customerName ? ` · ${invoice.customerName}` : ""}
        </td>
        <td className="py-2 pr-2 tabular-nums">{invoice.invoiceDate.slice(0, 10)}</td>
        <td className="py-2 pr-2 tabular-nums">{formatINR(invoice.invoiceTotal)}</td>
        <td className="py-2 pr-2 tabular-nums">{formatINR(invoice.netReceivable)}</td>
        <td className="py-2 pr-2 tabular-nums">{formatINR(invoice.amountReceived)}</td>
        <td className="py-2 pr-2 tabular-nums">{formatINR(invoice.creditNoteAmount)}</td>
        <td className="py-2 pr-2 tabular-nums font-medium">{formatINR(invoice.outstanding)}</td>
        <td className="py-2 pr-2">{invoice.paymentStatus}</td>
        <td className="py-2">
          <div className="flex flex-wrap gap-1">
            {canPostPayment && eligible && invoice.outstanding > 0 ? (
              <Button type="button" size="sm" className="h-7 text-[11px]" onClick={onPost}>
                Post Payment
              </Button>
            ) : null}
            {canPostPayment && eligible && invoice.outstanding > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={onCredit}
              >
                Issue Credit Note
              </Button>
            ) : null}
            {!canPostPayment || invoice.outstanding <= 0 || !eligible ? (
              <span className="text-[11px] text-muted-foreground">{invoice.documentStatus}</span>
            ) : null}
          </div>
        </td>
      </tr>
      {invoice.payments.length > 0 ? (
        <tr className="border-t border-border/30 bg-muted/10">
          <td colSpan={11} className="px-2 py-2">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Payment history</p>
            <table className="mt-1 w-full text-left text-[11px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Amount</th>
                  <th className="py-1 pr-2">Reference</th>
                  <th className="py-1 pr-2">Mode</th>
                  <th className="py-1 pr-2">Status</th>
                  <th className="py-1 pr-2">Posted by</th>
                  <th className="py-1"> </th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1 pr-2 tabular-nums">{p.paymentDate.slice(0, 10)}</td>
                    <td className="py-1 pr-2 tabular-nums">{formatINR(p.amount)}</td>
                    <td className="py-1 pr-2">{p.paymentReference}</td>
                    <td className="py-1 pr-2 uppercase">{p.paymentMode}</td>
                    <td className="py-1 pr-2">{p.status}</td>
                    <td className="py-1 pr-2 font-mono text-[10px]">{p.receivedBy.slice(0, 8)}</td>
                    <td className="py-1">
                      {canPostPayment && p.status === "posted" ? (
                        <button
                          type="button"
                          className="text-[11px] font-medium text-teal-700 hover:underline dark:text-teal-300"
                          onClick={() => onVoid(p.id)}
                        >
                          Void
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      ) : null}
      {(invoice.creditNotes ?? []).length > 0 ? (
        <tr className="border-t border-border/30 bg-muted/10">
          <td colSpan={11} className="px-2 py-2">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Credit notes</p>
            <table className="mt-1 w-full text-left text-[11px]">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">Number</th>
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Amount</th>
                  <th className="py-1 pr-2">GST</th>
                  <th className="py-1 pr-2">Status</th>
                  <th className="py-1">Reason</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.creditNotes ?? []).map((note) => (
                  <tr key={note.id}>
                    <td className="py-1 pr-2 font-medium">{note.creditNoteNumber}</td>
                    <td className="py-1 pr-2 tabular-nums">{note.creditNoteDate.slice(0, 10)}</td>
                    <td className="py-1 pr-2 tabular-nums">{formatINR(note.creditNoteAmount)}</td>
                    <td className="py-1 pr-2 tabular-nums">{formatINR(note.gstAmount)}</td>
                    <td className="py-1 pr-2">{note.status}</td>
                    <td className="py-1">{note.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      ) : null}
    </>
  );
}
