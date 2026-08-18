import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  ACCOUNTING_CASE_ELIGIBLE_STAGE,
  ACCOUNTING_CASE_ELIGIBLE_SUB_STAGE,
  ACCOUNTING_INVOICE_DOCUMENT_STATUS,
  ACCOUNTING_INVOICE_EAR_TITLE,
  ACCOUNTING_INVOICE_SOURCE,
  invoiceRaisedEventId,
} from "@/constants/enterprise-accounting-invoice";
import { calculateRaisedInvoiceAmounts } from "@/lib/enterprise-accounting-invoice/amounts";
import {
  calendarDateToUtcNoon,
  parseIsoDateOnly,
  resolveInvoiceFinancialYearKey,
  todayIsoDateInTimeZone,
} from "@/lib/enterprise-accounting-invoice/financial-year";
import { resolveInvoiceProductPrefix } from "@/lib/enterprise-accounting-invoice/prefix";
import type {
  EnterpriseAccountingInvoiceDto,
  RaiseEnterpriseAccountingInvoiceInput,
} from "@/types/enterprise-accounting-invoice";
import type {
  DerivedAccountingPaymentSummary,
  EnterpriseAccountingPaymentDto,
} from "@/types/enterprise-accounting-payment";
import { ACCOUNTING_CREDIT_NOTE_STATUS } from "@/constants/enterprise-accounting-credit-note";
import { ACCOUNTING_PAYMENT_STATUS } from "@/constants/enterprise-accounting-payment";
import { deriveInvoiceReceivable } from "@/lib/enterprise-accounting-invoice/receivable";
import type { EnterpriseAccountingCreditNoteDto } from "@/types/enterprise-accounting-credit-note";
import { serializeCreditNote } from "./enterprise-accounting-credit-note.service";
import { allocateAccountingInvoiceNumberInTransaction } from "./invoice-number.service";

function moneyNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return value.toNumber();
}

function isoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function serializePayment(row: {
  id: string;
  organizationId: string;
  invoiceId: string;
  accountingCaseId: string;
  dealId: string;
  opportunityId: string | null;
  paymentDate: Date;
  amount: Prisma.Decimal;
  paymentReference: string;
  paymentMode: string;
  status: string;
  receivedBy: string;
  receivedAt: Date;
  notes: string | null;
  voidedAt: Date | null;
  voidedBy: string | null;
  voidReason: string | null;
  rowVersion: number;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseAccountingPaymentDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    invoiceId: row.invoiceId,
    accountingCaseId: row.accountingCaseId,
    dealId: row.dealId,
    opportunityId: row.opportunityId,
    paymentDate: row.paymentDate.toISOString(),
    amount: row.amount.toNumber(),
    paymentReference: row.paymentReference,
    paymentMode: row.paymentMode,
    status: row.status,
    receivedBy: row.receivedBy,
    receivedAt: row.receivedAt.toISOString(),
    notes: row.notes,
    voidedAt: isoDate(row.voidedAt),
    voidedBy: row.voidedBy,
    voidReason: row.voidReason,
    rowVersion: row.rowVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const invoiceInclude = {
  deal: { select: { dealNumber: true, primaryContactName: true } },
  payments: { orderBy: { receivedAt: "asc" as const } },
  creditNotes: { orderBy: { issuedAt: "asc" as const } },
} satisfies Prisma.EnterpriseAccountingInvoiceInclude;

function serialize(
  row: Prisma.EnterpriseAccountingInvoiceGetPayload<{ include: typeof invoiceInclude }>,
): EnterpriseAccountingInvoiceDto {
  const payments = row.payments.map(serializePayment);
  const creditNotes: EnterpriseAccountingCreditNoteDto[] = row.creditNotes.map(serializeCreditNote);
  const derived = deriveInvoiceReceivable({
    invoiceTotal: row.invoiceTotal.toNumber(),
    netReceivable: row.netReceivable.toNumber(),
    postedPaymentAmounts: payments
      .filter((p) => p.status === ACCOUNTING_PAYMENT_STATUS.posted)
      .map((p) => p.amount),
    postedCreditNoteAmounts: creditNotes
      .filter((n) => n.status === ACCOUNTING_CREDIT_NOTE_STATUS.posted)
      .map((n) => n.creditNoteAmount),
  });
  return {
    id: row.id,
    organizationId: row.organizationId,
    accountingCaseId: row.accountingCaseId,
    dealId: row.dealId,
    opportunityId: row.opportunityId,
    invoicePartyId: row.invoicePartyId,
    gstRateId: row.gstRateId,
    productId: row.productId,
    productCode: row.productCode,
    productLabel: row.productLabel,
    productFamily: row.productFamily,
    invoiceProductPrefix: row.invoiceProductPrefix,
    financialYearKey: row.financialYearKey,
    sequenceNumber: row.sequenceNumber,
    invoiceNumber: row.invoiceNumber,
    invoiceDate: row.invoiceDate.toISOString(),
    dueDate: isoDate(row.dueDate),
    confirmationReference: row.confirmationReference,
    partyBillingName: row.partyBillingName,
    partyGstin: row.partyGstin,
    partyPan: row.partyPan,
    partyBillingAddress: row.partyBillingAddress,
    partyStateLabel: row.partyStateLabel,
    partyGstStatus: row.partyGstStatus,
    partyTdsApplicable: row.partyTdsApplicable,
    partyTdsRatePercent: row.partyTdsRatePercent,
    partyDisplayName: row.partyDisplayName,
    taxableValue: row.taxableValue.toNumber(),
    gstRatePercent: row.gstRatePercent.toNumber(),
    gstAmount: row.gstAmount.toNumber(),
    invoiceTotal: row.invoiceTotal.toNumber(),
    tdsRatePercent: row.tdsRatePercent?.toNumber() ?? null,
    tdsAmount: row.tdsAmount.toNumber(),
    netReceivable: row.netReceivable.toNumber(),
    amountReceived: derived.amountReceived,
    creditNoteAmount: derived.creditNoteAmount,
    outstanding: derived.outstanding,
    paymentStatus: derived.paymentStatus,
    documentStatus: row.documentStatus,
    raisedBy: row.raisedBy,
    raisedAt: row.raisedAt.toISOString(),
    cancelledAt: isoDate(row.cancelledAt),
    cancelledBy: row.cancelledBy,
    cancellationReason: row.cancellationReason,
    rowVersion: row.rowVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    dealNumber: row.deal.dealNumber,
    customerName: row.deal.primaryContactName,
    payments,
    creditNotes,
  };
}

function emptyPaymentSummary(): DerivedAccountingPaymentSummary {
  return {
    totalInvoiced: 0,
    totalReceived: 0,
    creditNotesTotal: 0,
    outstanding: 0,
    invoicesRaised: 0,
    paidCount: 0,
    partiallyPaidCount: 0,
    unpaidCount: 0,
    todaysCollections: 0,
  };
}

function summarizeInvoices(
  items: EnterpriseAccountingInvoiceDto[],
  todayIso: string,
): DerivedAccountingPaymentSummary {
  const summary = emptyPaymentSummary();
  for (const inv of items) {
    if (inv.documentStatus === ACCOUNTING_INVOICE_DOCUMENT_STATUS.cancelled) continue;
    summary.invoicesRaised += 1;
    summary.totalInvoiced += inv.netReceivable;
    summary.totalReceived += inv.amountReceived;
    summary.creditNotesTotal += inv.creditNoteAmount;
    summary.outstanding += inv.outstanding;
    if (inv.paymentStatus === "PAID") summary.paidCount += 1;
    else if (inv.paymentStatus === "PARTIALLY_PAID") summary.partiallyPaidCount += 1;
    else summary.unpaidCount += 1;
    for (const payment of inv.payments) {
      if (payment.status === ACCOUNTING_PAYMENT_STATUS.posted && payment.paymentDate.slice(0, 10) === todayIso) {
        summary.todaysCollections += payment.amount;
      }
    }
  }
  return {
    ...summary,
    totalInvoiced: Number(summary.totalInvoiced.toFixed(2)),
    totalReceived: Number(summary.totalReceived.toFixed(2)),
    creditNotesTotal: Number(summary.creditNotesTotal.toFixed(2)),
    outstanding: Number(summary.outstanding.toFixed(2)),
    todaysCollections: Number(summary.todaysCollections.toFixed(2)),
  };
}

function gstRateAppliesOn(rate: {
  enabled: boolean;
  isDeleted: boolean;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
}, invoiceDate: Date): boolean {
  if (!rate.enabled || rate.isDeleted) return false;
  if (rate.effectiveFrom && invoiceDate < rate.effectiveFrom) return false;
  if (rate.effectiveUntil && invoiceDate > rate.effectiveUntil) return false;
  return true;
}

export class EnterpriseAccountingInvoiceService {
  async list() {
    const organizationId = await resolvePilotOrganizationId();
    const settings = await prisma.organizationWorkspaceSettings.findUnique({
      where: { organizationId },
    });
    const timeZone = settings?.timeZone?.trim() || "Asia/Kolkata";
    const rows = await prisma.enterpriseAccountingInvoice.findMany({
      where: { organizationId },
      include: invoiceInclude,
      orderBy: { invoiceDate: "desc" },
      take: 200,
    });
    const items = rows.map(serialize);
    return { items, summary: summarizeInvoices(items, todayIsoDateInTimeZone(timeZone)) };
  }

  async get(invoiceId: string) {
    const organizationId = await resolvePilotOrganizationId();
    const row = await prisma.enterpriseAccountingInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: invoiceInclude,
    });
    if (!row) {
      throw Object.assign(new Error("Invoice not found"), {
        statusCode: 404,
        code: "ACCOUNTING_INVOICE_NOT_FOUND",
      });
    }
    return serialize(row);
  }

  async raise(input: RaiseEnterpriseAccountingInvoiceInput, actorUserId: string) {
    if (!input.gstRateId?.trim()) {
      throw Object.assign(new Error("An approved GST rate must be explicitly selected"), {
        statusCode: 400,
        code: "GST_RATE_REQUIRED",
      });
    }
    if (!Number.isInteger(input.rowVersion) || input.rowVersion < 1) {
      throw Object.assign(new Error("rowVersion must be a positive integer"), {
        statusCode: 400,
        code: "INVALID_ROW_VERSION",
      });
    }

    const organizationId = await resolvePilotOrganizationId();
    const settings = await prisma.organizationWorkspaceSettings.findUnique({
      where: { organizationId },
    });
    const timeZone = settings?.timeZone?.trim() || "Asia/Kolkata";
    const fyStartMonth = settings?.financialYearStartMonth ?? 4;

    const invoiceDateIso =
      input.invoiceDate?.trim() || todayIsoDateInTimeZone(timeZone);
    const invoiceCal = parseIsoDateOnly(invoiceDateIso);
    const invoiceDate = calendarDateToUtcNoon(invoiceCal.year, invoiceCal.month, invoiceCal.day);
    let dueDate: Date | null = null;
    if (input.dueDate !== undefined && input.dueDate !== null && input.dueDate !== "") {
      const dueCal = parseIsoDateOnly(input.dueDate);
      dueDate = calendarDateToUtcNoon(dueCal.year, dueCal.month, dueCal.day);
    }

    return prisma.$transaction(async (tx) => {
      const lock = await tx.enterpriseAccountingCase.updateMany({
        where: {
          id: input.accountingCaseId,
          organizationId,
          rowVersion: input.rowVersion,
        },
        data: {
          rowVersion: { increment: 1 },
          updatedBy: actorUserId,
        },
      });
      if (lock.count !== 1) {
        throw Object.assign(new Error("Accounting Case changed; reload and retry"), {
          statusCode: 409,
          code: "ACCOUNTING_CASE_CONFLICT",
        });
      }

      const accountingCase = await tx.enterpriseAccountingCase.findFirst({
        where: { id: input.accountingCaseId, organizationId },
      });
      if (!accountingCase) {
        throw Object.assign(new Error("Accounting Case not found"), {
          statusCode: 404,
          code: "ACCOUNTING_CASE_NOT_FOUND",
        });
      }

      const deal = await tx.enterpriseDeal.findFirst({
        where: { id: accountingCase.dealId, organizationId, isDeleted: false },
      });
      if (!deal) {
        throw Object.assign(new Error("Deal not found"), {
          statusCode: 404,
          code: "DEAL_NOT_FOUND",
        });
      }
      if (
        deal.grossStage !== ACCOUNTING_CASE_ELIGIBLE_STAGE ||
        deal.subStage !== ACCOUNTING_CASE_ELIGIBLE_SUB_STAGE
      ) {
        throw Object.assign(
          new Error("Raise Invoice requires Confirmation Received on the Deal"),
          { statusCode: 409, code: "CONFIRMATION_NOT_RECEIVED" },
        );
      }

      const taxable = moneyNumber(accountingCase.confirmedInvoiceAmount);
      if (taxable == null || taxable <= 0) {
        throw Object.assign(
          new Error(
            "Raise Invoice is blocked: confirmedInvoiceAmount must be a confirmed taxable value greater than 0. Historical or ambiguous amounts are not converted.",
          ),
          { statusCode: 409, code: "CONFIRMED_TAXABLE_AMOUNT_INVALID" },
        );
      }

      if (!deal.invoicePartyId) {
        throw Object.assign(
          new Error(
            "This Deal does not have an Invoice Party assigned. Select an Invoice Party from the Accounting Master before Raise Invoice.",
          ),
          { statusCode: 409, code: "INVOICE_PARTY_REQUIRED" },
        );
      }
      const invoiceParty = await tx.enterpriseInvoiceParty.findFirst({
        where: {
          id: deal.invoicePartyId,
          organizationId,
          isDeleted: false,
        },
      });
      if (!invoiceParty || !invoiceParty.enabled) {
        throw Object.assign(
          new Error("Invoice Party must exist and be active in Invoice Party Master"),
          { statusCode: 409, code: "INVOICE_PARTY_INACTIVE" },
        );
      }

      const prefix = resolveInvoiceProductPrefix(String(deal.productFamily));
      const gstRate = await tx.enterpriseAccountingGstRate.findFirst({
        where: { id: input.gstRateId.trim(), organizationId, isDeleted: false },
      });
      if (!gstRate || !gstRateAppliesOn(gstRate, invoiceDate)) {
        throw Object.assign(
          new Error("Select an approved active GST rate effective on the invoice date"),
          { statusCode: 409, code: "GST_RATE_NOT_SELECTABLE" },
        );
      }

      const tdsInput =
        input.tdsAmount !== undefined
          ? input.tdsAmount
          : moneyNumber(accountingCase.tdsAmount);
      let amounts;
      try {
        amounts = calculateRaisedInvoiceAmounts({
          taxableValue: taxable,
          gstRatePercent: gstRate.ratePercent.toNumber(),
          tdsAmount: tdsInput,
        });
      } catch (err) {
        throw Object.assign(new Error(err instanceof Error ? err.message : "Invalid invoice amounts"), {
          statusCode: 400,
          code: "INVALID_INVOICE_AMOUNTS",
        });
      }

      const existingCurrent = await tx.enterpriseAccountingInvoice.findFirst({
        where: {
          accountingCaseId: accountingCase.id,
          documentStatus: { not: ACCOUNTING_INVOICE_DOCUMENT_STATUS.cancelled },
        },
        select: { id: true, invoiceNumber: true },
      });
      if (existingCurrent) {
        throw Object.assign(
          new Error(
            `A current invoice already exists for this Accounting Case (${existingCurrent.invoiceNumber}). Raise Invoice does not create a second current invoice.`,
          ),
          { statusCode: 409, code: "CURRENT_INVOICE_EXISTS" },
        );
      }

      const financialYearKey = resolveInvoiceFinancialYearKey({
        at: invoiceDate,
        timeZone,
        financialYearStartMonth: fyStartMonth,
      });
      const allocated = await allocateAccountingInvoiceNumberInTransaction(tx, {
        organizationId,
        invoiceProductPrefix: prefix,
        financialYearKey,
      });

      const now = new Date();
      const confirmationReference = `${accountingCase.id}:${accountingCase.confirmedAt.toISOString()}:${accountingCase.confirmationSource}`;

      const created = await tx.enterpriseAccountingInvoice.create({
        data: {
          organizationId,
          accountingCaseId: accountingCase.id,
          dealId: deal.id,
          opportunityId: deal.opportunityId,
          invoicePartyId: invoiceParty.id,
          gstRateId: gstRate.id,
          productId: deal.productId,
          productCode: deal.productCode,
          productLabel: deal.productLabel,
          productFamily: String(deal.productFamily),
          invoiceProductPrefix: prefix,
          financialYearKey,
          sequenceNumber: allocated.sequenceNumber,
          invoiceNumber: allocated.invoiceNumber,
          invoiceDate,
          dueDate,
          confirmationReference,
          partyBillingName: invoiceParty.billingName,
          partyGstin: invoiceParty.gstin,
          partyPan: invoiceParty.pan,
          partyBillingAddress: invoiceParty.billingAddress,
          partyStateLabel: invoiceParty.stateLabel,
          partyGstStatus: invoiceParty.gstStatus,
          partyTdsApplicable: invoiceParty.tdsApplicable,
          partyTdsRatePercent: invoiceParty.tdsRatePercent,
          partyDisplayName: invoiceParty.displayName,
          taxableValue: new Prisma.Decimal(amounts.taxableValue),
          gstRatePercent: new Prisma.Decimal(amounts.gstRatePercent),
          gstAmount: new Prisma.Decimal(amounts.gstAmount),
          invoiceTotal: new Prisma.Decimal(amounts.invoiceTotal),
          tdsRatePercent:
            invoiceParty.tdsRatePercent == null
              ? null
              : new Prisma.Decimal(invoiceParty.tdsRatePercent),
          tdsAmount: new Prisma.Decimal(amounts.tdsAmount),
          netReceivable: new Prisma.Decimal(amounts.netReceivable),
          documentStatus: ACCOUNTING_INVOICE_DOCUMENT_STATUS.raised,
          raisedBy: actorUserId,
          raisedAt: now,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
        include: invoiceInclude,
      });

      await tx.enterpriseActivityEvent.upsert({
        where: {
          organizationId_sourceSystem_sourceEventId: {
            organizationId,
            sourceSystem: ACCOUNTING_INVOICE_SOURCE,
            sourceEventId: invoiceRaisedEventId(created.id),
          },
        },
        create: {
          organizationId,
          eventKind: "accounting",
          sourceSystem: ACCOUNTING_INVOICE_SOURCE,
          sourceEventId: invoiceRaisedEventId(created.id),
          title: ACCOUNTING_INVOICE_EAR_TITLE,
          summary: `Invoice ${created.invoiceNumber} raised for Deal ${deal.dealNumber}`,
          payload: {
            invoiceId: created.id,
            invoiceNumber: created.invoiceNumber,
            accountingCaseId: accountingCase.id,
            dealId: deal.id,
            netReceivable: amounts.netReceivable,
          },
          opportunityId: deal.opportunityId,
          dealId: deal.id,
          contactId: deal.primaryContactId,
          actorUserId,
          occurredAt: now,
        },
        update: {},
      });

      return serialize(created);
    });
  }
}

export const enterpriseAccountingInvoiceService = new EnterpriseAccountingInvoiceService();
