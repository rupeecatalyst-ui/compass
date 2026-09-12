import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import {
  ADVANTAGE_COMMITTED_CURRENCY,
  ADVANTAGE_COMMITTED_EVENT_KIND,
} from "@/constants/advantage-committed";
import {
  assertAdvantageCommittedCorrection,
  canViewAdvantageCommittedHistory,
  canonicalCommittedRupees,
  decideOrdinaryCommitmentMutation,
  isAdvantageCommittedApplicableProduct,
  compassAdvantageToCommitmentAmount,
  projectAdvantageCommitted,
  resolveAdvantageCommittedProductCode,
  serializeAdvantageCommittedApi,
} from "@/lib/advantage-committed";
import { OpportunityValidationError } from "@server/services/enterprise-opportunity/opportunity-validation";
import type { AdvantageCommittedHistoryEvent } from "@/types/advantage-committed";

const db = prisma as typeof prisma & {
  enterpriseOpportunityAdvantageCommitmentEvent: {
    create: (args: {
      data: Record<string, unknown>;
    }) => Promise<{ id: string; amount: { toString(): string }; previousAmount: { toString(): string } | null; eventKind: string; opportunityId: string; organizationId: string; currency: string; productCode: string | null; reason: string | null; requestedByUserId: string; approvedByUserId: string | null; originatingOpportunityId: string; originalCommitmentId: string | null; version: number; createdAt: Date }>;
    findMany: (args: Record<string, unknown>) => Promise<
      Array<{
        id: string;
        opportunityId: string;
        organizationId: string;
        eventKind: string;
        amount: { toString(): string };
        previousAmount: { toString(): string } | null;
        currency: string;
        productCode: string | null;
        reason: string | null;
        requestedByUserId: string;
        approvedByUserId: string | null;
        originatingOpportunityId: string;
        originalCommitmentId: string | null;
        version: number;
        createdAt: Date;
      }>
    >;
  };
};

type CommitmentColumns = {
  advantageCommittedAmount?: Prisma.Decimal | null;
  advantageCommittedCurrency?: string | null;
  advantageCommittedAt?: Date | null;
  advantageCommittedByUserId?: string | null;
  advantageCommittedProductCode?: string | null;
  advantageCommitmentId?: string | null;
  advantageCommitmentVersion?: number | null;
  marketingCampaignId?: string | null;
  marketingSourceDetail?: string | null;
  marketingProspectRef?: string | null;
};

export function rejectOrdinaryAdvantageCommittedMutation(
  existingAmount: unknown,
  body: Record<string, unknown>,
) {
  const decision = decideOrdinaryCommitmentMutation({
    existingAmount,
    incomingBody: body,
  });
  if (!decision.ok) {
    throw Object.assign(new OpportunityValidationError(decision.message), {
      code: decision.code,
      statusCode: 403,
    });
  }
}

export function pickCommitmentFromRow(row: Record<string, unknown> & CommitmentColumns) {
  return serializeAdvantageCommittedApi({
    id: String(row.id ?? ""),
    organizationId: String(row.organizationId ?? ""),
    productCode: (row.productCode as string | null) ?? null,
    productLabel: (row.productLabel as string | null) ?? null,
    advantageCommittedAmount: row.advantageCommittedAmount,
    advantageCommittedCurrency: row.advantageCommittedCurrency,
    advantageCommittedAt: row.advantageCommittedAt,
    advantageCommittedByUserId: row.advantageCommittedByUserId,
    advantageCommittedProductCode: row.advantageCommittedProductCode,
    advantageCommitmentId: row.advantageCommitmentId,
    advantageCommitmentVersion: row.advantageCommitmentVersion,
    sourceCode: (row.sourceCode as string | null) ?? null,
    sourceCampaignLabel: (row.sourceCampaignLabel as string | null) ?? null,
    marketingCampaignId: row.marketingCampaignId,
    marketingSourceDetail: row.marketingSourceDetail,
    marketingProspectRef: row.marketingProspectRef,
  });
}

export function marketingAttributionCreatePatch(input: {
  campaignId?: string | null;
  campaignName?: string | null;
  sourceCode?: string | null;
  sourceDetail?: string | null;
  prospectRef?: string | null;
}) {
  return {
    sourceCode: input.sourceCode?.trim() || "marketing_engine",
    sourceCampaignLabel: input.campaignName?.trim() || null,
    marketingCampaignId: input.campaignId?.trim() || null,
    marketingSourceDetail: input.sourceDetail?.trim() || null,
    marketingProspectRef: input.prospectRef?.trim() || null,
  };
}

