/**
 * CO-ACCT-003 Phase 3 — Inbound Payout View (derived commission receipts).
 * Does not create a payout ledger or outbound payment workflow.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveInvoiceReceivable,
  inboundPayoutView,
} from "../src/lib/enterprise-accounting-invoice/receivable.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
const expect = (name, condition) => {
  checks.push({ name, ok: Boolean(condition) });
};
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const schema = read("prisma/schema.prisma");
const receivable = read("src/lib/enterprise-accounting-invoice/receivable.ts");
const payoutView = read(
  "src/components/catalyst-one/accounting/accounting-workbench-views.tsx",
);
const inboundRegister = read(
  "src/components/catalyst-one/accounting/accounting-inbound-receipts-register.tsx",
);
const workspace = read("src/components/catalyst-one/accounting/accounting-workspace.tsx");
const dashboard = payoutView;
const invoiceService = read(
  "server/services/enterprise-accounting-invoice/enterprise-accounting-invoice.service.ts",
);

expect("No independent payout ledger", !schema.includes("model EnterpriseAccountingPayout") && !schema.includes("model EnterprisePayout "));
expect("No writable Receivable amount", !schema.includes("model EnterpriseReceivable") && !schema.includes("outstandingAmount"));
expect("Payout view reuses deriveInvoiceReceivable", receivable.includes("inboundPayoutView") && inboundRegister.includes("inboundPayoutView"));
expect(
  "Payout Workbench reads durable invoices",
  workspace.includes("<AccountingPayoutWorkbench") &&
    workspace.includes("invoices={durableInvoices}") &&
    payoutView.includes("Inbound Commission Receipts"),
);
expect(
  "Terminology is inbound receipts, not RM/WP payouts",
  payoutView.includes("not RM / Wealth Partner payouts") &&
    inboundRegister.includes("Inbound Commission Receipts") &&
    inboundRegister.includes("not RM / Wealth Partner payouts"),
);
expect(
  "Inbound row shows expected / received / pending fields",
  inboundRegister.includes("Expected / Net Receivable") &&
    inboundRegister.includes("Invoice Party / Commission Payer") &&
    inboundRegister.includes("Invoice Total") &&
    inboundRegister.includes("TDS"),
);
expect(
  "Payout workbench cannot edit invoice amounts",
  !inboundRegister.includes("Post Payment") &&
    !payoutView.includes("payoutAmount") &&
    !invoiceService.includes("payoutAmount"),
);
expect(
  "Dashboard inbound KPIs use Invoice + Payment summary",
  workspace.includes("expectedPayouts: paymentSummary?.totalInvoiced") &&
    dashboard.includes("Expected inbound receipts") &&
    dashboard.includes("Open inbound receipt lines"),
);

const unpaid = inboundPayoutView(
  deriveInvoiceReceivable({
    invoiceTotal: 11800,
    netReceivable: 10800,
    postedPaymentAmounts: [],
  }),
);
expect(
  "Fixture: unpaid invoice",
  unpaid.expected === 10800 &&
    unpaid.received === 0 &&
    unpaid.pending === 10800 &&
    unpaid.status === "UNPAID",
);

const partial = inboundPayoutView(
  deriveInvoiceReceivable({
    invoiceTotal: 11800,
    netReceivable: 10800,
    postedPaymentAmounts: [5000],
  }),
);
expect(
  "Fixture: partial payment",
  partial.expected === 10800 &&
    partial.received === 5000 &&
    partial.pending === 5800 &&
    partial.status === "PARTIAL",
);

const paid = inboundPayoutView(
  deriveInvoiceReceivable({
    invoiceTotal: 11800,
    netReceivable: 10800,
    postedPaymentAmounts: [10800],
  }),
);
expect(
  "Fixture: fully paid invoice",
  paid.expected === 10800 && paid.received === 10800 && paid.pending === 0 && paid.status === "PAID",
);

const voided = inboundPayoutView(
  deriveInvoiceReceivable({
    invoiceTotal: 11800,
    netReceivable: 10800,
    postedPaymentAmounts: [],
  }),
);
expect(
  "Fixture: voided payment does not count",
  voided.received === 0 && voided.pending === 10800 && voided.status === "UNPAID",
);

expect("Expected = Invoice.netReceivable", unpaid.expected === 10800);
expect("Received = posted payments only", partial.received === 5000 && voided.received === 0);
expect("Pending = expected - received (no credit notes)", partial.pending === partial.expected - partial.received);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}: ${check.name}`);
}
if (checks.some((check) => !check.ok)) process.exit(1);
console.log(`PASS: ${checks.length} Accounting Phase 3 checks`);
