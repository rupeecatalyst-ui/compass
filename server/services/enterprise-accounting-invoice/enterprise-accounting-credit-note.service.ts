import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  ACCOUNTING_CREDIT_NOTE_EAR_TITLE,
  ACCOUNTING_CREDIT_NOTE_SOURCE,
  ACCOUNTING_CREDIT_NOTE_STATUS,
  creditNoteCreatedEventId,
} from "@/constants/enterprise-accounting-credit-note";
import { ACCOUNTING_INVOICE_PAYMENT_ELIGIBLE_STATUS } from "@/constants/enterprise-accounting-payment";
import { ACCOUNTING_PAYMENT_STATUS } from "@/constants/enterprise-accounting-payment";
import { roundMoney2 } from "@/lib/enterprise-accounting-invoice/amounts";
import {
  calendarDateToUtcNoon,
  parseIsoDateOnly,
  resolveInvoiceFinancialYearKey,
} from "@/lib/enterprise-accounting-invoice/financial-year";
import {
  assertCreditNoteDoesNotExceedCapacity,
  deriveInvoiceReceivable,
  splitCreditNoteFromInvoiceGst,
} from "@/lib/enterprise-accounting-invoice/receivable";
import type {
  CreateEnterpriseAccountingCreditNoteInput,
  EnterpriseAccountingCreditNoteDto,
} from "@/types/enterprise-accounting-credit-note";
import { allocateAccountingCreditNoteNumberInTransaction } from "./credit-note-number.service";

export function serializeCreditNote(row: {
  id: string;
  organizationId: string;
  invoiceId: string;
  financialYearKey: string;
  sequenceNumber: number;
  creditNoteNumber: string;
  creditNoteDate: Date;
  reason: string;
  taxableAmount: Prisma.Decimal;
  gstRatePercent: Prisma.Decimal;
  gstAmount: Prisma.Decimal;
  creditNoteAmount: Prisma.Decimal;
  status: string;
  issuedBy: string;
  issuedAt: Date;
  rowVersion: number;
  createdAt: Date;
  updatedAt: Date;
}): EnterpriseAccountingCreditNoteDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    invoiceId: row.invoiceId,
    financialYearKey: row.financialYearKey,
    sequenceNumber: row.sequenceNumber,
    creditNoteNumber: row.creditNoteNumber,
    creditNoteDate: row.creditNoteDate.toISOString(),
    reason: row.reason,
    taxableAmount: row.taxableAmount.toNumber(),
    gstRatePercent: row.gstRatePercent.toNumber(),
    gstAmount: row.gstAmount.toNumber(),
    creditNoteAmount: row.creditNoteAmount.toNumber(),
    status: row.status,
    issuedBy: row.issuedBy,
    issuedAt: row.issuedAt.toISOString(),
    rowVersion: row.rowVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function postedPaymentAmounts(
  payments: Array<{ status: string; amount: Prisma.Decimal }>,
): number[] {
  return payments
    .filter((p) => p.status === ACCOUNTING_PAYMENT_STATUS.posted)
    .map((p) => p.amount.toNumber());
}

function postedCreditNoteAmounts(
  notes: Array<{ status: string; creditNoteAmount: Prisma.Decimal }>,
): number[] {
  return notes
    .filter((n) => n.status === ACCOUNTING_CREDIT_NOTE_STATUS.posted)
    .map((n) => n.creditNoteAmount.toNumber());
}

