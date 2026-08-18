import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  ACCOUNTING_CREDIT_NOTE_STATUS,
} from "@/constants/enterprise-accounting-credit-note";
import {
  ACCOUNTING_INVOICE_PAYMENT_ELIGIBLE_STATUS,
  ACCOUNTING_PAYMENT_POSTED_EAR_TITLE,
  ACCOUNTING_PAYMENT_SOURCE,
  ACCOUNTING_PAYMENT_STATUS,
  ACCOUNTING_PAYMENT_VOIDED_EAR_TITLE,
  isAccountingPaymentMode,
  paymentPostedEventId,
  paymentVoidedEventId,
} from "@/constants/enterprise-accounting-payment";
import { roundMoney2 } from "@/lib/enterprise-accounting-invoice/amounts";
import {
  calendarDateToUtcNoon,
  parseIsoDateOnly,
} from "@/lib/enterprise-accounting-invoice/financial-year";
import {
  assertPaymentDoesNotExceedOutstanding,
  deriveInvoiceReceivable,
} from "@/lib/enterprise-accounting-invoice/receivable";
import type {
  EnterpriseAccountingPaymentDto,
  PostEnterpriseAccountingPaymentInput,
  VoidEnterpriseAccountingPaymentInput,
} from "@/types/enterprise-accounting-payment";

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

