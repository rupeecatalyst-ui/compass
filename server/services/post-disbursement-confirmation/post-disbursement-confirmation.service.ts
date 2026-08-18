import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  PDC_LENDER_CONFIRMATION_TASK,
  POST_DISBURSEMENT_CONFIRMATION_STAGE,
  POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES,
  POST_DISBURSEMENT_EVENT_SOURCE,
  postDisbursementAccountingCreatedEventId,
  postDisbursementPendingEventId,
  postDisbursementReceivedEventId,
  postDisbursementTaskCreatedEventId,
  postDisbursementTaskIdempotencyKey,
} from "@/constants/post-disbursement-confirmation";
import type { ConfirmPostDisbursementInput } from "@/types/enterprise-accounting-case";

function money(value: number | null | undefined, field: string) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Number.isFinite(value)) {
    throw Object.assign(new Error(`${field} must be a finite number`), {
      statusCode: 400,
      code: "INVALID_CONFIRMATION_VALUE",
    });
  }
  return new Prisma.Decimal(value);
}

function optionalDate(value: string | null | undefined, field: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error(`${field} must be a valid date`), {
      statusCode: 400,
      code: "INVALID_CONFIRMATION_VALUE",
    });
  }
  return parsed;
}

function json(value: unknown) {
  return value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

function sameDayDueAt(from: Date): Date {
  const due = new Date(from);
  due.setHours(17, 0, 0, 0);
  return due;
}

function resolveDealOwnerUserId(deal: {
  primaryOwnerUserId: string | null;
  relationshipManagerUserId: string | null;
  createdBy: string | null;
}): string | null {
  return (
    deal.primaryOwnerUserId?.trim() ||
    deal.relationshipManagerUserId?.trim() ||
    deal.createdBy?.trim() ||
    null
  );
}

function accountingCasePayload(
  input: ConfirmPostDisbursementInput,
  deal: {
    snapshot: Prisma.JsonValue | null;
    commercialTerms: Prisma.JsonValue | null;
    lendingExtension: Prisma.JsonValue | null;
    approvedAmount: Prisma.Decimal | null;
    fulfilledAmount: Prisma.Decimal | null;
    disbursedAt: Date | null;
  },
) {
  const upstreamSnapshot =
    input.upstreamSnapshot !== undefined
      ? json(input.upstreamSnapshot)
      : deal.snapshot || deal.commercialTerms || deal.lendingExtension
        ? ({
            dealSnapshot: deal.snapshot,
            commercialTerms: deal.commercialTerms,
            lendingExtension: deal.lendingExtension,
          } as Prisma.InputJsonValue)
        : undefined;
  return {
    upstreamSnapshot,
    finalAmount:
      input.finalAmount !== undefined
        ? money(input.finalAmount, "finalAmount")
        : deal.approvedAmount,
    disbursedAmount:
      input.disbursedAmount !== undefined
        ? money(input.disbursedAmount, "disbursedAmount")
        : deal.fulfilledAmount,
    disbursedDate:
      input.disbursedDate !== undefined
        ? optionalDate(input.disbursedDate, "disbursedDate")
        : deal.disbursedAt,
    roiPercent: money(input.roiPercent, "roiPercent"),
    feesJson: input.fees === undefined ? undefined : json(input.fees),
    commissionPercent: money(input.commissionPercent, "commissionPercent"),
    expectedCommission: money(input.expectedCommission, "expectedCommission"),
    confirmedInvoiceAmount: money(
      input.confirmedInvoiceAmount,
      "confirmedInvoiceAmount",
    ),
    payoutAmount: money(input.payoutAmount, "payoutAmount"),
    tdsAmount: money(input.tdsAmount, "tdsAmount"),
    shortPaymentAmount: money(input.shortPaymentAmount, "shortPaymentAmount"),
    reconciliationJson:
      input.reconciliation === undefined ? undefined : json(input.reconciliation),
  };
}

type Tx = Prisma.TransactionClient;

async function findExistingConfirmationTask(tx: Tx, organizationId: string, dealId: string) {
  const key = postDisbursementTaskIdempotencyKey(dealId);
  const rows = await tx.enterpriseDealTask.findMany({
    where: {
      organizationId,
      dealId,
      isDeleted: false,
    },
    orderBy: { createdAt: "asc" },
  });
  return (
    rows.find((row) => {
      const payload = row.payload as { idempotencyKey?: string; autoRuleId?: string } | null;
      return (
        payload?.idempotencyKey === key ||
        payload?.autoRuleId === PDC_LENDER_CONFIRMATION_TASK.autoRuleId
      );
    }) ?? null
  );
}

async function ensureOwnerConfirmationTask(
  tx: Tx,
  input: {
    organizationId: string;
    deal: {
      id: string;
      dealNumber: string;
      opportunityId: string | null;
      lenderId: string | null;
      legacyLoanFileId: string | null;
      primaryContactId: string | null;
      primaryContactName: string | null;
      primaryOwnerUserId: string | null;
      relationshipManagerUserId: string | null;
      createdBy: string | null;
      fulfilledAmount: Prisma.Decimal | null;
      approvedAmount: Prisma.Decimal | null;
      requestedAmount: Prisma.Decimal | null;
      disbursedAt: Date | null;
      productLabel: string | null;
    };
    lenderName?: string | null;
    scheduleId: string;
    now: Date;
  },
) {
  const existing = await findExistingConfirmationTask(
    tx,
    input.organizationId,
    input.deal.id,
  );
  if (existing) return { task: existing, created: false };

  const ownerUserId = resolveDealOwnerUserId(input.deal);
  const amount =
    input.deal.fulfilledAmount ??
    input.deal.approvedAmount ??
    input.deal.requestedAmount;
  const href = `/deals/${encodeURIComponent(input.deal.id)}`;
  const task = await tx.enterpriseDealTask.create({
    data: {
      organizationId: input.organizationId,
      dealId: input.deal.id,
      title: PDC_LENDER_CONFIRMATION_TASK.title,
      status: "open",
      priority: PDC_LENDER_CONFIRMATION_TASK.priority,
      dueAt: sameDayDueAt(input.now),
      assigneeUserId: ownerUserId,
      payload: {
        idempotencyKey: postDisbursementTaskIdempotencyKey(input.deal.id),
        autoRuleId: PDC_LENDER_CONFIRMATION_TASK.autoRuleId,
        event: "post_disbursement_confirmation_pending",
        requiredAction: PDC_LENDER_CONFIRMATION_TASK.requiredAction,
        customerName: input.deal.primaryContactName,
        contactId: input.deal.primaryContactId,
        opportunityId: input.deal.opportunityId,
        dealId: input.deal.id,
        dealNumber: input.deal.dealNumber,
        legacyLoanFileId: input.deal.legacyLoanFileId,
        lenderId: input.deal.lenderId,
        lenderName: input.lenderName ?? null,
        disbursedAt: input.deal.disbursedAt?.toISOString() ?? null,
        confirmationPendingAt: input.now.toISOString(),
        loanAmount: amount != null ? Number(amount) : null,
        productLabel: input.deal.productLabel,
        ownerUserId,
        workspaceHref: href,
        scheduleId: input.scheduleId,
      },
      createdBy: "system:post-disbursement-cron",
      updatedBy: "system:post-disbursement-cron",
    },
  });

  await tx.enterpriseActivityEvent.upsert({
    where: {
      organizationId_sourceSystem_sourceEventId: {
        organizationId: input.organizationId,
        sourceSystem: POST_DISBURSEMENT_EVENT_SOURCE,
        sourceEventId: postDisbursementTaskCreatedEventId(input.deal.id),
      },
    },
    create: {
      organizationId: input.organizationId,
      eventKind: "task",
      sourceSystem: POST_DISBURSEMENT_EVENT_SOURCE,
      sourceEventId: postDisbursementTaskCreatedEventId(input.deal.id),
      title: "Automatic Task Created — Obtain Lender Disbursement Confirmation",
      summary: `High-priority task assigned to transaction owner for Deal ${input.deal.dealNumber}`,
      payload: {
        taskId: task.id,
        assigneeUserId: ownerUserId,
        autoRuleId: PDC_LENDER_CONFIRMATION_TASK.autoRuleId,
      },
      opportunityId: input.deal.opportunityId,
      dealId: input.deal.id,
      contactId: input.deal.primaryContactId,
      occurredAt: input.now,
    },
    update: {},
  });

  return { task, created: true };
}

async function completeOwnerConfirmationTasks(
  tx: Tx,
  organizationId: string,
  dealId: string,
  actorUserId: string,
  now: Date,
) {
  const existing = await findExistingConfirmationTask(tx, organizationId, dealId);
  if (!existing || existing.status === "completed") return existing;
  return tx.enterpriseDealTask.update({
    where: { id: existing.id },
    data: {
      status: "completed",
      completedAt: now,
      updatedBy: actorUserId,
    },
  });
}

export class PostDisbursementConfirmationService {
  async processDueSchedules(limit = 50) {
    const now = new Date();
    const due = await prisma.enterprisePostDisbursementSchedule.findMany({
      where: { status: "pending", dueAt: { lte: now } },
      orderBy: { dueAt: "asc" },
      take: Math.min(Math.max(limit, 1), 100),
      select: { id: true, organizationId: true, dealId: true },
    });

    const results: Array<{ scheduleId: string; dealId: string; status: string }> = [];
    for (const schedule of due) {
      const claimToken = randomUUID();
      try {
        const result = await prisma.$transaction(async (tx) => {
          const claimed = await tx.enterprisePostDisbursementSchedule.updateMany({
            where: { id: schedule.id, status: "pending", dueAt: { lte: now } },
            data: {
              status: "processing",
              claimToken,
              claimedAt: now,
              attempts: { increment: 1 },
              lastError: null,
            },
          });
          if (claimed.count === 0) return "not_claimed";

          const deal = await tx.enterpriseDeal.findFirst({
            where: {
              id: schedule.dealId,
              organizationId: schedule.organizationId,
              isDeleted: false,
            },
            include: {
              lender: { select: { displayName: true, legalName: true } },
            },
          });
          if (!deal) {
            await tx.enterprisePostDisbursementSchedule.update({
              where: { id: schedule.id },
              data: {
                status: "failed",
                processedAt: now,
                lastError: "Deal not found",
              },
            });
            return "failed";
          }

          // Already pending / received — complete schedule without duplicate work.
          if (deal.grossStage === POST_DISBURSEMENT_CONFIRMATION_STAGE) {
            await ensureOwnerConfirmationTask(tx, {
              organizationId: schedule.organizationId,
              deal,
              lenderName: deal.lender?.displayName || deal.lender?.legalName,
              scheduleId: schedule.id,
              now,
            });
            await tx.enterprisePostDisbursementSchedule.update({
              where: { id: schedule.id },
              data: {
                status: "completed",
                processedAt: now,
                lastError: `Already in ${deal.subStage ?? "post_disbursement_confirmation"}`,
              },
            });
            return "skipped";
          }

          if (deal.grossStage !== "disbursed") {
            await tx.enterprisePostDisbursementSchedule.update({
              where: { id: schedule.id },
              data: {
                status: "completed",
                processedAt: now,
                lastError: `No transition: Deal stage is ${deal.grossStage}`,
              },
            });
            return "skipped";
          }

          await tx.enterpriseDeal.update({
            where: { id: deal.id },
            data: {
              grossStage: POST_DISBURSEMENT_CONFIRMATION_STAGE,
              subStage: POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.pending,
              stageEnteredAt: now,
              daysInStage: 0,
              rowVersion: { increment: 1 },
            },
          });
          const timeline = await tx.enterpriseDealTimelineEvent.create({
            data: {
              organizationId: schedule.organizationId,
              dealId: deal.id,
              eventType: "post_disbursement_confirmation_pending",
              occurredAt: now,
              summary: `Deal ${deal.dealNumber} entered post-disbursement confirmation`,
              payload: {
                fromGrossStage: "disbursed",
                toGrossStage: POST_DISBURSEMENT_CONFIRMATION_STAGE,
                toSubStage: POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.pending,
                scheduleId: schedule.id,
              },
            },
          });
          await tx.enterpriseActivityEvent.upsert({
            where: {
              organizationId_sourceSystem_sourceEventId: {
                organizationId: schedule.organizationId,
                sourceSystem: POST_DISBURSEMENT_EVENT_SOURCE,
                sourceEventId: postDisbursementPendingEventId(deal.id),
              },
            },
            create: {
              organizationId: schedule.organizationId,
              eventKind: "stage_change",
              sourceSystem: POST_DISBURSEMENT_EVENT_SOURCE,
              sourceEventId: postDisbursementPendingEventId(deal.id),
              title: "Post-Disbursement Confirmation Pending",
              summary: `Deal ${deal.dealNumber} is awaiting lender confirmation`,
              payload: { timelineEventId: timeline.id, scheduleId: schedule.id },
              opportunityId: deal.opportunityId,
              dealId: deal.id,
              contactId: deal.primaryContactId,
              occurredAt: now,
            },
            update: {},
          });

          // Action B — automatic owner task (idempotent). No Accounting Case here.
          await ensureOwnerConfirmationTask(tx, {
            organizationId: schedule.organizationId,
            deal,
            lenderName: deal.lender?.displayName || deal.lender?.legalName,
            scheduleId: schedule.id,
            now,
          });

          await tx.enterprisePostDisbursementSchedule.update({
            where: { id: schedule.id },
            data: { status: "completed", processedAt: now },
          });
          return "transitioned";
        });
        results.push({ scheduleId: schedule.id, dealId: schedule.dealId, status: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown processing failure";
        await prisma.enterprisePostDisbursementSchedule.updateMany({
          where: { id: schedule.id, claimToken },
          data: { status: "pending", lastError: message, claimToken: null, claimedAt: null },
        });
        results.push({ scheduleId: schedule.id, dealId: schedule.dealId, status: "failed" });
      }
    }
    return {
      claimed: results.filter((item) => item.status !== "not_claimed").length,
      transitioned: results.filter((item) => item.status === "transitioned").length,
      results,
    };
  }

  async receiveConfirmation(
    dealId: string,
    input: ConfirmPostDisbursementInput,
    actorUserId: string,
  ) {
    if (!Number.isInteger(input.rowVersion) || input.rowVersion < 1) {
      throw Object.assign(new Error("rowVersion must be a positive integer"), {
        statusCode: 400,
        code: "INVALID_ROW_VERSION",
      });
    }
    const organizationId = await resolvePilotOrganizationId();
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const deal = await tx.enterpriseDeal.findFirst({
        where: { id: dealId, organizationId, isDeleted: false },
      });
      if (!deal) {
        throw Object.assign(new Error("Deal not found"), {
          statusCode: 404,
          code: "DEAL_NOT_FOUND",
        });
      }

      // Idempotent replay: already received → return existing Accounting Case.
      if (
        deal.grossStage === POST_DISBURSEMENT_CONFIRMATION_STAGE &&
        deal.subStage === POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.received
      ) {
        const existingCase = await tx.enterpriseAccountingCase.findUnique({
          where: { dealId: deal.id },
        });
        await completeOwnerConfirmationTasks(
          tx,
          organizationId,
          deal.id,
          actorUserId,
          now,
        );
        if (!existingCase) {
          throw Object.assign(
            new Error("Confirmation received but Accounting Case is missing"),
            { statusCode: 409, code: "ACCOUNTING_CASE_MISSING" },
          );
        }
        return {
          dealId: deal.id,
          grossStage: POST_DISBURSEMENT_CONFIRMATION_STAGE,
          subStage: POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.received,
          rowVersion: deal.rowVersion,
          accountingCaseId: existingCase.id,
          confirmedAt: existingCase.confirmedAt.toISOString(),
          idempotentReplay: true,
        };
      }

      if (
        deal.grossStage !== POST_DISBURSEMENT_CONFIRMATION_STAGE ||
        deal.subStage !== POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.pending
      ) {
        throw Object.assign(
          new Error("Deal must be in post-disbursement confirmation pending"),
          { statusCode: 409, code: "CONFIRMATION_NOT_PENDING" },
        );
      }

      const dealUpdate = await tx.enterpriseDeal.updateMany({
        where: {
          id: deal.id,
          organizationId,
          rowVersion: input.rowVersion,
          grossStage: POST_DISBURSEMENT_CONFIRMATION_STAGE,
          subStage: POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.pending,
        },
        data: {
          subStage: POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.received,
          updatedBy: actorUserId,
          rowVersion: { increment: 1 },
        },
      });
      if (dealUpdate.count === 0) {
        throw Object.assign(new Error("Deal changed; reload and retry"), {
          statusCode: 409,
          code: "DEAL_CONFLICT",
        });
      }

      const confirmed = accountingCasePayload(input, deal);
      const accountingCase = await tx.enterpriseAccountingCase.upsert({
        where: { dealId: deal.id },
        create: {
          organizationId,
          dealId: deal.id,
          status: "commercial_capture",
          ...confirmed,
          confirmationSource: "human",
          confirmedBy: actorUserId,
          confirmedAt: now,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
        update: {
          ...confirmed,
          status: "commercial_capture",
          confirmationSource: "human",
          confirmedBy: actorUserId,
          confirmedAt: now,
          updatedBy: actorUserId,
          rowVersion: { increment: 1 },
        },
      });

      await completeOwnerConfirmationTasks(
        tx,
        organizationId,
        deal.id,
        actorUserId,
        now,
      );

      const timeline = await tx.enterpriseDealTimelineEvent.create({
        data: {
          organizationId,
          dealId: deal.id,
          eventType: "post_disbursement_confirmation_received",
          occurredAt: now,
          actorUserId,
          summary: `Post-disbursement confirmation received for ${deal.dealNumber}`,
          payload: {
            fromSubStage: POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.pending,
            toSubStage: POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.received,
            accountingCaseId: accountingCase.id,
          },
        },
      });
      await tx.enterpriseActivityEvent.upsert({
        where: {
          organizationId_sourceSystem_sourceEventId: {
            organizationId,
            sourceSystem: POST_DISBURSEMENT_EVENT_SOURCE,
            sourceEventId: postDisbursementReceivedEventId(deal.id),
          },
        },
        create: {
          organizationId,
          eventKind: "stage_change",
          sourceSystem: POST_DISBURSEMENT_EVENT_SOURCE,
          sourceEventId: postDisbursementReceivedEventId(deal.id),
          title: "Post-Disbursement Confirmation Received",
          summary: `Lender confirmation recorded for Deal ${deal.dealNumber}`,
          payload: { timelineEventId: timeline.id, accountingCaseId: accountingCase.id },
          opportunityId: deal.opportunityId,
          dealId: deal.id,
          contactId: deal.primaryContactId,
          actorUserId,
          occurredAt: now,
        },
        update: {},
      });
      await tx.enterpriseActivityEvent.upsert({
        where: {
          organizationId_sourceSystem_sourceEventId: {
            organizationId,
            sourceSystem: POST_DISBURSEMENT_EVENT_SOURCE,
            sourceEventId: postDisbursementAccountingCreatedEventId(deal.id),
          },
        },
        create: {
          organizationId,
          eventKind: "accounting",
          sourceSystem: POST_DISBURSEMENT_EVENT_SOURCE,
          sourceEventId: postDisbursementAccountingCreatedEventId(deal.id),
          title: "Accounting Record Created",
          summary: `Accounting Case ${accountingCase.id} activated for Deal ${deal.dealNumber}`,
          payload: { accountingCaseId: accountingCase.id },
          opportunityId: deal.opportunityId,
          dealId: deal.id,
          contactId: deal.primaryContactId,
          actorUserId,
          occurredAt: now,
        },
        update: {},
      });
      return {
        dealId: deal.id,
        grossStage: POST_DISBURSEMENT_CONFIRMATION_STAGE,
        subStage: POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.received,
        rowVersion: input.rowVersion + 1,
        accountingCaseId: accountingCase.id,
        confirmedAt: now.toISOString(),
        idempotentReplay: false,
      };
    });
  }

  /** Owner Tasks module hydrate — durable Deal tasks for confirmation pending. */
  async listOpenOwnerConfirmationTasks(assigneeUserId: string) {
    const organizationId = await resolvePilotOrganizationId();
    const rows = await prisma.enterpriseDealTask.findMany({
      where: {
        organizationId,
        isDeleted: false,
        status: "open",
        assigneeUserId,
      },
      include: {
        deal: {
          select: {
            id: true,
            dealNumber: true,
            opportunityId: true,
            primaryContactName: true,
            productLabel: true,
            legacyLoanFileId: true,
            lenderId: true,
            lender: { select: { displayName: true, legalName: true } },
          },
        },
      },
      orderBy: { dueAt: "asc" },
      take: 100,
    });
    return rows.filter((row) => {
      const payload = row.payload as { autoRuleId?: string } | null;
      return payload?.autoRuleId === PDC_LENDER_CONFIRMATION_TASK.autoRuleId;
    });
  }
}

export const postDisbursementConfirmationService =
  new PostDisbursementConfirmationService();
