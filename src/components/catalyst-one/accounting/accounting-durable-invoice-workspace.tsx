"use client";

import { useEffect, useState } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ACCOUNTING_PAYMENT_MODES } from "@/constants/enterprise-accounting-payment";
import { enterpriseAccountingInvoiceClient } from "@/lib/enterprise-accounting-invoice/client";
import { enterpriseAccountingPaymentClient } from "@/lib/enterprise-accounting-payment/client";
import { todayIsoDateInTimeZone } from "@/lib/enterprise-accounting-invoice/financial-year";
import { formatINR } from "@/lib/format-currency";
import type { EnterpriseAccountingInvoiceDto } from "@/types/enterprise-accounting-invoice";
import type { AccountingWithholdingClassification } from "@/lib/enterprise-accounting-invoice/payment-reconciliation";

export function AccountingDurableInvoiceWorkspace(props: {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => Promise<void> | void;
}) {
  const [invoice, setInvoice] = useState<EnterpriseAccountingInvoiceDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [sendForm, setSendForm] = useState({ to: "", cc: "", subject: "" });
  const [payForm, setPayForm] = useState({
    amountCredited: "",
    otherAdjustment: "0",
    classifyDifferenceAs: "" as "" | AccountingWithholdingClassification,
    paymentDate: todayIsoDateInTimeZone("Asia/Kolkata"),
    paymentReference: "",
    paymentMode: "neft",
    payerReference: "",
    tdsCertificateReference: "",
    tdsCertificateDate: "",
    notes: "",
  });

  const reload = async () => {
    if (!props.invoiceId) return;
    setLoading(true);
    try {
      const row = await enterpriseAccountingInvoiceClient.get(props.invoiceId);
      setInvoice(row);
      setSendForm({
        to: row.partyInvoiceEmail || "",
        cc: "",
        subject: `Invoice ${row.invoiceNumber} — ${row.partyDisplayName || row.partyBillingName}`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invoice");
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (props.open && props.invoiceId) {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, props.invoiceId]);

  const applySignature = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const updated = await enterpriseAccountingInvoiceClient.applySignature({
        invoiceId: invoice.id,
        invoiceRowVersion: invoice.rowVersion,
      });
      setInvoice(updated);
      toast.success("Digital signature applied. Review the signed PDF before sending.");
      await props.onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signature failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const blob = await enterpriseAccountingInvoiceClient.downloadPdf(invoice.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setBusy(false);
    }
  };

  const sendInvoice = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      const updated = await enterpriseAccountingInvoiceClient.send({
        invoiceId: invoice.id,
        invoiceRowVersion: invoice.rowVersion,
        to: sendForm.to.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
        cc: sendForm.cc.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
        subject: sendForm.subject,
      });
      setInvoice(updated);
      setSendOpen(false);
      toast.success("Invoice sent from connect@rupeecatalyst.com");
      await props.onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  const recordPayment = async () => {
    if (!invoice) return;
    setBusy(true);
    try {
      await enterpriseAccountingPaymentClient.post({
        invoiceId: invoice.id,
        invoiceRowVersion: invoice.rowVersion,
        amountCredited: Number(payForm.amountCredited),
        otherAdjustment: Number(payForm.otherAdjustment || 0),
        classifyDifferenceAs: payForm.classifyDifferenceAs || null,
        confirmWithholdingAsTds: true,
        paymentDate: payForm.paymentDate,
        paymentReference: payForm.paymentReference,
        paymentMode: payForm.paymentMode,
        payerReference: payForm.payerReference || null,
        tdsCertificateReference: payForm.tdsCertificateReference || null,
        tdsCertificateDate: payForm.tdsCertificateDate || null,
        notes: payForm.notes || null,
      });
      toast.success("Payment / credit reconciliation recorded");
      setPayOpen(false);
      await reload();
      await props.onChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Record payment failed");
    } finally {
      setBusy(false);
    }
  };

  const tax = invoice?.taxDetermination;

  return (
    <>
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        <SheetContent
          side="right"
          allowOutsideClose
          className="flex w-full flex-col overflow-hidden border-border/70 bg-background p-0 sm:max-w-[70vw]"
        >
          <SheetHeader className="shrink-0 space-y-2 border-b border-border/60 px-4 py-3 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
              Invoice workspace
            </p>
            <SheetTitle className="text-base tracking-tight text-foreground">
              {invoice?.invoiceNumber ?? "Invoice"}
            </SheetTitle>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                className="h-8 text-[11px]"
                disabled={busy || !invoice}
                onClick={() => void applySignature()}
              >
                Add Digital Signature
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-[11px]"
                disabled={busy || !invoice?.hasSignedPdf}
                onClick={() => void downloadPdf()}
              >
                Download PDF
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-[11px]"
                disabled
                title="Invoice email sending is unavailable until operational SMTP is separately certified."
              >
                Send Invoice (unavailable)
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 text-[11px]"
                disabled={busy || !invoice}
                onClick={() => {
                  if (!invoice) return;
                  setPayForm((f) => ({
                    ...f,
                    amountCredited: String(invoice.outstanding > 0 ? invoice.outstanding : invoice.invoiceTotal),
                    paymentReference: "",
                  }));
                  setPayOpen(true);
                }}
              >
                Record Payment
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-[11px]"
                onClick={() => props.onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {loading ? (
              <p className="text-[11px] text-muted-foreground">Loading invoice…</p>
            ) : !invoice ? (
              <p className="text-[11px] text-muted-foreground">Invoice not loaded.</p>
            ) : (
              <div className="space-y-3">
                <section className="rounded-lg border border-border/70 p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Invoice Party
                  </p>
                  <p className="text-sm font-semibold">{invoice.partyBillingName}</p>
                  <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                    {invoice.partyBillingAddress || "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    GSTIN {invoice.partyGstin || "—"} · {invoice.partyStateLabel || "—"} ·{" "}
                    {invoice.partyInvoiceEmail || "—"}
                  </p>
                </section>

                <section className="rounded-lg border border-border/70 p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Tax invoice
                  </p>
                  <dl className="mt-1 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">Invoice date</dt>
                      <dd className="font-medium">{invoice.invoiceDate.slice(0, 10)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="font-medium capitalize">{invoice.documentStatus}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Payment</dt>
                      <dd className="font-medium">{invoice.paymentStatus}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Taxable value</dt>
                      <dd className="font-medium tabular-nums">{formatINR(invoice.taxableValue)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">GST rate</dt>
                      <dd className="font-medium">{invoice.gstRatePercent}%</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Tax treatment</dt>
                      <dd className="font-medium">
                        {tax?.taxTreatment === "inter_state" ? "Inter-State" : "Intra-State"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Place of Supply</dt>
                      <dd className="font-medium">{tax?.placeOfSupplyStateLabel || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">CGST</dt>
                      <dd className="font-medium tabular-nums">
                        {(tax?.cgstAmount ?? 0) > 0 ? formatINR(tax!.cgstAmount) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{tax?.stateTaxLabel || "SGST"}</dt>
                      <dd className="font-medium tabular-nums">
                        {(tax?.sgstAmount ?? 0) > 0 ? formatINR(tax!.sgstAmount) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">IGST</dt>
                      <dd className="font-medium tabular-nums">
                        {(tax?.igstAmount ?? 0) > 0 ? formatINR(tax!.igstAmount) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Invoice total</dt>
                      <dd className="font-semibold tabular-nums">{formatINR(invoice.invoiceTotal)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Outstanding</dt>
                      <dd className="font-medium tabular-nums">{formatINR(invoice.outstanding)}</dd>
                    </div>
                  </dl>
                  {tax?.rulesUsed?.length ? (
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Regulatory rules snapshotted: {tax.rulesUsed.map((r) => r.ruleId).join(", ")}
                    </p>
                  ) : null}
                  {invoice.signatureAppliedAt ? (
                    <p className="mt-2 text-[11px] text-teal-700 dark:text-teal-300">
                      Signed by {invoice.signatureAuthorityName} (
                      {invoice.signatureDesignation}) ·{" "}
                      {invoice.signatureAppliedAt.slice(0, 19).replace("T", " ")}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                      Signature pending — required before Send Invoice.
                    </p>
                  )}
                </section>

                <section className="rounded-lg border border-border/70 p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Invoice communication
                  </p>
                  {invoice.lastSendAudit ? (
                    <div className="mt-1 space-y-1 text-[11px]">
                      <p>
                        Status: <strong>{invoice.lastSendAudit.sendStatus}</strong> ·{" "}
                        {invoice.lastSendAudit.sentAt.slice(0, 19).replace("T", " ")}
                      </p>
                      <p>From: {invoice.lastSendAudit.from}</p>
                      <p>To: {invoice.lastSendAudit.to.join(", ")}</p>
                      <p>CC: {invoice.lastSendAudit.cc.join(", ") || "—"}</p>
                      <p>Subject: {invoice.lastSendAudit.subject}</p>
                      <p className="text-muted-foreground">
                        Message-ID: {invoice.lastSendAudit.messageId || "—"}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Not sent yet. Replies will associate via inbound email thread / Message-ID when
                      inbound processing is enabled.
                    </p>
                  )}
                </section>

                <section className="rounded-lg border border-border/70 p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                    Payments / actual credit
                  </p>
                  {invoice.payments.length === 0 ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">No payments recorded.</p>
                  ) : (
                    <ul className="mt-1 space-y-2">
                      {invoice.payments.map((p) => (
                        <li
                          key={p.id}
                          className="rounded-md border border-border/60 px-2 py-1.5 text-[11px]"
                        >
                          <div className="flex justify-between gap-2">
                            <span>
                              {p.paymentDate.slice(0, 10)} · {p.paymentMode} · {p.status}
                            </span>
                            <span className="tabular-nums font-medium">{formatINR(p.amount)}</span>
                          </div>
                          {p.reconciliation ? (
                            <p className="mt-1 text-muted-foreground">
                              Credited {formatINR(p.reconciliation.amountCredited)} · TDS/Withholding{" "}
                              {formatINR(p.reconciliation.tdsWithholdingAmount)} · Other{" "}
                              {formatINR(p.reconciliation.otherAdjustment)} ·{" "}
                              {p.reconciliation.reconciliationStatus.replaceAll("_", " ")} (actual
                              payment reconciliation — no TDS rate assumed)
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            From: connect@rupeecatalyst.com · Attaches the same signed PDF reviewed in this workspace.
          </p>
          <div className="space-y-2">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">TO</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={sendForm.to}
                onChange={(e) => setSendForm((f) => ({ ...f, to: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">
                CC (manual, comma-separated)
              </Label>
              <Input
                className="mt-1 h-8 text-xs"
                placeholder="rahul@rupeecatalyst.com, ketan@rupeecatalyst.com"
                value={sendForm.cc}
                onChange={(e) => setSendForm((f) => ({ ...f, cc: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Subject</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={sendForm.subject}
                onChange={(e) => setSendForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setSendOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void sendInvoice()}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment / Actual Credit</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            Enter Amount Credited. TDS/withholding is derived from the actual credit difference —
            never from an assumed TDS %.
          </p>
          {invoice ? (
            <p className="text-[11px] tabular-nums">
              Invoice Total {formatINR(invoice.invoiceTotal)} · Outstanding{" "}
              {formatINR(invoice.outstanding)}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Amount Credited</Label>
              <Input
                className="mt-1 h-8 text-xs"
                inputMode="decimal"
                value={payForm.amountCredited}
                onChange={(e) => setPayForm((f) => ({ ...f, amountCredited: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Other Adjustment</Label>
              <Input
                className="mt-1 h-8 text-xs"
                inputMode="decimal"
                value={payForm.otherAdjustment}
                onChange={(e) => setPayForm((f) => ({ ...f, otherAdjustment: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[10px] uppercase text-muted-foreground">
                Classify residual difference
              </Label>
              <select
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={payForm.classifyDifferenceAs}
                onChange={(e) =>
                  setPayForm((f) => ({
                    ...f,
                    classifyDifferenceAs: e.target.value as typeof f.classifyDifferenceAs,
                  }))
                }
              >
                <option value="">None (full credit) / select if short</option>
                <option value="tds">TDS</option>
                <option value="other_withholding">Other withholding</option>
                <option value="unexplained_short_payment">Unexplained short payment</option>
              </select>
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Payment date</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-xs"
                value={payForm.paymentDate}
                onChange={(e) => setPayForm((f) => ({ ...f, paymentDate: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Mode</Label>
              <select
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={payForm.paymentMode}
                onChange={(e) => setPayForm((f) => ({ ...f, paymentMode: e.target.value }))}
              >
                {ACCOUNTING_PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[10px] uppercase text-muted-foreground">Payment reference</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={payForm.paymentReference}
                onChange={(e) => setPayForm((f) => ({ ...f, paymentReference: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Payer reference</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={payForm.payerReference}
                onChange={(e) => setPayForm((f) => ({ ...f, payerReference: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">
                TDS certificate ref (optional)
              </Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={payForm.tdsCertificateReference}
                onChange={(e) =>
                  setPayForm((f) => ({ ...f, tdsCertificateReference: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void recordPayment()}>
              Save reconciliation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
