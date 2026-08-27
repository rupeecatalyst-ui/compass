/**
 * CO-CHANAKYA-003C — Read-only commercial / accounting intelligence projections.
 * Consumes existing Accounting SSOT (Prisma + deriveInvoiceReceivable + case repository).
 * No new accounting formulas — no mutation paths.
 */

import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { enterpriseAccountingCaseRepository } from "@server/repositories/enterprise-accounting-case/enterprise-accounting-case.repository";
import { ACCOUNTING_CREDIT_NOTE_STATUS } from "@/constants/enterprise-accounting-credit-note";
import { ACCOUNTING_INVOICE_DOCUMENT_STATUS } from "@/constants/enterprise-accounting-invoice";
import { ACCOUNTING_PAYMENT_STATUS } from "@/constants/enterprise-accounting-payment";
import { deriveInvoiceReceivable, inboundPayoutView } from "@/lib/enterprise-accounting-invoice/receivable";
import { todayIsoDateInTimeZone } from "@/lib/enterprise-accounting-invoice/financial-year";
import type { DerivedAccountingPaymentSummary } from "@/types/enterprise-accounting-payment";
import type {
  ChanakyaAttentionReasonEvidence,
} from "@/types/chanakya-enterprise-read-context";
import { CHANAKYA_FIELD_AVAILABILITY } from "@/types/chanakya-enterprise-read-context";
import { POST_DISBURSEMENT_CONFIRMATION_STAGE, POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES } from "@/constants/post-disbursement-confirmation";
import { serializeCreditNote } from "@server/services/enterprise-accounting-invoice/enterprise-accounting-credit-note.service";
import { redactCustomerContactPiiForAiContext } from "./redact-pii";
import { projectPostDisbursementConfirmationEvidence } from "./evidence-projections";

import { pushAttentionReason } from "./attention-radar-evidence";

const DEFAULT_INVOICE_LIMIT = 50;
const PORTFOLIO_INVOICE_LIMIT = 200;

const invoiceInclude = {
  deal: { select: { dealNumber: true, primaryContactName: true } },
  payments: { orderBy: { receivedAt: "asc" as const } },
  creditNotes: { orderBy: { issuedAt: "asc" as const } },
} satisfies Prisma.EnterpriseAccountingInvoiceInclude;

type InvoiceRow = Prisma.EnterpriseAccountingInvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

function money(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return value.toNumber();
}

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function postedPaymentAmount(payment: InvoiceRow["payments"][number]): number {
  const reconciliation = (payment as { reconciliationJson?: unknown }).reconciliationJson as {
    amountCredited?: number;
    tdsWithholdingAmount?: number;
    otherAdjustment?: number;
  } | null;
  if (reconciliation && typeof reconciliation.amountCredited === "number") {
    return (
      reconciliation.amountCredited +
      (reconciliation.tdsWithholdingAmount ?? 0) +
      (reconciliation.otherAdjustment ?? 0)
    );
  }
  return payment.amount.toNumber();
}

function deriveInvoiceFromRow(row: InvoiceRow) {
  const payments = row.payments.map((p) => ({
    id: p.id,
    invoiceId: p.invoiceId,
    dealId: p.dealId,
    opportunityId: p.opportunityId,
    paymentDate: p.paymentDate.toISOString(),
    amount: p.amount.toNumber(),
    paymentReference: p.paymentReference,
    paymentMode: p.paymentMode,
    status: p.status,
    receivedAt: p.receivedAt.toISOString(),
    reconciliation:
      (p as { reconciliationJson?: unknown }).reconciliationJson &&
      typeof (p as { reconciliationJson?: unknown }).reconciliationJson === "object"
        ? ((p as { reconciliationJson?: unknown }).reconciliationJson as Record<string, unknown>)
        : null,
  }));

  const creditNotes = row.creditNotes.map((n) => serializeCreditNote(n));

  const derived = deriveInvoiceReceivable({
    invoiceTotal: row.invoiceTotal.toNumber(),
    netReceivable: row.netReceivable.toNumber(),
    postedPaymentAmounts: payments
      .filter((p) => p.status === ACCOUNTING_PAYMENT_STATUS.posted)
      .map((p) => postedPaymentAmount(row.payments.find((x) => x.id === p.id)!)),
    postedCreditNoteAmounts: creditNotes
      .filter((n) => n.status === ACCOUNTING_CREDIT_NOTE_STATUS.posted)
      .map((n) => n.creditNoteAmount),
  });

  return { payments, creditNotes, derived };
}