export function initialCommitmentCreatePatch(input: {
  authorizedAmount?: unknown;
  productCode?: string | null;
  productLabel?: string | null;
  actorUserId: string;
  now?: Date;
}): Record<string, unknown> | null {
  const amount = canonicalCommittedRupees(input.authorizedAmount);
  if (!amount) return null;
  const product =
    resolveAdvantageCommittedProductCode(input.productCode, input.productLabel) ??
    null;
  if (!product && !isAdvantageCommittedApplicableProduct(input.productCode, input.productLabel)) {
    return null;
  }
  const now = input.now ?? new Date();
  return {
    advantageCommittedAmount: new Prisma.Decimal(amount),
    advantageCommittedCurrency: ADVANTAGE_COMMITTED_CURRENCY,
    advantageCommittedAt: now,
    advantageCommittedByUserId: input.actorUserId,
    advantageCommittedProductCode: product,
    advantageCommitmentVersion: 1,
  };
}

export async function commitAdvantageFromMarketing(input: {
  organizationId: string;
  opportunityId: string;
  authorizedAmount?: unknown;
  productCode?: string | null;
  productLabel?: string | null;
  actorUserId: string;
  campaignId?: string | null;
  campaignName?: string | null;
  sourceCode?: string | null;
  sourceDetail?: string | null;
  prospectRef?: string | null;
}) {
  const attribution = marketingAttributionCreatePatch(input);
  const commitment = initialCommitmentCreatePatch(input);
  const data: Record<string, unknown> = { ...attribution };
  if (commitment) Object.assign(data, commitment);

  const updated = await prisma.enterpriseOpportunity.update({
    where: { id: input.opportunityId },
    data: data as Prisma.EnterpriseOpportunityUncheckedUpdateInput,
  });

  if (commitment) {
    const event = await db.enterpriseOpportunityAdvantageCommitmentEvent.create({
      data: {
        organizationId: input.organizationId,
        opportunityId: input.opportunityId,
        eventKind: ADVANTAGE_COMMITTED_EVENT_KIND.ORIGINAL_COMMIT,
        amount: new Prisma.Decimal(String(commitment.advantageCommittedAmount)),
        previousAmount: null,
        currency: ADVANTAGE_COMMITTED_CURRENCY,
        productCode: (commitment.advantageCommittedProductCode as string | null) ?? null,
        reason: "Marketing qualification — authorised Compass Advantage communicated to customer.",
        requestedByUserId: input.actorUserId,
        approvedByUserId: input.actorUserId,
        originatingOpportunityId: input.opportunityId,
        originalCommitmentId: null,
        version: 1,
      },
    });
    await prisma.enterpriseOpportunity.update({
      where: { id: input.opportunityId },
      data: {
        advantageCommitmentId: event.id,
      } as Prisma.EnterpriseOpportunityUncheckedUpdateInput,
    });
    return { opportunity: updated, event };
  }
  return { opportunity: updated, event: null };
}

export async function commitAdvantageFromCompass(input: {
  organizationId: string;
  opportunityId: string;
  eligible?: boolean;
  status?: string | null;
  authorizedAmount?: unknown;
  productCode?: string | null;
  productLabel?: string | null;
  actorUserId: string;
}) {
  const amount = compassAdvantageToCommitmentAmount({
    eligible: input.eligible,
    status: input.status,
    totalAdvantageAmount:
      typeof input.authorizedAmount === "string" || typeof input.authorizedAmount === "number"
        ? input.authorizedAmount
        : null,
  });
  if (!amount) return { skipped: "no_amount" as const, opportunity: null, event: null };

  const existing = await prisma.enterpriseOpportunity.findUnique({
    where: { id: input.opportunityId },
    select: { advantageCommittedAmount: true },
  });
  if (canonicalCommittedRupees(existing?.advantageCommittedAmount)) {
    return { skipped: "already_committed" as const, opportunity: existing, event: null };
  }

  const commitment = initialCommitmentCreatePatch({
    authorizedAmount: amount,
    productCode: input.productCode,
    productLabel: input.productLabel,
    actorUserId: input.actorUserId,
  });
  if (!commitment) return { skipped: "not_applicable" as const, opportunity: existing, event: null };

  const updated = await prisma.enterpriseOpportunity.update({
    where: { id: input.opportunityId },
    data: commitment as Prisma.EnterpriseOpportunityUncheckedUpdateInput,
  });

  const event = await db.enterpriseOpportunityAdvantageCommitmentEvent.create({
    data: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      eventKind: ADVANTAGE_COMMITTED_EVENT_KIND.ORIGINAL_COMMIT,
      amount: new Prisma.Decimal(String(commitment.advantageCommittedAmount)),
      previousAmount: null,
      currency: ADVANTAGE_COMMITTED_CURRENCY,
      productCode: (commitment.advantageCommittedProductCode as string | null) ?? null,
      reason: "COMPASS journey — Advantage calculated for this Opportunity.",
      requestedByUserId: input.actorUserId,
      approvedByUserId: input.actorUserId,
      originatingOpportunityId: input.opportunityId,
      originalCommitmentId: null,
      version: 1,
    },
  });
  await prisma.enterpriseOpportunity.update({
    where: { id: input.opportunityId },
    data: {
      advantageCommitmentId: event.id,
    } as Prisma.EnterpriseOpportunityUncheckedUpdateInput,
  });
  return { skipped: null, opportunity: updated, event };
}

