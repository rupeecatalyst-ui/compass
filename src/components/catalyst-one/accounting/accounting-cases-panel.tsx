"use client";

/**
 * Durable Accounting Case register + commercial capture (015).
 */

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  enterpriseAccountingCaseClient,
  type EnterpriseAccountingCaseDto,
} from "@/lib/enterprise-accounting-case/client";
import { enterpriseAccountingInvoiceClient } from "@/lib/enterprise-accounting-invoice/client";
import { accountingGstRateApiClient } from "@/lib/enterprise-accounting-gst-rate/client";
import { calculateAccountingCommercialCapture } from "@/lib/enterprise-accounting-invoice/commercial";
import { calculateRaisedInvoiceAmounts } from "@/lib/enterprise-accounting-invoice/amounts";
import { determineAccountingGst } from "@/lib/enterprise-accounting-regulatory-tax/determine-gst";
import { ACCOUNTING_GST_DEFAULT_RATE_PERCENT } from "@/constants/enterprise-accounting-regulatory-tax";
import { todayIsoDateInTimeZone } from "@/lib/enterprise-accounting-invoice/financial-year";
import { formatINR } from "@/lib/format-currency";
import { ROUTES } from "@/constants/routes";
import type { EnterpriseAccountingGstRateDto } from "@/types/enterprise-accounting-gst-rate";
import { AccountingDurableInvoiceWorkspace } from "@/components/catalyst-one/accounting/accounting-durable-invoice-workspace";

