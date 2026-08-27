/**
 * CO-CHANAKYA-003D — Change intelligence loaders (read-only SSOT consumers).
 */

import "server-only";

import type { Prisma } from "@prisma/client";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { listTasksForEntity } from "@/lib/enterprise-task-engine";
import { listSdeExceptions } from "@/lib/system-driven-enterprise";
import { ACCOUNTING_PAYMENT_STATUS } from "@/constants/enterprise-accounting-payment";
import {
  CHANAKYA_FIELD_AVAILABILITY,
  type ChanakyaChangeIntelligenceContext,
  type ChanakyaChangePeriod,
  type ChanakyaChangeRecord,
} from "@/types/chanakya-enterprise-read-context";
import { redactCustomerContactPiiForAiContext } from "./redact-pii";
import {
  assembleChangeIntelligenceContext,
  isTimestampInPeriod,
  mapAccountingEvidenceToChangeRecords,
  mapEarEventToChangeRecord,
  mapEteTaskToChangeRecords,
  mapSdeExceptionToChangeRecords,
  resolveChangePeriodBounds,
  type ChanakyaChangePeriodBounds,
} from "./change-intelligence-core";

const DEFAULT_EAR_LIMIT = 120;
const DEFAULT_ACCOUNTING_LIMIT = 100;

const invoiceInclude = {
  deal: { select: { dealNumber: true } },
  payments: { orderBy: { receivedAt: "asc" as const } },
  creditNotes: { orderBy: { issuedAt: "asc" as const } },
} satisfies Prisma.EnterpriseAccountingInvoiceInclude;

async function resolveOrgTimeZone(organizationId: string): Promise<string> {
  const settings = await prisma.organizationWorkspaceSettings.findUnique({
    where: { organizationId },
  });
  return settings?.timeZone?.trim() || "Asia/Kolkata";
}

async function loadEarChanges(input: {
  organizationId: string;
  period: ChanakyaChangePeriodBounds;
  opportunityId?: string | null;
  dealId?: string | null;
  opportunityNumber?: string | null;
  dealNumber?: string | null;
  limit?: number;
  observedAt: string;
}): Promise<ChanakyaChangeRecord[]> {
  if (!enterpriseActivityService.isDurable()) return [];

  const since = input.period.startAt;
  const limit = Math.min(input.limit ?? DEFAULT_EAR_LIMIT, 200);

  const [byOpp, byDeal, orgWide] = await Promise.all([
    input.opportunityId
      ? enterpriseActivityService.list({
          opportunityId: input.opportunityId,
          since,
          limit,
        })
      : Promise.resolve([]),
    input.dealId
      ? enterpriseActivityService.list({
          dealId: input.dealId,
          since,
          limit,
        })
      : Promise.resolve([]),
    !input.opportunityId && !input.dealId
      ? enterpriseActivityService.list({ since, limit })
      : Promise.resolve([]),
  ]);

  const map = new Map<string, (typeof byOpp)[number]>();
  for (const e of [...byOpp, ...byDeal, ...orgWide]) map.set(e.id, e);

  const refs = {
    opportunityNumber: input.opportunityNumber ?? null,
    dealNumber: input.dealNumber ?? null,
  };

  return [...map.values()]
    .filter((e) => isTimestampInPeriod(e.occurredAt, input.period))
    .map((e) => mapEarEventToChangeRecord(e, input.observedAt, refs))
    .filter((row): row is ChanakyaChangeRecord => Boolean(row));
}

async function loadAccountingChanges(input: {
  organizationId: string;
  period: ChanakyaChangePeriodBounds;
  opportunityId?: string | null;
  dealId?: string | null;
  opportunityNumber?: string | null;
  dealNumber?: string | null;
  limit?: number;
  observedAt: string;
}): Promise<ChanakyaChangeRecord[]> {
  if (!isDatabaseAvailable()) return [];

  const where: Prisma.EnterpriseAccountingInvoiceWhereInput = {
    organizationId: input.organizationId,
    OR: [
      { updatedAt: { gte: new Date(input.period.startAt) } },
      { raisedAt: { gte: new Date(input.period.startAt) } },
    ],
  };
  if (input.dealId) where.dealId = input.dealId;
  if (input.opportunityId) where.opportunityId = input.opportunityId;

  const rows = await prisma.enterpriseAccountingInvoice.findMany({
    where,
    include: invoiceInclude,
    orderBy: { updatedAt: "desc" },
    take: Math.min(input.limit ?? DEFAULT_ACCOUNTING_LIMIT, 200),
  });

  const refs = {
    opportunityNumber: input.opportunityNumber ?? null,
    dealNumber: input.dealNumber ?? null,
  };

  const changes: ChanakyaChangeRecord[] = [];
  for (const row of rows) {
    const invoiceChanges = mapAccountingEvidenceToChangeRecords(
      {
        invoiceId: row.id,
        invoiceNumber: row.invoiceNumber,
        documentStatus: row.documentStatus,
        raisedAt: row.raisedAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        dealId: row.dealId,
        opportunityId: row.opportunityId,
        dealNumber: row.deal.dealNumber,
      },
      input.observedAt,
      input.period,
      refs,
    );
    changes.push(...invoiceChanges);

    for (const payment of row.payments) {
      if (payment.status !== ACCOUNTING_PAYMENT_STATUS.posted) continue;
      const reconciliation = (payment as { reconciliationJson?: unknown })
        .reconciliationJson as { reconciliationStatus?: string } | null;
      changes.push(
        ...mapAccountingEvidenceToChangeRecords(
          {
            invoiceId: row.id,
            invoiceNumber: row.invoiceNumber,
            documentStatus: row.documentStatus,
            raisedAt: row.raisedAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            dealId: row.dealId,
            opportunityId: row.opportunityId,
            dealNumber: row.deal.dealNumber,
            payment: {
              id: payment.id,
              status: payment.status,
              amount: payment.amount.toNumber(),
              receivedAt: payment.receivedAt.toISOString(),
              paymentReference: payment.paymentReference,
              reconciliationStatus: reconciliation?.reconciliationStatus ?? null,
            },
          },
          input.observedAt,
          input.period,
          refs,
        ),
      );
    }

    for (const note of row.creditNotes) {
      changes.push(
        ...mapAccountingEvidenceToChangeRecords(
          {
            invoiceId: row.id,
            invoiceNumber: row.invoiceNumber,
            documentStatus: row.documentStatus,
            raisedAt: row.raisedAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            dealId: row.dealId,
            opportunityId: row.opportunityId,
            dealNumber: row.deal.dealNumber,
            creditNote: {
              id: note.id,
              creditNoteNumber: note.creditNoteNumber,
              status: note.status,
              creditNoteAmount: note.creditNoteAmount.toNumber(),
              issuedAt: note.issuedAt.toISOString(),
            },
          },
          input.observedAt,
          input.period,
          refs,
        ),
      );
    }
  }

  return changes;
}