export async function listAdvantageCommitmentHistory(input: {
  organizationId: string;
  opportunityId: string;
  role?: string | null;
}): Promise<AdvantageCommittedHistoryEvent[]> {
  if (!canViewAdvantageCommittedHistory(input.role)) return [];
  const rows = await db.enterpriseOpportunityAdvantageCommitmentEvent.findMany({
    where: { organizationId: input.organizationId, opportunityId: input.opportunityId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    opportunityId: row.opportunityId,
    organizationId: row.organizationId,
    eventKind: row.eventKind as AdvantageCommittedHistoryEvent["eventKind"],
    amount: row.amount.toString(),
    previousAmount: row.previousAmount?.toString() ?? null,
    currency: "INR",
    productCode: row.productCode,
    reason: row.reason,
    requestedByUserId: row.requestedByUserId,
    approvedByUserId: row.approvedByUserId,
    originatingOpportunityId: row.originatingOpportunityId,
    originalCommitmentId: row.originalCommitmentId,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function correctAdvantageCommitted(input: {
  organizationId: string;
  opportunityId: string;
  role: string;
  originalAmount: string;
  revisedAmount: string;
  reason: string;
  requestedByUserId: string;
  approvedByUserId: string;
}) {
  const existing = await prisma.enterpriseOpportunity.findFirst({
    where: { id: input.opportunityId, organizationId: input.organizationId, isDeleted: false },
  });
  if (!existing) {
    throw Object.assign(new Error("Opportunity not found"), {
      statusCode: 404,
      code: "OPPORTUNITY_NOT_FOUND",
    });
  }
  const existingAmount = (existing as CommitmentColumns).advantageCommittedAmount;
  const validated = assertAdvantageCommittedCorrection({
    role: input.role,
    existingAmount,
    originalAmount: input.originalAmount,
    revisedAmount: input.revisedAmount,
    reason: input.reason,
    requestedByUserId: input.requestedByUserId,
    approvedByUserId: input.approvedByUserId,
  });
  const nextVersion = ((existing as CommitmentColumns).advantageCommitmentVersion ?? 0) + 1;
  const originalId = (existing as CommitmentColumns).advantageCommitmentId ?? null;
  const event = await db.enterpriseOpportunityAdvantageCommitmentEvent.create({
      data: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      eventKind: ADVANTAGE_COMMITTED_EVENT_KIND.CORRECTION,
      amount: new Prisma.Decimal(validated.revised),
      previousAmount: new Prisma.Decimal(validated.original),
      currency: ADVANTAGE_COMMITTED_CURRENCY,
      productCode: (existing as CommitmentColumns).advantageCommittedProductCode ?? existing.productCode,
      reason: validated.reason,
      requestedByUserId: input.requestedByUserId,
      approvedByUserId: input.approvedByUserId,
      originatingOpportunityId: existing.id,
      originalCommitmentId: originalId,
      version: nextVersion,
    },
  });
  const updated = await prisma.enterpriseOpportunity.update({
    where: { id: existing.id },
    data: {
      advantageCommittedAmount: new Prisma.Decimal(validated.revised),
      advantageCommittedCurrency: ADVANTAGE_COMMITTED_CURRENCY,
      advantageCommitmentVersion: nextVersion,
      updatedBy: input.approvedByUserId,
    } as Prisma.EnterpriseOpportunityUncheckedUpdateInput,
  });
  return {
    opportunity: updated,
    event,
    projection: projectAdvantageCommitted({
      id: updated.id,
      organizationId: updated.organizationId,
      productCode: updated.productCode,
      productLabel: updated.productLabel,
      advantageCommittedAmount: validated.revised,
      advantageCommittedCurrency: ADVANTAGE_COMMITTED_CURRENCY,
      advantageCommittedAt: (updated as CommitmentColumns).advantageCommittedAt,
      advantageCommittedByUserId: (updated as CommitmentColumns).advantageCommittedByUserId,
      advantageCommittedProductCode: (updated as CommitmentColumns).advantageCommittedProductCode,
      advantageCommitmentId: originalId,
      advantageCommitmentVersion: nextVersion,
      sourceCode: updated.sourceCode,
      sourceCampaignLabel: updated.sourceCampaignLabel,
      marketingCampaignId: (updated as CommitmentColumns).marketingCampaignId,
      marketingSourceDetail: (updated as CommitmentColumns).marketingSourceDetail,
      marketingProspectRef: (updated as CommitmentColumns).marketingProspectRef,
    }),
  };
}

export async function loadOpportunityCommitmentByIds(
  organizationId: string,
  opportunityIds: string[],
) {
  const ids = [...new Set(opportunityIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, ReturnType<typeof pickCommitmentFromRow>>();
  const rows = await prisma.enterpriseOpportunity.findMany({
    where: { organizationId, id: { in: ids }, isDeleted: false },
  });
  const map = new Map<string, ReturnType<typeof pickCommitmentFromRow>>();
  for (const row of rows) {
    map.set(row.id, pickCommitmentFromRow(row as Record<string, unknown> & CommitmentColumns));
  }
  return map;
}