function postedAmounts(payments: Array<{ status: string; amount: Prisma.Decimal }>): number[] {
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

export class EnterpriseAccountingPaymentService {
  async post(input: PostEnterpriseAccountingPaymentInput, actorUserId: string) {
    const reference = input.paymentReference?.trim() ?? "";
    if (!reference) {
      throw Object.assign(new Error("Payment reference is required"), {
        statusCode: 400,
        code: "PAYMENT_REFERENCE_REQUIRED",
      });
    }
    if (!isAccountingPaymentMode((input.paymentMode ?? "").trim())) {
      throw Object.assign(new Error("Select a valid payment mode"), {
        statusCode: 400,
        code: "INVALID_PAYMENT_MODE",
      });
    }
    if (!Number.isInteger(input.invoiceRowVersion) || input.invoiceRowVersion < 1) {
      throw Object.assign(new Error("invoiceRowVersion must be a positive integer"), {
        statusCode: 400,
        code: "INVALID_ROW_VERSION",
      });
    }
    const amount = roundMoney2(input.amount);
    const paymentCal = parseIsoDateOnly(input.paymentDate);
    const paymentDate = calendarDateToUtcNoon(paymentCal.year, paymentCal.month, paymentCal.day);
    const organizationId = await resolvePilotOrganizationId();

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
        throw Object.assign(new Error("Payments cannot be posted against a cancelled invoice"), {
          statusCode: 409,
          code: "INVOICE_CANCELLED",
        });
      }
      if (
        !(ACCOUNTING_INVOICE_PAYMENT_ELIGIBLE_STATUS as readonly string[]).includes(
          invoice.documentStatus,
        )
      ) {
        throw Object.assign(new Error("Invoice is not eligible for payment"), {
          statusCode: 409,
          code: "INVOICE_NOT_ELIGIBLE_FOR_PAYMENT",
        });
      }

      const receivable = deriveInvoiceReceivable({
        invoiceTotal: invoice.invoiceTotal.toNumber(),
        netReceivable: invoice.netReceivable.toNumber(),
        postedPaymentAmounts: postedAmounts(invoice.payments),
        postedCreditNoteAmounts: postedCreditNoteAmounts(invoice.creditNotes),
      });
      assertPaymentDoesNotExceedOutstanding(amount, receivable.outstanding);

      const now = new Date();
      const created = await tx.enterpriseAccountingPayment.create({
        data: {
          organizationId,
          invoiceId: invoice.id,
          accountingCaseId: invoice.accountingCaseId,
          dealId: invoice.dealId,
          opportunityId: invoice.opportunityId,
          paymentDate,
          amount: new Prisma.Decimal(amount),
          paymentReference: reference,
          paymentMode: input.paymentMode.trim(),
          status: ACCOUNTING_PAYMENT_STATUS.posted,
          receivedBy: actorUserId,
          receivedAt: now,
          notes: input.notes?.trim() || null,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });

      await tx.enterpriseActivityEvent.upsert({
        where: {
          organizationId_sourceSystem_sourceEventId: {
            organizationId,
            sourceSystem: ACCOUNTING_PAYMENT_SOURCE,
            sourceEventId: paymentPostedEventId(created.id),
          },
        },
        create: {
          organizationId,
          eventKind: "accounting",
          sourceSystem: ACCOUNTING_PAYMENT_SOURCE,
          sourceEventId: paymentPostedEventId(created.id),
          title: ACCOUNTING_PAYMENT_POSTED_EAR_TITLE,
          summary: `Payment ${created.paymentReference} posted for invoice ${invoice.invoiceNumber}`,
          payload: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            paymentId: created.id,
            amount,
          },
          opportunityId: invoice.opportunityId,
          dealId: invoice.dealId,
          actorUserId,
          occurredAt: now,
        },
        update: {},
      });

      return serializePayment(created);
    });
  }

  async void(
    paymentId: string,
    input: VoidEnterpriseAccountingPaymentInput,
    actorUserId: string,
  ) {
    const reason = input.reason?.trim() ?? "";
    if (!reason) {
      throw Object.assign(new Error("Void reason is required"), {
        statusCode: 400,
        code: "VOID_REASON_REQUIRED",
      });
    }
    const organizationId = await resolvePilotOrganizationId();

    return prisma.$transaction(async (tx) => {
      const payment = await tx.enterpriseAccountingPayment.findFirst({
        where: { id: paymentId, organizationId },
      });
      if (!payment) {
        throw Object.assign(new Error("Payment not found"), {
          statusCode: 404,
          code: "ACCOUNTING_PAYMENT_NOT_FOUND",
        });
      }
      if (payment.status === ACCOUNTING_PAYMENT_STATUS.voided) {
        throw Object.assign(new Error("Payment is already voided"), {
          statusCode: 409,
          code: "PAYMENT_ALREADY_VOIDED",
        });
      }
      if (payment.status !== ACCOUNTING_PAYMENT_STATUS.posted) {
        throw Object.assign(new Error("Only posted payments can be voided"), {
          statusCode: 409,
          code: "PAYMENT_NOT_POSTED",
        });
      }

      const lock = await tx.enterpriseAccountingInvoice.updateMany({
        where: { id: payment.invoiceId, organizationId },
        data: {
          rowVersion: { increment: 1 },
          updatedBy: actorUserId,
        },
      });
      if (lock.count !== 1) {
        throw Object.assign(new Error("Invoice not found for void"), {
          statusCode: 409,
          code: "ACCOUNTING_INVOICE_CONFLICT",
        });
      }

      const invoice = await tx.enterpriseAccountingInvoice.findFirst({
        where: { id: payment.invoiceId, organizationId },
      });
      if (!invoice) {
        throw Object.assign(new Error("Invoice not found"), {
          statusCode: 404,
          code: "ACCOUNTING_INVOICE_NOT_FOUND",
        });
      }

      const now = new Date();
      const updated = await tx.enterpriseAccountingPayment.update({
        where: { id: payment.id },
        data: {
          status: ACCOUNTING_PAYMENT_STATUS.voided,
          voidedAt: now,
          voidedBy: actorUserId,
          voidReason: reason,
          updatedBy: actorUserId,
        },
      });

      await tx.enterpriseActivityEvent.upsert({
        where: {
          organizationId_sourceSystem_sourceEventId: {
            organizationId,
            sourceSystem: ACCOUNTING_PAYMENT_SOURCE,
            sourceEventId: paymentVoidedEventId(updated.id),
          },
        },
        create: {
          organizationId,
          eventKind: "accounting",
          sourceSystem: ACCOUNTING_PAYMENT_SOURCE,
          sourceEventId: paymentVoidedEventId(updated.id),
          title: ACCOUNTING_PAYMENT_VOIDED_EAR_TITLE,
          summary: `Payment ${updated.paymentReference} voided for invoice ${invoice.invoiceNumber}`,
          payload: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            paymentId: updated.id,
            amount: updated.amount.toNumber(),
            voidReason: reason,
          },
          opportunityId: invoice.opportunityId,
          dealId: invoice.dealId,
          actorUserId,
          occurredAt: now,
        },
        update: {},
      });

      return serializePayment(updated);
    });
  }
}

export const enterpriseAccountingPaymentService = new EnterpriseAccountingPaymentService();
