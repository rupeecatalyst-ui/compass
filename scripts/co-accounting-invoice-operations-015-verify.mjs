/**
 * CO-ACCOUNTING-INVOICE-OPERATIONS-015 — static verification gate.
 * Engineering assertions only. BUILD PASS ≠ PRODUCTION PASS.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateAccountingCommercialCapture } from "../src/lib/enterprise-accounting-invoice/commercial.ts";
import { calculateRaisedInvoiceAmounts } from "../src/lib/enterprise-accounting-invoice/amounts.ts";
import {
  assertGstMutualExclusivity,
  determineAccountingGst,
} from "../src/lib/enterprise-accounting-regulatory-tax/determine-gst.ts";
import { reconcileActualCredit } from "../src/lib/enterprise-accounting-invoice/payment-reconciliation.ts";
import { ACCOUNTING_GST_DEFAULT_RATE_PERCENT } from "../src/constants/enterprise-accounting-regulatory-tax/index.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
const expect = (name, condition) => {
  checks.push({ name, ok: Boolean(condition) });
};

const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const commercial = calculateAccountingCommercialCapture({
  finalLoanAmount: 10000000,
  amountDisbursed: 8000000,
  payoutPercent: 1.5,
});
expect("Final Loan Amount captured", commercial.finalLoanAmount === 10000000);
expect("Amount Disbursed captured", commercial.amountDisbursed === 8000000);
expect("Pending Loan Amount = Final - Disbursed", commercial.pendingLoanAmount === 2000000);
expect("Payout % captured", commercial.payoutPercent === 1.5);
expect("Payout on disbursed basis", commercial.payoutCommission === 120000);
expect("Payout basis is amount_disbursed", commercial.payoutBasis === "amount_disbursed");

let blockedNegative = false;
try {
  calculateAccountingCommercialCapture({
    finalLoanAmount: 100,
    amountDisbursed: 150,
    payoutPercent: 1,
  });
} catch {
  blockedNegative = true;
}
expect("Blocks disbursed > final (no negative pending)", blockedNegative);

const amounts = calculateRaisedInvoiceAmounts({
  taxableValue: 10000,
  gstRatePercent: 18,
  tdsAmount: 0,
});
expect("GST default 18% amount", amounts.gstAmount === 1800);
expect("Invoice total = taxable + GST", amounts.invoiceTotal === 11800);
expect("No automatic TDS at raise", amounts.tdsAmount === 0);

const intra = determineAccountingGst({
  taxableValue: 10000,
  selectedGstRatePercent: 18,
  supplierGstin: "27AAAAA0000A1Z5",
  supplierStateCode: null,
  supplierStateLabel: null,
  recipientGstin: "27BBBBB0000B1Z5",
  recipientStateCode: null,
  recipientStateLabel: null,
  supplyKind: "financial_services",
});
expect("Intra-state determination ok", intra.ok === true);
if (intra.ok) {
  expect("Intra-state treatment", intra.taxTreatment === "intra_state");
  expect("CGST 9%", intra.split.cgstRatePercent === 9);
  expect("SGST 9%", intra.split.sgstRatePercent === 9);
  expect("IGST 0 for intra", intra.split.igstAmount === 0);
  expect("CGST amount 900", intra.split.cgstAmount === 900);
  expect("SGST amount 900", intra.split.sgstAmount === 900);
  assertGstMutualExclusivity(intra.split);
  expect("Mutual exclusivity intra", true);
}

const inter = determineAccountingGst({
  taxableValue: 10000,
  selectedGstRatePercent: 18,
  supplierGstin: "27AAAAA0000A1Z5",
  supplierStateCode: null,
  supplierStateLabel: null,
  recipientGstin: "29BBBBB0000B1Z5",
  recipientStateCode: null,
  recipientStateLabel: null,
  supplyKind: "financial_services",
});
expect("Inter-state determination ok", inter.ok === true);
if (inter.ok) {
  expect("Inter-state treatment", inter.taxTreatment === "inter_state");
  expect("IGST 18%", inter.split.igstRatePercent === 18);
  expect("CGST 0 for inter", inter.split.cgstAmount === 0);
  expect("SGST 0 for inter", inter.split.sgstAmount === 0);
  expect("IGST amount 1800", inter.split.igstAmount === 1800);
  assertGstMutualExclusivity(inter.split);
}

let invalidMix = false;
try {
  assertGstMutualExclusivity({
    taxTreatment: "intra_state",
    gstRatePercent: 18,
    cgstRatePercent: 9,
    sgstRatePercent: 9,
    igstRatePercent: 18,
    cgstAmount: 900,
    sgstAmount: 900,
    igstAmount: 1800,
    gstAmount: 3600,
    invoiceTotal: 13600,
    stateTaxLabel: "SGST",
  });
} catch {
  invalidMix = true;
}
expect("Rejects CGST+IGST mix", invalidMix);

let wrongRate = false;
const wrong = determineAccountingGst({
  taxableValue: 10000,
  selectedGstRatePercent: 12,
  supplierGstin: "27AAAAA0000A1Z5",
  supplierStateCode: null,
  supplierStateLabel: null,
  recipientGstin: "27BBBBB0000B1Z5",
  recipientStateCode: null,
  recipientStateLabel: null,
});
expect("Blocks non-default rate without config", wrong.ok === false);

const credit = reconcileActualCredit({
  invoiceTotal: 11800,
  amountCredited: 11600,
  otherAdjustment: 0,
  classifyDifferenceAs: "tds",
  confirmWithholdingAsTds: true,
});
expect("Amount Credited recorded", credit.amountCredited === 11600);
expect("Implied TDS/withholding from actual credit", credit.tdsWithholdingAmount === 200);
expect("Fully reconciled when credit + TDS = total", credit.reconciliationStatus === "fully_reconciled");
expect("Source is actual payment reconciliation", credit.source === "actual_payment_reconciliation");

const partial = reconcileActualCredit({
  invoiceTotal: 11800,
  amountCredited: 5000,
  otherAdjustment: 0,
});
expect("Partial credit without auto TDS", partial.tdsWithholdingAmount === 0);
expect("Balance pending for partial", partial.balancePending === 6800);
expect("No automatic TDS rate field", !("tdsRatePercent" in partial));

expect("Regulatory default rate constant is 18", ACCOUNTING_GST_DEFAULT_RATE_PERCENT === 18);

const schema = read("prisma/schema.prisma");
expect("taxDeterminationJson on invoice", schema.includes("taxDeterminationJson"));
expect("signedPdfBytes on invoice", schema.includes("signedPdfBytes"));
expect("payment reconciliationJson", schema.includes("reconciliationJson") && schema.includes("EnterpriseAccountingPayment"));

const raise = read("server/services/enterprise-accounting-invoice/enterprise-accounting-invoice.service.ts");
expect("Raise does not send email", raise.includes("emailed: false") || raise.includes("Not sent"));
expect("TDS not assumed at raise", raise.includes("TDS_NOT_ASSUMED_AT_RAISE"));
expect("GST determination before raise", raise.includes("determineAccountingGst"));
expect("Invoice Party Master required", raise.includes("INVOICE_PARTY"));
expect("Digital signature flow", raise.includes("applyDigitalSignature"));
expect("Invoice email send disabled until SMTP certification", raise.includes("INVOICE_SEND_DISABLED"));
expect("PDF bytes persisted after signature", raise.includes("signedPdfBytes"));

const casesPanel = read("src/components/catalyst-one/accounting/accounting-cases-panel.tsx");
expect("Commercial capture Final Loan Amount", casesPanel.includes("Final Loan Amount"));
expect("Amount Disbursed field", casesPanel.includes("Amount Disbursed"));
expect("Pending Loan Amount read-only", casesPanel.includes("Pending Loan Amount"));
expect("Large invoice workspace wired", casesPanel.includes("AccountingDurableInvoiceWorkspace"));

const workspace = read(
  "src/components/catalyst-one/accounting/accounting-durable-invoice-workspace.tsx",
);
expect("Add Digital Signature action", workspace.includes("Add Digital Signature"));
expect("Download PDF action", workspace.includes("Download PDF"));
expect("Send Invoice remains unavailable", workspace.includes("Send Invoice (unavailable)"));
expect("Record Payment / Amount Credited", workspace.includes("Amount Credited"));
expect("No TDS @ rate assumption UI", !workspace.includes("TDS @"));

const pdfRoute = read("src/app/api/accounting-invoices/[invoiceId]/pdf/route.ts");
expect("PDF download route deployed independently", pdfRoute.includes("downloadSignedPdf") || pdfRoute.includes("signedPdfBytes") || pdfRoute.includes("application/pdf"));
expect("No invoice send route in this verifier", !fs.existsSync(path.join(root, "src/app/api/accounting-invoices/[invoiceId]/send/route.ts")) || read("server/services/enterprise-accounting-invoice/enterprise-accounting-invoice.service.ts").includes("INVOICE_SEND_DISABLED"));

const pkg = read("package.json");
expect(
  "verify script registered",
  pkg.includes("verify:co-accounting-invoice-operations-015"),
);

const regulatory = read("src/constants/enterprise-accounting-regulatory-tax/index.ts");
expect("CBIC IGST Act source cited", regulatory.includes("taxinformation.cbic.gov.in"));
expect("IGST s.12 place of supply rule", regulatory.includes("Section 12"));
expect("Intra-state s.8 rule", regulatory.includes("Section 8"));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}`);
}
if (failed.length) {
  console.error(`\nCO-ACCOUNTING-INVOICE-OPERATIONS-015 verify: FAIL (${failed.length})`);
  process.exit(1);
}
console.log("\nCO-ACCOUNTING-INVOICE-OPERATIONS-015 verify: PASS");
console.log("Note: BUILD PASS ≠ PRODUCTION PASS. Run cert framework before production claims.");