function projectInvoiceEvidence(row: InvoiceRow) {
  const { payments, creditNotes, derived } = deriveInvoiceFromRow(row);
  const payout = inboundPayoutView(derived);

  return {
    entityId: row.id,
    invoiceNumber: row.invoiceNumber,
    documentStatus: row.documentStatus,
    invoiceDate: row.invoiceDate.toISOString(),
    dueDate: iso(row.dueDate),
    raisedAt: row.raisedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    dealId: row.dealId,
    opportunityId: row.opportunityId,
    dealNumber: row.deal.dealNumber,
    partyLabel: row.partyDisplayName || row.partyBillingName || null,
    invoiceTotal: derived.invoiceTotal,
    netReceivable: derived.netReceivable,
    amountReceived: derived.amountReceived,
    creditNoteAmount: derived.creditNoteAmount,
    outstanding: derived.outstanding,
    paymentStatus: derived.paymentStatus,
    receivableView: payout,
    payments: payments.map((p) => ({
      entityId: p.id,
      status: p.status,
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentReference: p.paymentReference,
      paymentMode: p.paymentMode,
      reconciliationStatus:
        (p.reconciliation?.reconciliationStatus as string | undefined) ?? null,
      balancePending:
        typeof p.reconciliation?.balancePending === "number"
          ? p.reconciliation.balancePending
          : null,
      provenance: "enterprise_accounting_payment",
    })),
    creditNotes: creditNotes.map((n) => ({
      entityId: n.id,
      creditNoteNumber: n.creditNoteNumber,
      status: n.status,
      creditNoteAmount: n.creditNoteAmount,
      creditNoteDate: n.creditNoteDate,
      reason: n.reason,
      provenance: "enterprise_accounting_credit_note",
    })),
    provenance: "enterprise_accounting_invoice + deriveInvoiceReceivable",
  };
}

