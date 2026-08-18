/**
 * Derived receivable — not stored.
 * outstanding = netReceivable − SUM(posted payments) − SUM(posted credit-note impact)
 */

import { ACCOUNTING_RECEIVABLE_PAYMENT_STATUS } from "@/constants/enterprise-accounting-payment";
import type { DerivedInvoiceReceivable } from "@/types/enterprise-accounting-payment";
import { roundMoney2 } from "./amounts";

export function deriveInvoiceReceivable(input: {
  invoiceTotal: number;
  netReceivable: number;
  postedPaymentAmounts: readonly number[];
  postedCreditNoteAmounts?: readonly number[];
}): DerivedInvoiceReceivable {
  const invoiceTotal = roundMoney2(input.invoiceTotal);
  const netReceivable = roundMoney2(input.netReceivable);
  const amountReceived = roundMoney2(
    input.postedPaymentAmounts.reduce((sum, amount) => sum + roundMoney2(amount), 0),
  );
  const creditNoteAmount = roundMoney2(
    (input.postedCreditNoteAmounts ?? []).reduce((sum, amount) => sum + roundMoney2(amount), 0),
  );
  const outstanding = roundMoney2(netReceivable - amountReceived - creditNoteAmount);
  if (outstanding < 0) {
    throw new Error(
      "Derived outstanding cannot be negative; posted payments and credit notes exceed net receivable",
    );
  }
  const paymentStatus =
    outstanding === 0
      ? ACCOUNTING_RECEIVABLE_PAYMENT_STATUS.paid
      : amountReceived === 0
        ? ACCOUNTING_RECEIVABLE_PAYMENT_STATUS.unpaid
        : ACCOUNTING_RECEIVABLE_PAYMENT_STATUS.partially_paid;
  return {
    invoiceTotal,
    netReceivable,
    amountReceived,
    creditNoteAmount,
    outstanding,
    paymentStatus,
  };
}

export function inboundPayoutView(derived: {
  netReceivable: number;
  amountReceived: number;
  outstanding: number;
  paymentStatus: string;
}): {
  expected: number;
  received: number;
  pending: number;
  status: "UNPAID" | "PARTIAL" | "PAID";
} {
  const status =
    derived.paymentStatus === "PAID"
      ? "PAID"
      : derived.paymentStatus === "PARTIALLY_PAID"
        ? "PARTIAL"
        : "UNPAID";
  return {
    expected: derived.netReceivable,
    received: derived.amountReceived,
    pending: derived.outstanding,
    status,
  };
}

export function splitCreditNoteFromInvoiceGst(
  creditNoteAmount: number,
  gstRatePercent: number,
): { taxableAmount: number; gstAmount: number; creditNoteAmount: number } {
  const total = roundMoney2(creditNoteAmount);
  if (total <= 0) {
    throw Object.assign(new Error("Credit Note amount must be greater than 0"), {
      statusCode: 400,
      code: "INVALID_CREDIT_NOTE_AMOUNT",
    });
  }
  const rate = gstRatePercent;
  if (!Number.isFinite(rate) || rate < 0) {
    throw Object.assign(new Error("Invoice GST snapshot is invalid"), {
      statusCode: 409,
      code: "INVALID_INVOICE_GST_SNAPSHOT",
    });
  }
  if (rate === 0) {
    return { taxableAmount: total, gstAmount: 0, creditNoteAmount: total };
  }
  const gstAmount = roundMoney2((total * rate) / (100 + rate));
  const taxableAmount = roundMoney2(total - gstAmount);
  return { taxableAmount, gstAmount, creditNoteAmount: total };
}

export function assertPaymentDoesNotExceedOutstanding(
  amount: number,
  outstanding: number,
): void {
  const payment = roundMoney2(amount);
  const remaining = roundMoney2(outstanding);
  if (payment <= 0) {
    throw Object.assign(new Error("Payment amount must be greater than 0"), {
      statusCode: 400,
      code: "INVALID_PAYMENT_AMOUNT",
    });
  }
  if (payment > remaining) {
    throw Object.assign(
      new Error(
        `Payment ${payment} exceeds outstanding ${remaining}. Overpayment is not allowed.`,
      ),
      { statusCode: 409, code: "PAYMENT_EXCEEDS_OUTSTANDING" },
    );
  }
}

export function assertCreditNoteDoesNotExceedCapacity(input: {
  creditNoteAmount: number;
  outstanding: number;
  netReceivable: number;
  postedCreditNoteAmount: number;
}): void {
  const amount = roundMoney2(input.creditNoteAmount);
  if (amount <= 0) {
    throw Object.assign(new Error("Credit Note amount must be greater than 0"), {
      statusCode: 400,
      code: "INVALID_CREDIT_NOTE_AMOUNT",
    });
  }
  const outstanding = roundMoney2(input.outstanding);
  if (outstanding <= 0) {
    throw Object.assign(
      new Error(
        "Credit Note is blocked: outstanding is already zero. Refunds and negative receivables are not implemented.",
      ),
      { statusCode: 409, code: "CREDIT_NOTE_NO_OUTSTANDING" },
    );
  }
  if (amount > outstanding) {
    throw Object.assign(
      new Error(
        `Credit Note ${amount} exceeds remaining outstanding ${outstanding}. Negative receivables are not allowed.`,
      ),
      { statusCode: 409, code: "CREDIT_NOTE_EXCEEDS_OUTSTANDING" },
    );
  }
  const posted = roundMoney2(input.postedCreditNoteAmount);
  const net = roundMoney2(input.netReceivable);
  if (roundMoney2(posted + amount) > net) {
    throw Object.assign(
      new Error("Total credit notes cannot exceed invoice net receivable"),
      { statusCode: 409, code: "CREDIT_NOTE_EXCEEDS_NET_RECEIVABLE" },
    );
  }
}
