/**
 * CO-ACCT-004 Phase 4 — Credit Notes as receivable adjustments.
 * Does not mutate Invoice billed values. Does not create a writable receivable.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertCreditNoteDoesNotExceedCapacity,
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
const receivable = read("src/lib/enterprise-accounting-invoice/receivable.ts");
const cnService = read(
  "server/services/enterprise-accounting-invoice/enterprise-accounting-credit-note.service.ts",
);
const cnNumber = read(
  "server/services/enterprise-accounting-invoice/credit-note-number.service.ts",
);
const paymentService = read(
  "server/services/enterprise-accounting-payment/enterprise-accounting-payment.service.ts",
);
const invoiceService = read(
  "server/services/enterprise-accounting-invoice/enterprise-accounting-invoice.service.ts",
);
const invoiceRegister = read(
  "src/components/catalyst-one/accounting/accounting-invoice-register.tsx",
);
const collections = read(
  "src/components/catalyst-one/accounting/accounting-collections-register.tsx",
);
const cnRoute = read("src/app/api/accounting-credit-notes/route.ts");
const cnConstants = read("src/constants/enterprise-accounting-credit-note.ts");

expect("Credit Note model exists", schema.includes("model EnterpriseAccountingCreditNote "));
expect(
  "Separate Credit Note numbering sequence",
  schema.includes("model EnterpriseAccountingCreditNoteNumberSequence") &&
    cnNumber.includes("enterpriseAccountingCreditNoteNumberSequence") &&
    !cnNumber.includes("EnterpriseAccountingInvoiceNumberSequence"),
);
expect(
  "Credit Note number format CN-FY-sequence",
  cnConstants.includes('ACCOUNTING_CREDIT_NOTE_PREFIX = "CN"') &&
    cnConstants.includes("creditNoteNumberFromParts"),
);
expect("No second invoice model", (schema.match(/model EnterpriseAccountingInvoice /g) || []).length === 1);
expect("No writable receivable ledger", !schema.includes("model EnterpriseReceivable"));
expect("No payout ledger", !schema.includes("model EnterpriseAccountingPayout"));
expect(
  "Derived outstanding includes credit notes",
  receivable.includes("outstanding = netReceivable − SUM(posted payments) − SUM(posted credit-note impact)"),
);
expect(
  "Credit Note locks invoice rowVersion only",
  /enterpriseAccountingInvoice\.updateMany[\s\S]*?data:\s*\{\s*rowVersion:\s*\{\s*increment:\s*1\s*\}/.test(
    cnService,
  ) &&
    !cnService.includes("taxableValue: new") &&
    !cnService.includes("netReceivable: new") &&
    !cnService.includes("invoiceTotal: new"),
);
expect(
  "Cancelled invoice cannot receive credit note",
  cnService.includes("INVOICE_CANCELLED") && cnService.includes("cancelled invoice"),
);
expect(
  "Cancelled invoice cannot receive payment",
  paymentService.includes("INVOICE_CANCELLED"),
);
expect(
  "Payment outstanding check includes credit notes",
  paymentService.includes("postedCreditNoteAmounts"),
);
expect(
  "Invoice serialize includes credit notes",
  invoiceService.includes("creditNotes") && invoiceService.includes("postedCreditNoteAmounts"),
);
expect(
  "EAR Credit Note Created",
  cnConstants.includes('ACCOUNTING_CREDIT_NOTE_EAR_TITLE = "Credit Note Created"') &&
    cnService.includes("ACCOUNTING_CREDIT_NOTE_EAR_TITLE"),
);
expect("Issue Credit Note is ADMIN gated", cnRoute.includes("isAccountingCreditNoteRole"));
expect(
  "Invoice workbench shows credit notes and outstanding",
  invoiceRegister.includes("Issue Credit Note") &&
    invoiceRegister.includes("Credit notes") &&
    invoiceRegister.includes("Invoice total"),
);
expect(
  "Collections include credit notes",
  collections.includes("Credit notes") && collections.includes("inv.creditNoteAmount"),
);
expect("GST uses invoice snapshot, not a tax engine", cnService.includes("splitCreditNoteFromInvoiceGst") && cnService.includes("invoice.gstRatePercent.toNumber()"));

const fixture = deriveInvoiceReceivable({
  invoiceTotal: 11800,
  netReceivable: 10800,
  postedPaymentAmounts: [5000],
  postedCreditNoteAmounts: [1800],
});
expect(
  "Fixture: payment 5000 + credit note 1800 → outstanding 4000",
  fixture.amountReceived === 5000 &&
    fixture.creditNoteAmount === 1800 &&
    fixture.outstanding === 4000 &&
    fixture.netReceivable === 10800 &&
    fixture.paymentStatus === "PARTIALLY_PAID",
);

const afterVoid = deriveInvoiceReceivable({
  invoiceTotal: 11800,
  netReceivable: 10800,
  postedPaymentAmounts: [],
  postedCreditNoteAmounts: [1800],
});
expect(
  "Fixture: void ₹5,000 payment → received 0, outstanding 9000, credit note remains 1800",
  afterVoid.amountReceived === 0 &&
    afterVoid.creditNoteAmount === 1800 &&
    afterVoid.outstanding === 9000 &&
    afterVoid.netReceivable === 10800,
);

let overCreditBlocked = false;
try {
  assertCreditNoteDoesNotExceedCapacity({
    creditNoteAmount: 6000,
    outstanding: 4000,
    netReceivable: 10800,
    postedCreditNoteAmount: 1800,
  });
} catch (err) {
  overCreditBlocked = err instanceof Error && err.message.includes("exceeds remaining outstanding");
}
expect("Over-crediting is blocked", overCreditBlocked);

let overNetBlocked = false;
try {
  assertCreditNoteDoesNotExceedCapacity({
    creditNoteAmount: 1,
    outstanding: 1,
    netReceivable: 10800,
    postedCreditNoteAmount: 10800,
  });
} catch (err) {
  overNetBlocked = err instanceof Error && err.message.includes("cannot exceed invoice net receivable");
}
expect("Total credit notes cannot exceed net receivable", overNetBlocked);

let overpayBlocked = false;
try {
  assertPaymentDoesNotExceedOutstanding(6000, 4000);
} catch (err) {
  overpayBlocked = err instanceof Error && err.message.includes("exceeds outstanding");
}
expect("Overpayment remains blocked", overpayBlocked);

let paidInvoiceBlocked = false;
try {
  assertCreditNoteDoesNotExceedCapacity({
    creditNoteAmount: 100,
    outstanding: 0,
    netReceivable: 10800,
    postedCreditNoteAmount: 0,
  });
} catch (err) {
  paidInvoiceBlocked =
    err instanceof Error && err.message.includes("outstanding is already zero");
}
expect("Fully paid invoice cannot become a negative receivable", paidInvoiceBlocked);

let negativeBlocked = false;
try {
  deriveInvoiceReceivable({
    invoiceTotal: 11800,
    netReceivable: 10800,
    postedPaymentAmounts: [10800],
    postedCreditNoteAmounts: [1800],
  });
} catch (err) {
  negativeBlocked = err instanceof Error && err.message.includes("cannot be negative");
}
expect("Derived outstanding cannot go negative", negativeBlocked);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}: ${check.name}`);
}
if (checks.some((check) => !check.ok)) process.exit(1);
console.log(`PASS: ${checks.length} Accounting Phase 4 checks`);