export class EnterpriseAccountingCreditNoteService {
  async create(input: CreateEnterpriseAccountingCreditNoteInput, actorUserId: string) {
    const reason = input.reason?.trim() ?? "";
    if (!reason) {
      throw Object.assign(new Error("Credit Note reason is required"), {
        statusCode: 400,
        code: "CREDIT_NOTE_REASON_REQUIRED",
      });
    }
    if (!Number.isInteger(input.invoiceRowVersion) || input.invoiceRowVersion < 1) {
      throw Object.assign(new Error("invoiceRowVersion must be a positive integer"), {
        statusCode: 400,
        code: "INVALID_ROW_VERSION",
      });
    }
    const amount = roundMoney2(input.creditNoteAmount);
    const dateCal = parseIsoDateOnly(input.creditNoteDate);
    const creditNoteDate = calendarDateToUtcNoon(dateCal.year, dateCal.month, dateCal.day);
    const organizationId = await resolvePilotOrganizationId();
    const settings = await prisma.organizationWorkspaceSettings.findUnique({
      where: { organizationId },
    });
    const timeZone = settings?.timeZone?.trim() || "Asia/Kolkata";
    const fyStartMonth = settings?.financialYearStartMonth ?? 4;
    const financialYearKey = resolveInvoiceFinancialYearKey({
      at: creditNoteDate,
      timeZone,
      financialYearStartMonth: fyStartMonth,
    });

    return prisma.$transaction(async (tx) => {
      const lock = await tx.enterpriseAccountingInvoice.updateMany({
        where: {
          id: input.invoiceId,
          organizationId,
          rowVersion: input.invoiceRowVersion,
        },
        data: {
          rowVersion: { increment: 1 },
          updatedBy: actorUserId,
        },
      });
      if (lock.count !== 1) {
        throw Object.assign(new Error("Invoice changed; reload and retry"), {
          statusCode: 409,
          code: "ACCOUNTING_INVOICE_CONFLICT",
        });
      }

      const invoice = await tx.enterpriseAccountingInvoice.findFirst({
        where: { id: input.invoiceId, organizationId },
        include: { payments: true, creditNotes: true },
      });
      if (!invoice) {
        throw Object.assign(new Error("Invoice not found"), {
          statusCode: 404,
          code: "ACCOUNTING_INVOICE_NOT_FOUND",
        });
      }
      if (invoice.documentStatus === "cancelled") {
        throw Object.assign(new Error("Credit Notes cannot be created against a cancelled invoice"), {
          statusCode: 409,
          code: "INVOICE_CANCELLED",
        });
      }
      if (
        !(ACCOUNTING_INVOICE_PAYMENT_ELIGIBLE_STATUS as readonly string[]).includes(
          invoice.documentStatus,
        )
      ) {
        throw Object.assign(new Error("Credit Note can only reference a raised or shared Invoice"), {
          statusCode: 409,
          code: "INVOICE_NOT_ELIGIBLE_FOR_CREDIT_NOTE",
        });
      }

      const postedNotes = postedCreditNoteAmounts(invoice.creditNotes);
      const receivable = deriveInvoiceReceivable({
        invoiceTotal: invoice.invoiceTotal.toNumber(),
        netReceivable: invoice.netReceivable.toNumber(),
        postedPaymentAmounts: postedPaymentAmounts(invoice.payments),
        postedCreditNoteAmounts: postedNotes,
      });
      assertCreditNoteDoesNotExceedCapacity({
        creditNoteAmount: amount,
        outstanding: receivable.outstanding,
        netReceivable: invoice.netReceivable.toNumber(),
        postedCreditNoteAmount: receivable.creditNoteAmount,
      });

      const gstRatePercent = invoice.gstRatePercent.toNumber();
      const split = splitCreditNoteFromInvoiceGst(amount, gstRatePercent);
      const allocated = await allocateAccountingCreditNoteNumberInTransaction(tx, {
        organizationId,
        financialYearKey,
      });
      const now = new Date();
      const created = await tx.enterpriseAccountingCreditNote.create({
        data: {
          organizationId,
          invoiceId: invoice.id,
          financialYearKey,
          sequenceNumber: allocated.sequenceNumber,
          creditNoteNumber: allocated.creditNoteNumber,
          creditNoteDate,
          reason,
          taxableAmount: new Prisma.Decimal(split.taxableAmount),
          gstRatePercent: new Prisma.Decimal(gstRatePercent),
          gstAmount: new Prisma.Decimal(split.gstAmount),
          creditNoteAmount: new Prisma.Decimal(split.creditNoteAmount),
          status: ACCOUNTING_CREDIT_NOTE_STATUS.posted,
          issuedBy: actorUserId,
          issuedAt: now,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });

      await tx.enterpriseActivityEvent.upsert({
        where: {
          organizationId_sourceSystem_sourceEventId: {
            organizationId,
            sourceSystem: ACCOUNTING_CREDIT_NOTE_SOURCE,
            sourceEventId: creditNoteCreatedEventId(created.id),
          },
        },
        create: {
          organizationId,
          eventKind: "accounting",
          sourceSystem: ACCOUNTING_CREDIT_NOTE_SOURCE,
          sourceEventId: creditNoteCreatedEventId(created.id),
          title: ACCOUNTING_CREDIT_NOTE_EAR_TITLE,
          summary: `Credit Note ${created.creditNoteNumber} created for invoice ${invoice.invoiceNumber}`,
          payload: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            creditNoteId: created.id,
            creditNoteNumber: created.creditNoteNumber,
            creditNoteAmount: split.creditNoteAmount,
            taxableAmount: split.taxableAmount,
            gstAmount: split.gstAmount,
            gstRatePercent,
          },
          opportunityId: invoice.opportunityId,
          dealId: invoice.dealId,
          actorUserId,
          occurredAt: now,
        },
        update: {},
      });

      return serializeCreditNote(created);
    });
  }
}

export const enterpriseAccountingCreditNoteService = new EnterpriseAccountingCreditNoteService();
