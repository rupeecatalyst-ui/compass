/**
 * CO-ACCT-002 Phase 2 — Payments + derived receivables + Collections.
 * Fixture math only. Does not create customer payments or bank transactions.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertPaymentDoesNotExceedOutstanding,
  deriveInvoiceReceivable,
} from "../src/lib/enterprise-accounting-invoice/receivable.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
const expect = (name, condition) => {
  checks.push({ name, ok: Boolean(condition) });
};
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const schema = read("prisma/schema.prisma");
const paymentService = read(
  "server/services/enterprise-accounting-payment/enterprise-accounting-payment.service.ts",
);
const invoiceService = read(
  "server/services/enterprise-accounting-invoice/enterprise-accounting-invoice.service.ts",
);
const collections = read(
  "src/components/catalyst-one/accounting/accounting-collections-register.tsx",
);
const invoiceRegister = read(
  "src/components/catalyst-one/accounting/accounting-invoice-register.tsx",
);
const workspace = read(
  "src/components/catalyst-one/accounting/accounting-workspace.tsx",
);
const receivable = read("src/lib/enterprise-accounting-invoice/receivable.ts");
const paymentRoute = read("src/app/api/accounting-payments/route.ts");
const voidRoute = read("src/app/api/accounting-payments/[paymentId]/void/route.ts");
const constants = read("src/constants/enterprise-accounting-payment.ts");

expect("Payment model exists", schema.includes("model EnterpriseAccountingPayment "));
expect("Invoice remains billed SSOT", schema.includes("model EnterpriseAccountingInvoice "));
expect(
  "Payment is linked to Invoice",
  schema.includes("invoiceId") &&
    schema.includes("invoice        EnterpriseAccountingInvoice"),
);
expect("No EnterpriseReceivable model", !schema.includes("model EnterpriseReceivable"));
expect("No Payout model", !schema.includes("model EnterpriseAccountingPayout") && !schema.includes("model EnterprisePayout "));
expect("No writable outstandingAmount on invoice", !schema.includes("outstandingAmount"));
expect(
  "Receivable is derived, not stored",
  receivable.includes("outstanding = netReceivable − SUM(posted payments)") &&
    receivable.includes("deriveInvoiceReceivable"),
);
expect(
  "Only POSTED payments affect outstanding",
  paymentService.includes("ACCOUNTING_PAYMENT_STATUS.posted") &&
    invoiceService.includes("p.status === ACCOUNTING_PAYMENT_STATUS.posted"),
);
expect(
  "VOIDED payments do not affect outstanding",
  constants.includes('voided: "voided"') &&
    paymentService.includes("ACCOUNTING_PAYMENT_STATUS.voided"),
);
expect(
  "Payment > outstanding is blocked",
  paymentService.includes("assertPaymentDoesNotExceedOutstanding") &&
    receivable.includes("PAYMENT_EXCEEDS_OUTSTANDING"),
);
expect(
  "Posted payment does not modify Invoice billed values",
  paymentService.includes("rowVersion: { increment: 1 }") &&
    /data:\s*\{\s*rowVersion:\s*\{\s*increment:\s*1\s*\}/.test(paymentService) &&
    !paymentService.includes("taxableValue") &&
    !paymentService.includes("gstAmount"),
);
expect(
  "Collections reads Invoice + Payment",
  collections.includes("Derived outstanding from Invoice net receivable minus posted payments") &&
    workspace.includes("AccountingCollectionsWorkbench") &&
    workspace.includes("durableInvoices"),
);
expect(
  "Payment Posted creates EAR",
  paymentService.includes("ACCOUNTING_PAYMENT_POSTED_EAR_TITLE") &&
    constants.includes('ACCOUNTING_PAYMENT_POSTED_EAR_TITLE = "Payment Posted"'),
);
expect(
  "Payment Voided creates EAR",
  paymentService.includes("ACCOUNTING_PAYMENT_VOIDED_EAR_TITLE") &&
    constants.includes('ACCOUNTING_PAYMENT_VOIDED_EAR_TITLE = "Payment Voided"') &&
    voidRoute.includes("enterpriseAccountingPaymentService.void"),
);
expect(
  "Post Payment is ADMIN / SUPER_ADMIN gated",
  paymentRoute.includes("isAccountingPaymentRole"),
);
expect(
  "Invoice workbench posts payments without Mark Paid fake status",
  invoiceRegister.includes("Post Payment") &&
    invoiceRegister.includes("Mark Paid, Cancel, PDF, and Share are not available in Phase 1"),
);
expect(
  "No EFOE dependency",
  !paymentService.includes("EFOE") &&
    !paymentService.includes("efoe") &&
    !paymentService.includes("EnterpriseDealAccountingLink"),
);

const p1 = deriveInvoiceReceivable({
  invoiceTotal: 11800,
  netReceivable: 10800,
  postedPaymentAmounts: [5000],
});
expect(
  "Fixture: Payment 1 POSTED → PARTIALLY_PAID outstanding 5800",
  p1.amountReceived === 5000 && p1.outstanding === 5800 && p1.paymentStatus === "PARTIALLY_PAID" && p1.netReceivable === 10800,
);

const p2 = deriveInvoiceReceivable({
  invoiceTotal: 11800,
  netReceivable: 10800,
  postedPaymentAmounts: [5000, 5800],
});
expect(
  "Fixture: Payment 2 POSTED → PAID outstanding 0",
  p2.amountReceived === 10800 && p2.outstanding === 0 && p2.paymentStatus === "PAID" && p2.netReceivable === 10800,
);

const voidP1Only = deriveInvoiceReceivable({
  invoiceTotal: 11800,
  netReceivable: 10800,
  postedPaymentAmounts: [],
});
expect(
  "Fixture: void all posted payments → outstanding 10800 UNPAID",
  voidP1Only.outstanding === 10800 &&
    voidP1Only.amountReceived === 0 &&
    voidP1Only.paymentStatus === "UNPAID" &&
    voidP1Only.netReceivable === 10800,
);

const voidedIgnored = deriveInvoiceReceivable({
  invoiceTotal: 11800,
  netReceivable: 10800,
  postedPaymentAmounts: [5800],
});
expect(
  "Fixture: void Payment 1 while Payment 2 remains posted → outstanding 5000",
  voidedIgnored.outstanding === 5000 && voidedIgnored.paymentStatus === "PARTIALLY_PAID",
);

let overpayBlocked = false;
try {
  assertPaymentDoesNotExceedOutstanding(6000, 5800);
} catch (err) {
  overpayBlocked = err instanceof Error && err.message.includes("exceeds outstanding");
}
expect("Fixture: overpayment 6000 vs outstanding 5800 is BLOCKED", overpayBlocked);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}: ${check.name}`);
}
if (checks.some((check) => !check.ok)) process.exit(1);
console.log(`PASS: ${checks.length} Accounting Phase 2 checks`);
