/**
 * EFOE invoice registry — operational invoices based on disbursed amount.
 */

import { EFOE_INVOICE_LIFECYCLE_STATUS } from "@/constants/enterprise-financial-operations-engine";
import type {
  EfoeInvoice,
  EfoeInvoiceLine,
  EfoeInvoicePayee,
  EfoeInvoiceSchedule,
  EfoeRevenueReceipt,
  EfoeRevenueRecognition,
} from "@/types/enterprise-financial-operations-engine";
import { recordEfoeAudit } from "./audit-integration";
import { getEfoePorts } from "./composition";
import { appendEfoeTimelineEntry } from "./financial-timeline-registry";
import {
  deriveEfoeDisbursementSnapshot,
  validateEfoeInvoice,
  validateEfoeRevenueRecognition,
} from "./validation-engine";

export function registerEfoeInvoicePayee(
  input: Omit<EfoeInvoicePayee, "id">,
): EfoeInvoicePayee {
  const payee: EfoeInvoicePayee = { ...input, id: crypto.randomUUID() };
  getEfoePorts().invoicePayees.save(payee);
  return payee;
}

export function registerEfoeInvoice(input: {
  invoiceCode: string;
  transactionRef: string;
  revenueEventId?: string;
  payeeId: string;
  payeeType: EfoeInvoice["payeeType"];
  invoiceAmount: number;
  finalLoanAmount: number;
  totalDisbursed: number;
  currencyCode: string;
  tenantId?: string;
  createdBy: string;
}): EfoeInvoice {
  const existingInvoices = getEfoePorts().invoices.listByTransaction(input.transactionRef);
  const totalInvoiced = existingInvoices.reduce((sum, i) => sum + i.invoiceAmount, 0);

  const snapshot = deriveEfoeDisbursementSnapshot({
    transactionRef: input.transactionRef,
    finalLoanAmount: input.finalLoanAmount,
    totalDisbursed: input.totalDisbursed,
    totalInvoicedAmount: totalInvoiced,
  });

  const now = new Date().toISOString();
  const invoice: EfoeInvoice = {
    id: crypto.randomUUID(),
    invoiceCode: input.invoiceCode,
    transactionRef: input.transactionRef,
    revenueEventId: input.revenueEventId,
    payeeId: input.payeeId,
    payeeType: input.payeeType,
    lifecycleStatus: EFOE_INVOICE_LIFECYCLE_STATUS.DRAFT,
    disbursementBasisAmount: snapshot.invoiceEligibleAmount,
    invoiceAmount: input.invoiceAmount,
    currencyCode: input.currencyCode,
    tenantId: input.tenantId,
    enabled: true,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  const validation = validateEfoeInvoice(invoice, snapshot.invoiceEligibleAmount);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEfoePorts().invoices.save(invoice);
  recordEfoeAudit({
    entityId: invoice.id,
    entityType: "invoice",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered invoice ${invoice.invoiceCode}`,
  });

  return invoice;
}

export function issueEfoeInvoice(invoiceId: string, actorId: string): EfoeInvoice | undefined {
  const invoice = getEfoePorts().invoices.findById(invoiceId);
  if (!invoice) return undefined;

  const updated: EfoeInvoice = {
    ...invoice,
    lifecycleStatus: EFOE_INVOICE_LIFECYCLE_STATUS.ISSUED,
    issuedOn: new Date().toISOString(),
    modifiedBy: actorId,
    modifiedOn: new Date().toISOString(),
  };

  getEfoePorts().invoices.save(updated);
  appendEfoeTimelineEntry({
    transactionRef: invoice.transactionRef,
    eventType: "invoice_issued",
    title: "Invoice Issued",
    description: `Invoice ${invoice.invoiceCode} issued`,
    actorId,
  });

  return updated;
}

export function addEfoeInvoiceLine(input: Omit<EfoeInvoiceLine, "id">): EfoeInvoiceLine {
  if (!getEfoePorts().invoices.findById(input.invoiceId)) {
    throw new Error(`EFOE: invoice "${input.invoiceId}" not found.`);
  }
  const line: EfoeInvoiceLine = { ...input, id: crypto.randomUUID() };
  getEfoePorts().invoiceLines.save(line);
  return line;
}

export function registerEfoeInvoiceSchedule(
  input: Omit<EfoeInvoiceSchedule, "id" | "createdOn">,
): EfoeInvoiceSchedule {
  const schedule: EfoeInvoiceSchedule = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };
  getEfoePorts().invoiceSchedules.save(schedule);
  return schedule;
}

export function recordEfoeRevenueReceipt(
  input: Omit<EfoeRevenueReceipt, "id" | "createdOn">,
): EfoeRevenueReceipt {
  const invoice = getEfoePorts().invoices.findById(input.invoiceId);
  if (!invoice) throw new Error(`EFOE: invoice "${input.invoiceId}" not found.`);

  const receipt: EfoeRevenueReceipt = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEfoePorts().revenueReceipts.save(receipt);

  const updatedInvoice: EfoeInvoice = {
    ...invoice,
    lifecycleStatus: EFOE_INVOICE_LIFECYCLE_STATUS.PAID,
    paidOn: input.receivedOn,
    modifiedOn: new Date().toISOString(),
  };
  getEfoePorts().invoices.save(updatedInvoice);

  appendEfoeTimelineEntry({
    transactionRef: invoice.transactionRef,
    eventType: "payment_received",
    title: "Payment Received",
    description: `Payment of ${input.amount} received for ${invoice.invoiceCode}`,
    actorId: input.createdBy,
  });

  return receipt;
}

export function recognizeEfoeRevenue(input: {
  revenueEventId: string;
  invoiceId: string;
  receiptId: string;
  recognizedAmount: number;
  currencyCode: string;
  createdBy: string;
}): EfoeRevenueRecognition {
  const recognition: EfoeRevenueRecognition = {
    id: crypto.randomUUID(),
    revenueEventId: input.revenueEventId,
    invoiceId: input.invoiceId,
    receiptId: input.receiptId,
    recognizedAmount: input.recognizedAmount,
    currencyCode: input.currencyCode,
    status: "recognized",
    recognizedOn: new Date().toISOString(),
    createdBy: input.createdBy,
    createdOn: new Date().toISOString(),
  };

  const validation = validateEfoeRevenueRecognition(recognition);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEfoePorts().revenueRecognitions.save(recognition);
  recordEfoeAudit({
    entityId: recognition.id,
    entityType: "revenue_recognition",
    action: "created",
    actorId: input.createdBy,
    remarks: `Revenue recognized: ${input.recognizedAmount}`,
  });

  const invoice = getEfoePorts().invoices.findById(input.invoiceId);
  if (invoice) {
    appendEfoeTimelineEntry({
      transactionRef: invoice.transactionRef,
      eventType: "revenue_recognized",
      title: "Revenue Recognized",
      description: `Revenue of ${input.recognizedAmount} recognized`,
      actorId: input.createdBy,
    });
  }

  return recognition;
}

export function listEfoeInvoices(transactionRef?: string): EfoeInvoice[] {
  return transactionRef
    ? getEfoePorts().invoices.listByTransaction(transactionRef)
    : getEfoePorts().invoices.list();
}