function money(item: EnterpriseAccountingCaseDto, key: string): number | null {
  const value = item[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dealLabel(item: EnterpriseAccountingCaseDto): string {
  return item.deal?.dealNumber?.trim() || `Deal ${String(item.dealId ?? "").slice(0, 12)}`;
}

function pendingLoan(item: EnterpriseAccountingCaseDto): number | null {
  const finalAmt = money(item, "finalAmount");
  const disbursed = money(item, "disbursedAmount");
  if (finalAmt == null || disbursed == null) return null;
  return Math.max(0, Math.round((finalAmt - disbursed) * 100) / 100);
}

export function AccountingCasesPanel(props: {
  cases: EnterpriseAccountingCaseDto[];
  loading: boolean;
  error: string | null;
  caption: string;
  onReload: () => Promise<void> | void;
  canRaiseInvoice?: boolean;
  currentInvoiceByCaseId?: Record<string, string>;
  currentInvoiceIdByCaseId?: Record<string, string>;
  onInvoiceRaised?: () => Promise<void> | void;
  /** Navigation-only: open the existing case dialog for this id. */
  focusCaseId?: string | null;
}) {
  const [editing, setEditing] = useState<EnterpriseAccountingCaseDto | null>(null);
  const [raising, setRaising] = useState<EnterpriseAccountingCaseDto | null>(null);
  const [workspaceInvoiceId, setWorkspaceInvoiceId] = useState<string | null>(null);
  const [gstRates, setGstRates] = useState<EnterpriseAccountingGstRateDto[]>([]);
  const [raiseBusy, setRaiseBusy] = useState(false);
  const [raiseForm, setRaiseForm] = useState({
    gstRateId: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    placeOfSupplyStateCode: "",
  });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    status: "open",
    finalAmount: "",
    disbursedAmount: "",
    commissionPercent: "",
  });

  const commercialPreview = useMemo(() => {
    const finalLoanAmount = Number(form.finalAmount);
    const amountDisbursed = Number(form.disbursedAmount);
    const payoutPercent = Number(form.commissionPercent);
    if (![finalLoanAmount, amountDisbursed, payoutPercent].every(Number.isFinite)) return null;
    try {
      return calculateAccountingCommercialCapture({
        finalLoanAmount,
        amountDisbursed,
        payoutPercent,
      });
    } catch {
      return null;
    }
  }, [form]);

  const openEdit = (item: EnterpriseAccountingCaseDto) => {
    setEditing(item);
    setForm({
      status: String(item.status ?? "open"),
      finalAmount: money(item, "finalAmount")?.toString() ?? "",
      disbursedAmount: money(item, "disbursedAmount")?.toString() ?? "",
      commissionPercent: money(item, "commissionPercent")?.toString() ?? "",
    });
  };

  const focusedRef = useRef<string | null>(null);
  useEffect(() => {
    const id = props.focusCaseId?.trim();
    if (!id || props.loading) return;
    if (focusedRef.current === id) return;
    const hit = props.cases.find((item) => item.id === id);
    if (!hit) return;
    focusedRef.current = id;
    const row = document.getElementById(`accounting-case-${id}`);
    row?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [props.focusCaseId, props.loading, props.cases]);

  const openRaise = async (item: EnterpriseAccountingCaseDto) => {
    setRaising(item);
    setRaiseForm({
      gstRateId: "",
      invoiceDate: todayIsoDateInTimeZone("Asia/Kolkata"),
      dueDate: "",
      placeOfSupplyStateCode: "",
    });
    try {
      const rates = await accountingGstRateApiClient.list({ activeOnly: true });
      setGstRates(rates);
      const preferred = rates.find((r) => r.ratePercent === ACCOUNTING_GST_DEFAULT_RATE_PERCENT);
      if (preferred) {
        setRaiseForm((f) => ({ ...f, gstRateId: preferred.id }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load GST rates");
      setGstRates([]);
    }
  };

  const raiseInvoice = async () => {
    if (!raising) return;
    if (!raiseForm.gstRateId) {
      toast.error("Select an approved GST rate. GST is never inferred.");
      return;
    }
    setRaiseBusy(true);
    try {
      const created = await enterpriseAccountingInvoiceClient.raise({
        accountingCaseId: raising.id,
        rowVersion: raising.rowVersion,
        gstRateId: raiseForm.gstRateId,
        invoiceDate: raiseForm.invoiceDate,
        dueDate: raiseForm.dueDate || null,
        placeOfSupplyStateCode: raiseForm.placeOfSupplyStateCode || null,
        tdsAmount: 0,
      });
      toast.success(`Invoice ${created.invoiceNumber} raised. Not sent.`);
      setRaising(null);
      await props.onReload();
      await props.onInvoiceRaised?.();
      setWorkspaceInvoiceId(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Raise Invoice failed");
    } finally {
      setRaiseBusy(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    const finalLoanAmount = Number(form.finalAmount);
    const amountDisbursed = Number(form.disbursedAmount);
    const payoutPercent = Number(form.commissionPercent);
    try {
      calculateAccountingCommercialCapture({
        finalLoanAmount,
        amountDisbursed,
        payoutPercent,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Commercial capture invalid");
      return;
    }
    setBusy(true);
    try {
      await enterpriseAccountingCaseClient.update(editing.id, {
        rowVersion: editing.rowVersion,
        status: form.status.trim() || "open",
        finalAmount: finalLoanAmount,
        disbursedAmount: amountDisbursed,
        commissionPercent: payoutPercent,
      });
      toast.success("Commercial capture saved. Invoice not raised.");
      setEditing(null);
      await props.onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update Accounting Case");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Accounting Cases / Receivables</h2>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{props.caption}</p>
      {props.loading ? (
        <p className="mt-3 text-[11px] text-muted-foreground">Loading…</p>
      ) : props.error ? (
        <p className="mt-3 text-[11px] text-destructive">{props.error}</p>
      ) : props.cases.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          No durable Accounting Cases yet. Cases appear after Confirmation Received.
        </p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-2">Deal</th>
                <th className="py-1.5 pr-2">Customer / Product</th>
                <th className="py-1.5 pr-2">Invoice Party</th>
                <th className="py-1.5 pr-2">Final / Disbursed</th>
                <th className="py-1.5 pr-2">Pending loan</th>
                <th className="py-1.5 pr-2">Payout % / Commission</th>
                <th className="py-1.5 pr-2">Taxable</th>
                <th className="py-1.5 pr-2">Invoice</th>
                <th className="py-1.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {props.cases.map((item) => {
                const taxable = money(item, "confirmedInvoiceAmount");
                const payout = money(item, "payoutAmount") ?? money(item, "expectedCommission");
                const pct = money(item, "commissionPercent");
                const pending = pendingLoan(item);
                const dealId = String(item.dealId ?? "");
                const invoiceNo = props.currentInvoiceByCaseId?.[item.id];
                const invoiceId = props.currentInvoiceIdByCaseId?.[item.id];
                return (
                  <tr
                    id={`accounting-case-${item.id}`}
                    key={item.id}
                    className={`border-t border-border/50 ${
                      props.focusCaseId?.trim() === item.id
                        ? "bg-accent/40 text-accent-foreground"
                        : ""
                    }`}
                  >
                    <td className="py-2 pr-2 font-medium">{dealLabel(item)}</td>
                    <td className="py-2 pr-2 text-muted-foreground">
                      {item.deal?.primaryContactName ?? "—"}
                      {item.deal?.productLabel ? ` · ${item.deal.productLabel}` : ""}
                    </td>
                    <td className="py-2 pr-2">
                      {item.deal?.invoiceParty?.displayName ?? "Not specified"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-muted-foreground">
                      {money(item, "finalAmount") != null
                        ? formatINR(money(item, "finalAmount")!)
                        : "—"}
                      {" / "}
                      {money(item, "disbursedAmount") != null
                        ? formatINR(money(item, "disbursedAmount")!)
                        : "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {pending != null ? formatINR(pending) : "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {pct != null ? `${pct}%` : "—"}
                      {payout != null ? ` · ${formatINR(payout)}` : ""}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {taxable != null ? formatINR(taxable) : "—"}
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground">{invoiceNo ?? "—"}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => openEdit(item)}
                        >
                          Capture
                        </Button>
                        {props.canRaiseInvoice ? (
                          invoiceId ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-7 text-[11px]"
                              onClick={() => setWorkspaceInvoiceId(invoiceId)}
                            >
                              Open Invoice
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-[11px]"
                              disabled={(taxable ?? 0) <= 0}
                              onClick={() => void openRaise(item)}
                            >
                              Raise Invoice
                            </Button>
                          )
                        ) : null}
                        {dealId ? (
                          <Link
                            href={`${ROUTES.DEALS}/${encodeURIComponent(dealId)}`}
                            className="inline-flex h-7 items-center text-[11px] font-medium text-teal-700 hover:underline dark:text-teal-300"
                          >
                            Deal
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Commercial capture</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            Payout / Commission = Amount Disbursed × Payout %. Pending Loan Amount is read-only.
            This does not raise or send an invoice.
          </p>
          {editing?.deal?.invoiceParty ? (
            <div className="rounded-md border border-border/60 bg-muted/20 p-2 text-[11px]">
              <p className="font-semibold text-foreground">Invoice Party (from Master)</p>
              <p>{editing.deal.invoiceParty.displayName}</p>
              <p className="text-muted-foreground">
                GSTIN: {editing.deal.invoiceParty.gstin ?? "—"} · State:{" "}
                {editing.deal.invoiceParty.stateLabel ?? "—"} · Email:{" "}
                {editing.deal.invoiceParty.invoiceEmail ?? "—"}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              No Invoice Party on Deal — assign from Invoice Party Master before Raise Invoice.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-[10px] uppercase text-muted-foreground">Status</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Final Loan Amount</Label>
              <Input
                className="mt-1 h-8 text-xs"
                inputMode="decimal"
                value={form.finalAmount}
                onChange={(e) => setForm((f) => ({ ...f, finalAmount: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Amount Disbursed</Label>
              <Input
                className="mt-1 h-8 text-xs"
                inputMode="decimal"
                value={form.disbursedAmount}
                onChange={(e) => setForm((f) => ({ ...f, disbursedAmount: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">
                Pending Loan Amount (read-only)
              </Label>
              <Input
                className="mt-1 h-8 text-xs"
                readOnly
                value={
                  commercialPreview
                    ? String(commercialPreview.pendingLoanAmount)
                    : ""
                }
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Payout %</Label>
              <Input
                className="mt-1 h-8 text-xs"
                inputMode="decimal"
                value={form.commissionPercent}
                onChange={(e) => setForm((f) => ({ ...f, commissionPercent: e.target.value }))}
              />
            </div>
          </div>
          {commercialPreview ? (
            <div className="rounded-md border border-teal-700/30 bg-teal-950/10 p-2 text-[11px]">
              <p className="font-semibold">Commercial summary</p>
              <p className="text-muted-foreground">{commercialPreview.payoutBasisLabel}</p>
              <div className="mt-1 grid grid-cols-2 gap-1 tabular-nums">
                <span>Final Loan Amount</span>
                <span className="text-right">{formatINR(commercialPreview.finalLoanAmount)}</span>
                <span>Amount Disbursed</span>
                <span className="text-right">{formatINR(commercialPreview.amountDisbursed)}</span>
                <span>Pending Loan Amount</span>
                <span className="text-right">{formatINR(commercialPreview.pendingLoanAmount)}</span>
                <span>Payout %</span>
                <span className="text-right">{commercialPreview.payoutPercent}%</span>
                <span>Payout / Commission</span>
                <span className="text-right font-semibold">
                  {formatINR(commercialPreview.payoutCommission)}
                </span>
                <span>Taxable Value</span>
                <span className="text-right">{formatINR(commercialPreview.taxableValue)}</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Enter Final Loan Amount, Amount Disbursed, and Payout % to calculate commission.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
              Save commercial capture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(raising)} onOpenChange={(open) => !open && setRaising(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Raise Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            Validates GST (Place of Supply · CGST+SGST or IGST), allocates invoice number, and
            snapshots tax rules. Does not send email. Payer TDS is not assumed.
          </p>
          {raising ? (
            <RaiseInvoiceFields
              caseItem={raising}
              gstRates={gstRates}
              form={raiseForm}
              onChange={setRaiseForm}
            />
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setRaising(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={raiseBusy} onClick={() => void raiseInvoice()}>
              Raise Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AccountingDurableInvoiceWorkspace
        invoiceId={workspaceInvoiceId}
        open={Boolean(workspaceInvoiceId)}
        onOpenChange={(open) => {
          if (!open) setWorkspaceInvoiceId(null);
        }}
        onChanged={async () => {
          await props.onReload();
          await props.onInvoiceRaised?.();
        }}
      />
    </section>
  );
}

function RaiseInvoiceFields(props: {
  caseItem: EnterpriseAccountingCaseDto;
  gstRates: EnterpriseAccountingGstRateDto[];
  form: {
    gstRateId: string;
    invoiceDate: string;
    dueDate: string;
    placeOfSupplyStateCode: string;
  };
  onChange: (next: {
    gstRateId: string;
    invoiceDate: string;
    dueDate: string;
    placeOfSupplyStateCode: string;
  }) => void;
}) {
  const taxable = money(props.caseItem, "confirmedInvoiceAmount");
  const selected = props.gstRates.find((r) => r.id === props.form.gstRateId);
  const party = props.caseItem.deal?.invoiceParty;
  let preview: ReturnType<typeof calculateRaisedInvoiceAmounts> | null = null;
  let gstPreview: ReturnType<typeof determineAccountingGst> | null = null;
  if (taxable != null && taxable > 0 && selected) {
    try {
      preview = calculateRaisedInvoiceAmounts({
        taxableValue: taxable,
        gstRatePercent: selected.ratePercent,
        tdsAmount: 0,
      });
      gstPreview = determineAccountingGst({
        taxableValue: taxable,
        selectedGstRatePercent: selected.ratePercent,
        supplierGstin: null,
        supplierStateCode: props.form.placeOfSupplyStateCode ? null : "27",
        supplierStateLabel: null,
        recipientGstin: party?.gstin,
        recipientStateCode: null,
        recipientStateLabel: party?.stateLabel,
        placeOfSupplyStateCode: props.form.placeOfSupplyStateCode || null,
        recipientGstRegistered: Boolean(party?.gstin),
        supplyKind: "financial_services",
      });
    } catch {
      preview = null;
    }
  }
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Taxable (confirmed payout):{" "}
        {taxable != null ? formatINR(taxable) : "missing — raise will be blocked"}
      </p>
      <p className="text-[11px] text-muted-foreground">
        Invoice Party: {party?.displayName ?? "missing"} · GSTIN {party?.gstin ?? "—"} ·{" "}
        {party?.stateLabel ?? "—"} · {party?.invoiceEmail ?? "no email"}
      </p>
      <div>
        <Label className="text-[10px] uppercase text-muted-foreground">GST rate (required)</Label>
        <select
          className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          value={props.form.gstRateId}
          onChange={(e) => props.onChange({ ...props.form, gstRateId: e.target.value })}
        >
          <option value="">Select approved GST rate…</option>
          {props.gstRates.map((rate) => (
            <option key={rate.id} value={rate.id}>
              {rate.name} ({rate.ratePercent}%)
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-[10px] uppercase text-muted-foreground">
          Place of Supply state code (optional override)
        </Label>
        <Input
          className="mt-1 h-8 text-xs"
          placeholder="e.g. 27"
          value={props.form.placeOfSupplyStateCode}
          onChange={(e) =>
            props.onChange({ ...props.form, placeOfSupplyStateCode: e.target.value })
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Invoice date</Label>
          <Input
            type="date"
            className="mt-1 h-8 text-xs"
            value={props.form.invoiceDate}
            onChange={(e) => props.onChange({ ...props.form, invoiceDate: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Due date (optional)</Label>
          <Input
            type="date"
            className="mt-1 h-8 text-xs"
            value={props.form.dueDate}
            onChange={(e) => props.onChange({ ...props.form, dueDate: e.target.value })}
          />
        </div>
      </div>
      {preview && gstPreview?.ok ? (
        <div className="rounded-md border border-border/60 p-2 text-[11px] tabular-nums">
          <p>
            Tax treatment:{" "}
            <strong>
              {gstPreview.taxTreatment === "intra_state" ? "Intra-State" : "Inter-State"}
            </strong>
          </p>
          <p>Place of Supply: {gstPreview.placeOfSupplyStateLabel}</p>
          <p>Taxable {formatINR(preview.taxableValue)}</p>
          <p>
            CGST{" "}
            {gstPreview.split.cgstAmount > 0 ? formatINR(gstPreview.split.cgstAmount) : "—"} ·{" "}
            {gstPreview.split.stateTaxLabel}{" "}
            {gstPreview.split.sgstAmount > 0 ? formatINR(gstPreview.split.sgstAmount) : "—"} · IGST{" "}
            {gstPreview.split.igstAmount > 0 ? formatINR(gstPreview.split.igstAmount) : "—"}
          </p>
          <p className="font-semibold">Invoice Total {formatINR(preview.invoiceTotal)}</p>
        </div>
      ) : gstPreview && !gstPreview.ok ? (
        <p className="text-[11px] text-destructive">{gstPreview.message}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Select a GST rate to preview tax treatment. Final determination runs on the server with
          supplier GSTIN.
        </p>
      )}
    </div>
  );
}
