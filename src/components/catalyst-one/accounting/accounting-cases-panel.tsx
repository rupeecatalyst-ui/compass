"use client";

/**
 * Durable Accounting Case register (not an invoice ledger).
 * Cases appear only after Confirmation Received.
 */

import { useState } from "react";
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
import { calculateRaisedInvoiceAmounts } from "@/lib/enterprise-accounting-invoice/amounts";
import { todayIsoDateInTimeZone } from "@/lib/enterprise-accounting-invoice/financial-year";
import { formatINR } from "@/lib/format-currency";
import { ROUTES } from "@/constants/routes";
import type { EnterpriseAccountingGstRateDto } from "@/types/enterprise-accounting-gst-rate";

function money(item: EnterpriseAccountingCaseDto, key: string): number | null {
  const value = item[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dealLabel(item: EnterpriseAccountingCaseDto): string {
  return item.deal?.dealNumber?.trim() || `Deal ${String(item.dealId ?? "").slice(0, 12)}`;
}

export function AccountingCasesPanel(props: {
  cases: EnterpriseAccountingCaseDto[];
  loading: boolean;
  error: string | null;
  caption: string;
  onReload: () => Promise<void> | void;
  canRaiseInvoice?: boolean;
  currentInvoiceByCaseId?: Record<string, string>;
  onInvoiceRaised?: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState<EnterpriseAccountingCaseDto | null>(null);
  const [raising, setRaising] = useState<EnterpriseAccountingCaseDto | null>(null);
  const [gstRates, setGstRates] = useState<EnterpriseAccountingGstRateDto[]>([]);
  const [raiseBusy, setRaiseBusy] = useState(false);
  const [raiseForm, setRaiseForm] = useState({
    gstRateId: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
  });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    status: "open",
    confirmedInvoiceAmount: "",
    expectedCommission: "",
    payoutAmount: "",
    tdsAmount: "",
    shortPaymentAmount: "",
    disbursedAmount: "",
    commissionPercent: "",
  });

  const openEdit = (item: EnterpriseAccountingCaseDto) => {
    setEditing(item);
    setForm({
      status: String(item.status ?? "open"),
      confirmedInvoiceAmount: money(item, "confirmedInvoiceAmount")?.toString() ?? "",
      expectedCommission: money(item, "expectedCommission")?.toString() ?? "",
      payoutAmount: money(item, "payoutAmount")?.toString() ?? "",
      tdsAmount: money(item, "tdsAmount")?.toString() ?? "",
      shortPaymentAmount: money(item, "shortPaymentAmount")?.toString() ?? "",
      disbursedAmount: money(item, "disbursedAmount")?.toString() ?? "",
      commissionPercent: money(item, "commissionPercent")?.toString() ?? "",
    });
  };

  const openRaise = async (item: EnterpriseAccountingCaseDto) => {
    setRaising(item);
    setRaiseForm({
      gstRateId: "",
      invoiceDate: todayIsoDateInTimeZone("Asia/Kolkata"),
      dueDate: "",
    });
    try {
      setGstRates(await accountingGstRateApiClient.list({ activeOnly: true }));
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
      });
      toast.success(`Invoice ${created.invoiceNumber} raised. Not sent.`);
      setRaising(null);
      await props.onReload();
      await props.onInvoiceRaised?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Raise Invoice failed");
    } finally {
      setRaiseBusy(false);
    }
  };

  const parseOptional = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await enterpriseAccountingCaseClient.update(editing.id, {
        rowVersion: editing.rowVersion,
        status: form.status.trim() || "open",
        confirmedInvoiceAmount: parseOptional(form.confirmedInvoiceAmount),
        expectedCommission: parseOptional(form.expectedCommission),
        payoutAmount: parseOptional(form.payoutAmount),
        tdsAmount: parseOptional(form.tdsAmount),
        shortPaymentAmount: parseOptional(form.shortPaymentAmount),
        disbursedAmount: parseOptional(form.disbursedAmount),
        commissionPercent: parseOptional(form.commissionPercent),
      });
      toast.success("Accounting Case updated. Invoice not raised.");
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
      <h2 className="text-sm font-semibold text-foreground">Accounting Cases</h2>
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
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-2">Deal</th>
                <th className="py-1.5 pr-2">Customer / Product</th>
                <th className="py-1.5 pr-2">Invoice Party</th>
                <th className="py-1.5 pr-2">Status</th>
                <th className="py-1.5 pr-2">Confirmed amount</th>
                <th className="py-1.5 pr-2">Payout / TDS</th>
                <th className="py-1.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {props.cases.map((item) => {
                const amount = money(item, "confirmedInvoiceAmount");
                const payout = money(item, "payoutAmount") ?? money(item, "expectedCommission");
                const tds = money(item, "tdsAmount");
                const dealId = String(item.dealId ?? "");
                return (
                  <tr key={item.id} className="border-t border-border/50">
                    <td className="py-2 pr-2 font-medium">{dealLabel(item)}</td>
                    <td className="py-2 pr-2 text-muted-foreground">
                      {item.deal?.primaryContactName ?? "—"}
                      {item.deal?.productLabel ? ` · ${item.deal.productLabel}` : ""}
                    </td>
                    <td className="py-2 pr-2">
                      {item.deal?.invoiceParty?.displayName ?? "Not specified"}
                    </td>
                    <td className="py-2 pr-2 capitalize">{String(item.status ?? "open")}</td>
                    <td className="py-2 pr-2 tabular-nums">
                      {amount != null ? formatINR(amount) : "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-muted-foreground">
                      {payout != null ? formatINR(payout) : "—"}
                      {tds != null ? ` · TDS ${formatINR(tds)}` : ""}
                    </td>
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
                          props.currentInvoiceByCaseId?.[item.id] ? (
                            <span className="text-[11px] text-muted-foreground">
                              {props.currentInvoiceByCaseId[item.id]}
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-[11px]"
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Accounting Case commercial capture</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            Updates the durable Accounting Case only. This does not raise, send, or number an invoice.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-[10px] uppercase text-muted-foreground">Status</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              />
            </div>
            {(
              [
                ["confirmedInvoiceAmount", "Confirmed taxable value (before GST)"],
                ["expectedCommission", "Expected commission"],
                ["payoutAmount", "Payout amount"],
                ["tdsAmount", "TDS amount"],
                ["shortPaymentAmount", "Short payment"],
                ["disbursedAmount", "Disbursed amount"],
                ["commissionPercent", "Commission %"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  inputMode="decimal"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
              Save case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(raising)} onOpenChange={(open) => !open && setRaising(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            Allocates LN/MF + FY number, snapshots Invoice Party and GST, and creates a durable
            raised invoice. This does not send the invoice.
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
    </section>
  );
}

function RaiseInvoiceFields(props: {
  caseItem: EnterpriseAccountingCaseDto;
  gstRates: EnterpriseAccountingGstRateDto[];
  form: { gstRateId: string; invoiceDate: string; dueDate: string };
  onChange: (next: { gstRateId: string; invoiceDate: string; dueDate: string }) => void;
}) {
  const taxable = money(props.caseItem, "confirmedInvoiceAmount");
  const tds = money(props.caseItem, "tdsAmount");
  const selected = props.gstRates.find((r) => r.id === props.form.gstRateId);
  let preview: ReturnType<typeof calculateRaisedInvoiceAmounts> | null = null;
  if (taxable != null && taxable > 0 && selected) {
    try {
      preview = calculateRaisedInvoiceAmounts({
        taxableValue: taxable,
        gstRatePercent: selected.ratePercent,
        tdsAmount: tds,
      });
    } catch {
      preview = null;
    }
  }
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Taxable (confirmed): {taxable != null ? formatINR(taxable) : "missing — raise will be blocked"}
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
      {preview ? (
        <p className="text-[11px] text-muted-foreground">
          GST {formatINR(preview.gstAmount)} · Total {formatINR(preview.invoiceTotal)} · TDS{" "}
          {formatINR(preview.tdsAmount)} · Net receivable {formatINR(preview.netReceivable)}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Select a GST rate to preview GST, invoice total, and net receivable.
        </p>
      )}
    </div>
  );
}
