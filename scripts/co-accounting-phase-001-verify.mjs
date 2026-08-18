/**
 * CO-ACCT-001 Phase 1 — Raise Invoice SSOT gate.
 * Engineering assertions + fixture calculations. Does not create customer invoices.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateRaisedInvoiceAmounts } from "../src/lib/enterprise-accounting-invoice/amounts.ts";
import {
  financialYearKeyFromCalendar,
  resolveInvoiceFinancialYearKey,
} from "../src/lib/enterprise-accounting-invoice/financial-year.ts";
import { resolveInvoiceProductPrefix } from "../src/lib/enterprise-accounting-invoice/prefix.ts";
import { invoiceNumberFromParts } from "../src/constants/enterprise-accounting-invoice.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
const expect = (name, condition) => {
  checks.push({ name, ok: Boolean(condition) });
};

const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const schema = read("prisma/schema.prisma");
const raise = read(
  "server/services/enterprise-accounting-invoice/enterprise-accounting-invoice.service.ts",
);
const sequence = read(
  "server/services/enterprise-accounting-invoice/invoice-number.service.ts",
);
const dealSequence = read("server/services/enterprise-deal/deal-number.service.ts");
const invoiceRoute = read("src/app/api/accounting-invoices/route.ts");
const invoiceById = read("src/app/api/accounting-invoices/[invoiceId]/route.ts");
const gstRoute = read("src/app/api/admin/accounting/gst-rates/route.ts");
const confirmation = read(
  "server/services/post-disbursement-confirmation/post-disbursement-confirmation.service.ts",
);
const dealRepo = read("server/repositories/enterprise-deal/enterprise-deal.repository.ts");
const workbench = read(
  "src/components/catalyst-one/accounting/accounting-workbench-views.tsx",
);
const register = read(
  "src/components/catalyst-one/accounting/accounting-invoice-register.tsx",
);
const casesPanel = read(
  "src/components/catalyst-one/accounting/accounting-cases-panel.tsx",
);
const workspace = read(
  "src/components/catalyst-one/accounting/accounting-workspace.tsx",
);
const fy = read("src/lib/enterprise-accounting-invoice/financial-year.ts");
const amounts = read("src/lib/enterprise-accounting-invoice/amounts.ts");

expect("GST Rate Master model exists", schema.includes("model EnterpriseAccountingGstRate "));
expect(
  "Invoice number sequence model exists",
  schema.includes("model EnterpriseAccountingInvoiceNumberSequence "),
);
expect("EnterpriseAccountingInvoice model exists", schema.includes("model EnterpriseAccountingInvoice "));
expect("No writable outstandingAmount on invoice", !schema.includes("outstandingAmount"));
expect("Generic EnterpriseInvoice model is absent", !schema.includes("model EnterpriseInvoice "));
expect(
  "Invoice unique number is organization + invoiceNumber",
  schema.includes("@@unique([organizationId, invoiceNumber]"),
);
expect(
  "Sequence key is org + prefix + FY",
  schema.includes("@@id([organizationId, invoiceProductPrefix, financialYearKey]"),
);
expect(
  "Sequence allocator follows Deal transactional increment pattern",
  sequence.includes("findUnique") &&
    sequence.includes("nextValue: 2") &&
    sequence.includes("nextValue: { increment: 1 }") &&
    dealSequence.includes("nextValue: 2") &&
    dealSequence.includes("nextValue: { increment: 1 }") &&
    !sequence.includes("enterpriseDealNumberSequence"),
);
expect(
  "Raise Invoice API is ADMIN / SUPER_ADMIN gated",
  invoiceRoute.includes("isAccountingInvoiceRaiseRole") &&
    invoiceRoute.includes("POST"),
);
expect(
  "GST Rate Master is Administration-controlled",
  gstRoute.includes("isAccountingInvoiceRaiseRole") && gstRoute.includes("POST"),
);
expect(
  "Raise requires explicit GST rate",
  raise.includes("GST_RATE_REQUIRED") &&
    casesPanel.includes("Select an approved GST rate") &&
    casesPanel.includes('option value="">Select approved GST rate'),
);
expect(
  "Raise requires confirmed taxable amount > 0",
  raise.includes("CONFIRMED_TAXABLE_AMOUNT_INVALID") &&
    raise.includes("taxable <= 0"),
);
expect(
  "Raise requires Invoice Party from Invoice Party Master",
  raise.includes("INVOICE_PARTY_REQUIRED") &&
    raise.includes("enterpriseInvoiceParty.findFirst") &&
    !raise.includes("ecmContact.find"),
);
expect(
  "Unsupported product families are blocked",
  raise.includes("resolveInvoiceProductPrefix") &&
    read("src/constants/enterprise-accounting-invoice.ts").includes('"insurance"'),
);
expect(
  "FY uses OrganizationSettings start month + timezone",
  raise.includes("financialYearStartMonth") &&
    raise.includes("timeZone") &&
    fy.includes("Do not use UTC calendar year"),
);
expect(
  "Invoice Party / GST / TDS snapshots are stored",
  raise.includes("partyBillingName: invoiceParty.billingName") &&
    raise.includes("gstRatePercent: new Prisma.Decimal(amounts.gstRatePercent)") &&
    raise.includes("tdsAmount: new Prisma.Decimal(amounts.tdsAmount)"),
);
expect(
  "EAR records Invoice Raised",
  raise.includes('title: ACCOUNTING_INVOICE_EAR_TITLE') &&
    read("src/constants/enterprise-accounting-invoice.ts").includes('ACCOUNTING_INVOICE_EAR_TITLE = "Invoice Raised"'),
);
expect(
  "Raise locks Accounting Case row version before create",
  raise.includes("enterpriseAccountingCase.updateMany") &&
    raise.includes("ACCOUNTING_CASE_CONFLICT"),
);
expect(
  "One current invoice per Case",
  raise.includes("CURRENT_INVOICE_EXISTS") &&
    raise.includes('documentStatus: { not: ACCOUNTING_INVOICE_DOCUMENT_STATUS.cancelled }'),
);
expect(
  "Confirmation Received does not raise an invoice",
  !confirmation.includes("enterpriseAccountingInvoice.create") &&
    !confirmation.includes("enterpriseAccountingInvoice.upsert"),
);
expect(
  "Disbursed does not raise an invoice",
  !dealRepo.includes("enterpriseAccountingInvoice.create") &&
    !dealRepo.includes("enterpriseAccountingInvoice.upsert"),
);
expect(
  "Invoice immutability: no billed PATCH/PUT/DELETE",
  invoiceById.includes("Phase 1 immutability") &&
    !invoiceById.includes("export async function PATCH") &&
    !invoiceById.includes("export async function PUT") &&
    !invoiceById.includes("export async function DELETE"),
);
expect(
  "Invoice workbench binds durable invoices, not mock persistence",
  workbench.includes("AccountingInvoiceRegister") &&
    workspace.includes("enterpriseAccountingInvoiceClient.list") &&
    workspace.includes("durableInvoices") &&
    register.includes("No invoices have been raised"),
);
expect(
  "Phase 2 invoice actions are unavailable",
  register.includes("Mark Paid, Cancel, PDF, and Share are not available in Phase 1"),
);
expect("TDS null is treated as 0", amounts.includes("input.tdsAmount == null ? 0"));
expect(
  "EFOE is not the invoice SSOT",
  !raise.includes("efoe") && !raise.includes("EFOE") && !raise.includes("EnterpriseDealAccountingLink"),
);

let prefixBlocked = false;
try {
  resolveInvoiceProductPrefix("insurance");
} catch {
  prefixBlocked = true;
}
expect("Fixture: insurance prefix is blocked", prefixBlocked);
expect("Fixture: lending prefix is LN", resolveInvoiceProductPrefix("lending") === "LN");
expect("Fixture: mutual_fund prefix is MF", resolveInvoiceProductPrefix("mutual_fund") === "MF");
expect(
  "Fixture: LN-2026-27-000001 format",
  invoiceNumberFromParts("LN", "2026-27", 1) === "LN-2026-27-000001" &&
    invoiceNumberFromParts("MF", "2026-27", 1) === "MF-2026-27-000001",
);
expect(
  "Fixture: FY April 2026 in Asia/Kolkata is 2026-27",
  financialYearKeyFromCalendar(2026, 4, 4) === "2026-27" &&
    financialYearKeyFromCalendar(2026, 3, 4) === "2025-26" &&
    resolveInvoiceFinancialYearKey({
      at: new Date("2026-08-18T06:30:00.000Z"),
      timeZone: "Asia/Kolkata",
      financialYearStartMonth: 4,
    }) === "2026-27",
);

const withGst = calculateRaisedInvoiceAmounts({
  taxableValue: 10000,
  gstRatePercent: 18,
  tdsAmount: 1000,
});
expect(
  "Fixture: netReceivable = taxable + GST − TDS",
  withGst.gstAmount === 1800 &&
    withGst.invoiceTotal === 11800 &&
    withGst.tdsAmount === 1000 &&
    withGst.netReceivable === 10800,
);

const zeroGst = calculateRaisedInvoiceAmounts({
  taxableValue: 5000,
  gstRatePercent: 0,
  tdsAmount: null,
});
expect(
  "Fixture: explicit 0% GST and null TDS",
  zeroGst.gstAmount === 0 && zeroGst.invoiceTotal === 5000 && zeroGst.tdsAmount === 0 && zeroGst.netReceivable === 5000,
);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}: ${check.name}`);
}
if (checks.some((check) => !check.ok)) process.exit(1);
console.log(`PASS: ${checks.length} Accounting Phase 1 checks`);