function loadTaskChanges(input: {
  period: ChanakyaChangePeriodBounds;
  opportunityId?: string | null;
  dealId?: string | null;
  opportunityNumber?: string | null;
  dealNumber?: string | null;
  observedAt: string;
}): ChanakyaChangeRecord[] {
  const refs = {
    opportunityId: input.opportunityId ?? null,
    dealId: input.dealId ?? null,
    opportunityNumber: input.opportunityNumber ?? null,
    dealNumber: input.dealNumber ?? null,
  };

  const tasks = input.dealId
    ? listTasksForEntity({ dealId: input.dealId })
    : input.opportunityId
      ? listTasksForEntity({
          entityKind: "opportunity",
          entityId: input.opportunityId,
        })
      : listTasksForEntity({});

  return tasks.flatMap((task) =>
    mapEteTaskToChangeRecords(task, input.observedAt, input.period, refs),
  );
}

function loadSdeChanges(input: {
  period: ChanakyaChangePeriodBounds;
  dealId?: string | null;
  observedAt: string;
}): ChanakyaChangeRecord[] {
  const exceptions = listSdeExceptions({
    transactionId: input.dealId ?? undefined,
  });
  return exceptions.flatMap((ex) =>
    mapSdeExceptionToChangeRecords(ex, input.observedAt, input.period),
  );
}

export async function projectChangeIntelligence(input: {
  organizationId: string;
  period?: ChanakyaChangePeriod | null;
  opportunityId?: string | null;
  dealId?: string | null;
  opportunityNumber?: string | null;
  dealNumber?: string | null;
  limit?: number;
  portfolioMode?: boolean;
}): Promise<ChanakyaChangeIntelligenceContext> {
  const observedAt = new Date().toISOString();
  const periodKey = input.period ?? "last_7_days";
  const timeZone = isDatabaseAvailable()
    ? await resolveOrgTimeZone(input.organizationId)
    : "Asia/Kolkata";
  const period = resolveChangePeriodBounds({ period: periodKey, timeZone });

  const scopeLabel =
    input.opportunityNumber ||
    input.dealNumber ||
    (input.opportunityId ? `opportunity:${input.opportunityId}` : null) ||
    (input.dealId ? `deal:${input.dealId}` : null) ||
    (input.portfolioMode ? "portfolio" : null);

  const limitations: string[] = [];
  if (!enterpriseActivityService.isDurable()) {
    limitations.push("EAR durable mode unavailable — activity/stage/document changes may be NOT AVAILABLE.");
  }
  if (!isDatabaseAvailable()) {
    limitations.push("Database unavailable — accounting invoice/payment changes NOT AVAILABLE.");
  }

  const [earChanges, accountingChanges] = await Promise.all([
    loadEarChanges({
      organizationId: input.organizationId,
      period,
      opportunityId: input.opportunityId,
      dealId: input.dealId,
      opportunityNumber: input.opportunityNumber,
      dealNumber: input.dealNumber,
      limit: input.limit,
      observedAt,
    }),
    loadAccountingChanges({
      organizationId: input.organizationId,
      period,
      opportunityId: input.opportunityId,
      dealId: input.dealId,
      opportunityNumber: input.opportunityNumber,
      dealNumber: input.dealNumber,
      limit: input.limit,
      observedAt,
    }),
  ]);

  const taskChanges = loadTaskChanges({
    period,
    opportunityId: input.opportunityId,
    dealId: input.dealId,
    opportunityNumber: input.opportunityNumber,
    dealNumber: input.dealNumber,
    observedAt,
  });

  const sdeChanges = loadSdeChanges({
    period,
    dealId: input.dealId,
    observedAt,
  });

  const assembled = assembleChangeIntelligenceContext({
    period,
    changes: [...earChanges, ...accountingChanges, ...taskChanges, ...sdeChanges],
    observedAt,
    scopeLabel,
    limitations,
    portfolioMode: input.portfolioMode,
  });

  if (assembled.changes.length === 0 && limitations.length > 0) {
    return redactCustomerContactPiiForAiContext({
      ...assembled,
      availability: CHANAKYA_FIELD_AVAILABILITY.NOT_AVAILABLE,
    }) as ChanakyaChangeIntelligenceContext;
  }

  return redactCustomerContactPiiForAiContext(
    assembled,
  ) as ChanakyaChangeIntelligenceContext;
}

export {
  resolveChangePeriodBounds,
  mapEarEventToChangeRecord,
  mapAccountingEvidenceToChangeRecords,
  assembleChangeIntelligenceContext,
} from "./change-intelligence-core";
