/**
 * Build approved Rupee Catalyst / Peak Profits Capital Services invoice HTML for PDF.
 * Layout mirrors existing Accounting invoice facts — letterhead + tax components + signature.
 */

import type { EnterpriseAccountingInvoiceDto } from "@/types/enterprise-accounting-invoice";
import { amountInWordsInr } from "@/lib/enterprise-accounting-invoice/amount-in-words";
import { formatINR } from "@/lib/format-currency";

export type AccountingInvoicePdfRenderContext = {
  invoice: EnterpriseAccountingInvoiceDto;
  supplier: {
    legalEntityName: string;
    brandName: string;
    gstin: string;
    pan: string;
    address: string;
    stateLabel: string;
  };
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
  } | null;
};

function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function moneyCell(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return esc(formatINR(value));
}

export function buildAccountingInvoiceHtml(ctx: AccountingInvoicePdfRenderContext): string {
  const inv = ctx.invoice;
  const tax = inv.taxDetermination;
  const invoiceDate = inv.invoiceDate.slice(0, 10);
  const signatureBlock =
    inv.signatureAppliedAt && inv.signatureAuthorityName
      ? `<div class="sig">
          <div class="sig-line">Digitally authorised</div>
          <div class="sig-name">${esc(inv.signatureAuthorityName)}</div>
          <div class="sig-role">${esc(inv.signatureDesignation || "Authorised Signatory")}</div>
          <div class="sig-meta">${esc(inv.signatureAppliedAt.slice(0, 19).replace("T", " "))} IST</div>
        </div>`
      : `<div class="sig unsigned">
          <div class="sig-line">Authorised Signature</div>
          <div class="sig-meta">Signature pending</div>
        </div>`;

  const cgst = tax?.cgstAmount ?? 0;
  const sgst = tax?.sgstAmount ?? 0;
  const igst = tax?.igstAmount ?? 0;
  const stateTaxLabel = tax?.stateTaxLabel ?? "SGST";
  const treatment = tax?.taxTreatment === "inter_state" ? "Inter-State" : "Intra-State";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${esc(inv.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #12202e; font-size: 11px; }
  .letterhead { border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 18px; font-weight: 700; color: #0f766e; letter-spacing: 0.02em; }
  .legal { font-size: 11px; font-weight: 600; margin-top: 2px; }
  .meta { color: #475569; margin-top: 4px; line-height: 1.45; }
  h1 { font-size: 16px; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; }
  th { background: #f1f5f9; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .right { text-align: right; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; }
  .label { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
  .value { margin-top: 2px; font-weight: 600; }
  .totals td { border: none; padding: 3px 0; }
  .totals .grand { font-size: 13px; font-weight: 700; border-top: 1px solid #94a3b8; padding-top: 6px; }
  .words { margin-top: 10px; font-style: italic; color: #334155; }
  .sig { margin-top: 28px; text-align: right; }
  .sig-line { font-size: 10px; text-transform: uppercase; color: #64748b; }
  .sig-name { font-size: 14px; font-weight: 700; margin-top: 18px; font-family: "Palatino Linotype", Georgia, serif; }
  .sig-role, .sig-meta { color: #475569; }
  .unsigned .sig-name { display: none; }
  .foot { margin-top: 18px; font-size: 9px; color: #64748b; }
</style>
</head>
<body>
  <div class="letterhead">
    <div class="brand">${esc(ctx.supplier.brandName || "Rupee Catalyst")}</div>
    <div class="legal">${esc(ctx.supplier.legalEntityName || "Peak Profits Capital Services")}</div>
    <div class="meta">
      ${esc(ctx.supplier.address)}<br/>
      GSTIN: ${esc(ctx.supplier.gstin || "—")} · PAN: ${esc(ctx.supplier.pan || "—")} · State: ${esc(ctx.supplier.stateLabel || "—")}
    </div>
  </div>

  <h1>TAX INVOICE</h1>
  <div class="grid">
    <div class="box">
      <div class="label">Invoice Party (Bill To)</div>
      <div class="value">${esc(inv.partyBillingName)}</div>
      <div class="meta">
        ${esc(inv.partyBillingAddress || "")}<br/>
        GSTIN: ${esc(inv.partyGstin || "—")} · State: ${esc(inv.partyStateLabel || "—")}<br/>
        Email: ${esc(inv.partyInvoiceEmail || "—")}
      </div>
    </div>
    <div class="box">
      <div class="label">Invoice references</div>
      <div class="meta">
        Invoice No: <strong>${esc(inv.invoiceNumber)}</strong><br/>
        Invoice Date: ${esc(invoiceDate)}<br/>
        Deal: ${esc(inv.dealNumber || inv.dealId)}<br/>
        Customer: ${esc(inv.customerName || "—")}<br/>
        Product: ${esc(inv.productLabel || inv.productFamily)}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="right">Taxable Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          Facilitation / commission charges<br/>
          <span class="meta">Tax treatment: ${esc(treatment)} · Place of Supply: ${esc(tax?.placeOfSupplyStateLabel || "—")}
          ${tax?.rulesUsed?.[0] ? `<br/>Rule: ${esc(tax.rulesUsed.map((r) => r.ruleId).join(", "))}` : ""}</span>
        </td>
        <td class="right">${moneyCell(inv.taxableValue)}</td>
      </tr>
    </tbody>
  </table>

  <table class="totals" style="margin-top:12px;width:280px;margin-left:auto;">
    <tr><td>Taxable Value</td><td class="right">${moneyCell(inv.taxableValue)}</td></tr>
    <tr><td>GST Rate</td><td class="right">${esc(String(inv.gstRatePercent))}%</td></tr>
    <tr><td>CGST${tax?.taxTreatment === "intra_state" ? ` (${tax.cgstRatePercent}%)` : ""}</td><td class="right">${tax?.taxTreatment === "intra_state" ? moneyCell(cgst) : "—"}</td></tr>
    <tr><td>${esc(stateTaxLabel)}${tax?.taxTreatment === "intra_state" ? ` (${tax.sgstRatePercent}%)` : ""}</td><td class="right">${tax?.taxTreatment === "intra_state" ? moneyCell(sgst) : "—"}</td></tr>
    <tr><td>IGST${tax?.taxTreatment === "inter_state" ? ` (${tax.igstRatePercent}%)` : ""}</td><td class="right">${tax?.taxTreatment === "inter_state" ? moneyCell(igst) : "—"}</td></tr>
    <tr class="grand"><td>Invoice Total</td><td class="right">${moneyCell(inv.invoiceTotal)}</td></tr>
  </table>

  <div class="words">Amount in words: ${esc(amountInWordsInr(inv.invoiceTotal))}</div>

  ${
    ctx.bankDetails
      ? `<div class="box" style="margin-top:12px;">
    <div class="label">Payment / Bank details</div>
    <div class="meta">
      ${esc(ctx.bankDetails.accountName || "")}<br/>
      Bank: ${esc(ctx.bankDetails.bankName || "—")} · A/c: ${esc(ctx.bankDetails.accountNumber || "—")} · IFSC: ${esc(ctx.bankDetails.ifsc || "—")}
    </div>
  </div>`
      : ""
  }

  ${signatureBlock}

  <div class="foot">
    This is a durable Accounting invoice generated by Catalyst One. Historical tax determination is snapshotted and is not rewritten by later rate updates.
  </div>
</body>
</html>`;
}