function summarizeDerivedInvoices(
  items: ReturnType<typeof projectInvoiceEvidence>[],
  todayIso: string,
): DerivedAccountingPaymentSummary {
  const summary: DerivedAccountingPaymentSummary = {
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

  for (const inv of items) {
    if (inv.documentStatus === ACCOUNTING_INVOICE_DOCUMENT_STATUS.cancelled) continue;
    summary.invoicesRaised += 1;
    summary.totalInvoiced += inv.netReceivable ?? 0;
    summary.totalReceived += inv.amountReceived ?? 0;
    summary.creditNotesTotal += inv.creditNoteAmount ?? 0;
    summary.outstanding += inv.outstanding ?? 0;
    if (inv.paymentStatus === "PAID") summary.paidCount += 1;
    else if (inv.paymentStatus === "PARTIALLY_PAID") summary.partiallyPaidCount += 1;
    else summary.unpaidCount += 1;
    for (const payment of inv.payments) {
      if (
        payment.status === ACCOUNTING_PAYMENT_STATUS.posted &&
        payment.paymentDate.slice(0, 10) === todayIso
      ) {
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

async function loadInvoicesForScope(input: {
  organizationId: string;
  opportunityId?: string | null;
  dealId?: string | null;
  limit?: number;
}): Promise<InvoiceRow[]> {
  if (!isDatabaseAvailable()) return [];
  const where: Prisma.EnterpriseAccountingInvoiceWhereInput = {
    organizationId: input.organizationId,
  };
  if (input.dealId) where.dealId = input.dealId;
  else if (input.opportunityId) where.opportunityId = input.opportunityId;

  return prisma.enterpriseAccountingInvoice.findMany({
    where,
    include: invoiceInclude,
    orderBy: { invoiceDate: "desc" },
    take: input.limit ?? DEFAULT_INVOICE_LIMIT,
  });
}

function projectCaseSummary(caseRow: Record<string, unknown> | null) {
  if (!caseRow) {
    return {
      status: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      case: null,
      note: "No Enterprise Accounting Case for this deal scope.",
      provenance: "enterprise_accounting_case",
    };
  }

  const deal = caseRow.deal as Record<string, unknown> | null | undefined;
  const invoiceParty = deal?.invoiceParty as Record<string, unknown> | null | undefined;

  return {
    status: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    case: {
      entityId: caseRow.id,
      dealId: caseRow.dealId,
      status: caseRow.status,
      finalAmount: caseRow.finalAmount ?? null,
      disbursedAmount: caseRow.disbursedAmount ?? null,
      disbursedDate: caseRow.disbursedDate ?? null,
      expectedCommission: caseRow.expectedCommission ?? null,
      confirmedInvoiceAmount: caseRow.confirmedInvoiceAmount ?? null,
      payoutAmount: caseRow.payoutAmount ?? null,
      tdsAmount: caseRow.tdsAmount ?? null,
      shortPaymentAmount: caseRow.shortPaymentAmount ?? null,
      confirmedAt: caseRow.confirmedAt ?? null,
      confirmationSource: caseRow.confirmationSource ?? null,
      updatedAt: caseRow.updatedAt ?? null,
      invoicePartyLabel:
        (invoiceParty?.displayName as string | undefined) ??
        (invoiceParty?.billingName as string | undefined) ??
        null,
      invoicePartyGstin: invoiceParty?.gstin ?? null,
      invoicePartyState: invoiceParty?.stateLabel ?? null,
      provenance: "enterprise_accounting_case",
    },
    provenance: "enterprise_accounting_case",
  };
}

function buildOutstandingItems(
  invoices: ReturnType<typeof projectInvoiceEvidence>[],
): Array<Record<string, unknown>> {
  return invoices
    .filter(
      (inv) =>
        inv.documentStatus !== ACCOUNTING_INVOICE_DOCUMENT_STATUS.cancelled &&
        inv.documentStatus !== ACCOUNTING_INVOICE_DOCUMENT_STATUS.draft &&
        (inv.outstanding ?? 0) > 0,
    )
    .map((inv) => ({
      kind: "invoice_outstanding",
      entityId: inv.entityId,
      invoiceNumber: inv.invoiceNumber,
      documentStatus: inv.documentStatus,
      outstanding: inv.outstanding,
      paymentStatus: inv.paymentStatus,
      dealId: inv.dealId,
      opportunityId: inv.opportunityId,
      dealNumber: inv.dealNumber,
      partyLabel: inv.partyLabel,
      updatedAt: inv.updatedAt,
      provenance: "deriveInvoiceReceivable",
    }));
}

export async function projectCommercialAccountingContext(input: {
  organizationId: string;
  opportunityId?: string | null;
  dealId?: string | null;
  dealStage?: string | null;
  dealSubStage?: string | null;
  disbursedAt?: Date | string | null;
  limit?: number;
}): Promise<Record<string, unknown>> {
  if (!isDatabaseAvailable()) {
    return {
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      note: "Database unavailable — commercial accounting context NOT AVAILABLE.",
      provenance: ["enterprise_accounting_invoice", "enterprise_accounting_case"],
    };
  }

  try {
    const settings = await prisma.organizationWorkspaceSettings.findUnique({
      where: { organizationId: input.organizationId },
    });
    const timeZone = settings?.timeZone?.trim() || "Asia/Kolkata";
    const todayIso = todayIsoDateInTimeZone(timeZone);

    const rows = await loadInvoicesForScope(input);
    const invoiceItems = rows.map(projectInvoiceEvidence);
    const receivableSummary = summarizeDerivedInvoices(invoiceItems, todayIso);

    const raisedCount = invoiceItems.filter(
      (i) => i.documentStatus === ACCOUNTING_INVOICE_DOCUMENT_STATUS.raised,
    ).length;
    const sharedCount = invoiceItems.filter(
      (i) => i.documentStatus === ACCOUNTING_INVOICE_DOCUMENT_STATUS.shared,
    ).length;

    const allPayments = invoiceItems.flatMap((i) => i.payments);
    const postedPayments = allPayments.filter(
      (p) => p.status === ACCOUNTING_PAYMENT_STATUS.posted,
    );
    const pendingReconciliation = postedPayments.filter(
      (p) =>
        p.reconciliationStatus === "partially_reconciled" ||
        p.reconciliationStatus === "unreconciled",
    );

    const allCreditNotes = invoiceItems.flatMap((i) => i.creditNotes);

    let caseSummary: Record<string, unknown> = {
      status: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      case: null,
      provenance: "enterprise_accounting_case",
    };
    if (input.dealId) {
      const byDeal = await enterpriseAccountingCaseRepository.list(input.organizationId, {
        dealId: input.dealId,
        pageSize: 1,
      });
      caseSummary = projectCaseSummary(
        (byDeal.items[0] as unknown as Record<string, unknown>) ?? null,
      );
    }

    let postDisbursementSummary: Record<string, unknown> = {
      status: CHANAKYA_FIELD_AVAILABILITY.NOT_APPLICABLE,
      note: "Deal scope required for post-disbursement confirmation projection.",
    };
    if (input.dealId) {
      postDisbursementSummary = await projectPostDisbursementConfirmationEvidence({
        organizationId: input.organizationId,
        dealId: input.dealId,
        grossStage: input.dealStage ?? null,
        subStage: input.dealSubStage ?? null,
        disbursedAt: input.disbursedAt ?? null,
      });
    }

    const outstandingItems = buildOutstandingItems(invoiceItems);

    const availability =
      invoiceItems.length > 0 ||
      caseSummary.status === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE ||
      postDisbursementSummary.status === CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
        ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
        : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE;

    return redactCustomerContactPiiForAiContext({
      availability,
      readOnly: true,
      invoiceSummary: {
        count: invoiceItems.length,
        raisedCount,
        sharedCount,
        cancelledCount: invoiceItems.filter(
          (i) => i.documentStatus === ACCOUNTING_INVOICE_DOCUMENT_STATUS.cancelled,
        ).length,
        draftCount: invoiceItems.filter(
          (i) => i.documentStatus === ACCOUNTING_INVOICE_DOCUMENT_STATUS.draft,
        ).length,
        invoices: invoiceItems,
        provenance: "enterprise_accounting_invoice + deriveInvoiceReceivable",
      },
      paymentSummary: {
        postedCount: postedPayments.length,
        totalReceived: receivableSummary.totalReceived,
        todaysCollections: receivableSummary.todaysCollections,
        pendingReconciliationCount: pendingReconciliation.length,
        payments: postedPayments,
        provenance: "enterprise_accounting_payment",
      },
      receivableSummary: {
        ...receivableSummary,
        provenance: "deriveInvoiceReceivable (aggregated — mirrors invoice service list summary)",
      },
      creditNoteSummary: {
        count: allCreditNotes.length,
        totalAmount: receivableSummary.creditNotesTotal,
        creditNotes: allCreditNotes,
        provenance: "enterprise_accounting_credit_note",
      },
      caseSummary,
      postDisbursementSummary,
      outstandingItems,
      provenance: [
        "enterprise_accounting_invoice",
        "enterprise_accounting_payment",
        "enterprise_accounting_credit_note",
        "enterprise_accounting_case",
        "post_disbursement_confirmation",
        "deriveInvoiceReceivable",
      ],
      note: "Read-only commercial projection — no invoice/payment/credit-note mutations exposed.",
    });
  } catch {
    return {
      availability: CHANAKYA_FIELD_AVAILABILITY.UNKNOWN,
      note: "Commercial accounting projection failed — UNKNOWN.",
      provenance: ["enterprise_accounting_invoice"],
    };
  }
}

export async function projectPortfolioCommercialSnapshot(input: {
  organizationId: string;
  limit?: number;
}): Promise<Record<string, unknown>> {
  if (!isDatabaseAvailable()) {
    return {
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      note: "Database unavailable — portfolio commercial snapshot NOT AVAILABLE.",
      provenance: ["enterprise_accounting_invoice"],
    };
  }

  try {
    const settings = await prisma.organizationWorkspaceSettings.findUnique({
      where: { organizationId: input.organizationId },
    });
    const timeZone = settings?.timeZone?.trim() || "Asia/Kolkata";
    const todayIso = todayIsoDateInTimeZone(timeZone);

    const rows = await loadInvoicesForScope({
      organizationId: input.organizationId,
      limit: input.limit ?? PORTFOLIO_INVOICE_LIMIT,
    });
    const invoiceItems = rows.map(projectInvoiceEvidence);
    const receivableSummary = summarizeDerivedInvoices(invoiceItems, todayIso);

    const outstandingInvoices = buildOutstandingItems(invoiceItems);
    const sharedInvoices = invoiceItems.filter(
      (i) => i.documentStatus === ACCOUNTING_INVOICE_DOCUMENT_STATUS.shared,
    );
    const raisedInvoices = invoiceItems.filter(
      (i) => i.documentStatus === ACCOUNTING_INVOICE_DOCUMENT_STATUS.raised,
    );

    const pendingReconciliation = invoiceItems
      .flatMap((i) => i.payments)
      .filter(
        (p) =>
          p.status === ACCOUNTING_PAYMENT_STATUS.posted &&
          (p.reconciliationStatus === "partially_reconciled" ||
            p.reconciliationStatus === "unreconciled"),
      );

    let postDisbursementPendingCount = 0;
    try {
      const pendingDeals = await prisma.enterpriseDeal.findMany({
        where: {
          organizationId: input.organizationId,
          isDeleted: false,
          grossStage: POST_DISBURSEMENT_CONFIRMATION_STAGE,
          subStage: POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.pending,
        },
        select: { id: true },
        take: 100,
      });
      postDisbursementPendingCount = pendingDeals.length;
    } catch {
      /* optional */
    }

    return redactCustomerContactPiiForAiContext({
      availability:
        invoiceItems.length > 0
          ? CHANAKYA_FIELD_AVAILABILITY.AVAILABLE
          : CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
      receivableSummary,
      counts: {
        outstandingInvoices: outstandingInvoices.length,
        raisedInvoices: raisedInvoices.length,
        sharedInvoices: sharedInvoices.length,
        pendingReconciliation: pendingReconciliation.length,
        postDisbursementConfirmationPending: postDisbursementPendingCount,
      },
      outstandingInvoices: outstandingInvoices.slice(0, input.limit ?? 25),
      raisedInvoices: raisedInvoices.slice(0, 10).map((i) => ({
        entityId: i.entityId,
        invoiceNumber: i.invoiceNumber,
        dealId: i.dealId,
        opportunityId: i.opportunityId,
        netReceivable: i.netReceivable,
        raisedAt: i.raisedAt,
      })),
      sharedInvoices: sharedInvoices.slice(0, 10).map((i) => ({
        entityId: i.entityId,
        invoiceNumber: i.invoiceNumber,
        dealId: i.dealId,
        opportunityId: i.opportunityId,
        outstanding: i.outstanding,
        updatedAt: i.updatedAt,
      })),
      provenance: [
        "enterprise_accounting_invoice",
        "deriveInvoiceReceivable",
        "enterprise_deal (post_disbursement_confirmation stage)",
      ],
      note: "Portfolio totals aggregated from deriveInvoiceReceivable per invoice — read-only.",
    });
  } catch {
    return {
      availability: CHANAKYA_FIELD_AVAILABILITY.UNKNOWN,
      note: "Portfolio commercial snapshot failed — UNKNOWN.",
      provenance: ["enterprise_accounting_invoice"],
    };
  }
}

export function appendCommercialAttentionReasons(input: {
  commercial: Record<string, unknown>;
  reasons: ChanakyaAttentionReasonEvidence[];
  domainBreakdown: Partial<
    Record<import("@/types/chanakya-enterprise-read-context").ChanakyaAttentionDomain, ChanakyaAttentionReasonEvidence[]>
  >;
}) {
  const outstanding = (input.commercial.outstandingItems as Array<Record<string, unknown>>) ?? [];
  for (const item of outstanding.slice(0, 5)) {
    pushAttentionReason(input.reasons, input.domainBreakdown, {
      domain: "accounting",
      statement: `Outstanding invoice ${item.invoiceNumber} — ${item.outstanding} remaining (${item.documentStatus}).`,
      source: "deriveInvoiceReceivable + enterprise_accounting_invoice",
      entityId: (item.entityId as string) ?? null,
      observedAt: (item.updatedAt as string) ?? null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }

  const postDisb = input.commercial.postDisbursementSummary as Record<string, unknown> | undefined;
  if (
    postDisb?.confirmationState === "confirmation_pending" &&
    !input.reasons.some((r) => r.domain === "post_disbursement")
  ) {
    pushAttentionReason(input.reasons, input.domainBreakdown, {
      domain: "post_disbursement",
      statement: "Post-disbursement confirmation is pending.",
      source: "post_disbursement_confirmation",
      entityId: (postDisb.entityId as string) ?? null,
      observedAt:
        ((postDisb.serviceEvents as Array<{ occurredAt?: string }> | undefined)?.[0]
          ?.occurredAt as string) ?? null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }

  const paymentSummary = input.commercial.paymentSummary as Record<string, unknown> | undefined;
  const pendingRecon = (paymentSummary?.pendingReconciliationCount as number) ?? 0;
  if (pendingRecon > 0) {
    pushAttentionReason(input.reasons, input.domainBreakdown, {
      domain: "accounting",
      statement: `${pendingRecon} posted payment(s) have pending or partial reconciliation.`,
      source: "enterprise_accounting_payment.reconciliationJson",
      entityId: null,
      observedAt: null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }

  const caseSummary = input.commercial.caseSummary as Record<string, unknown> | undefined;
  const caseRow = caseSummary?.case as Record<string, unknown> | undefined;
  if (
    caseRow &&
    typeof caseRow.status === "string" &&
    !["closed", "resolved"].includes(caseRow.status.toLowerCase())
  ) {
    pushAttentionReason(input.reasons, input.domainBreakdown, {
      domain: "accounting",
      statement: `Accounting case status: ${caseRow.status}.`,
      source: "enterprise_accounting_case",
      entityId: (caseRow.entityId as string) ?? null,
      observedAt: (caseRow.updatedAt as string) ?? null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }

  const receivable = input.commercial.receivableSummary as Record<string, unknown> | undefined;
  if (
    typeof receivable?.partiallyPaidCount === "number" &&
    receivable.partiallyPaidCount > 0
  ) {
    pushAttentionReason(input.reasons, input.domainBreakdown, {
      domain: "accounting",
      statement: `${receivable.partiallyPaidCount} invoice(s) partially paid with balance outstanding.`,
      source: "deriveInvoiceReceivable",
      entityId: null,
      observedAt: null,
      availability: CHANAKYA_FIELD_AVAILABILITY.AVAILABLE,
    });
  }
}
