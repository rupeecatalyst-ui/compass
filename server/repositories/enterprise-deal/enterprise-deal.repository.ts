/**
 * CO-ARCH-002-W1/W2 — Enterprise Deal Engine repository (no UI).
 * Append-only timeline & snapshots enforced here.
 */
import type {
  DealCounterpartyType,
  DealDocumentLinkStatus,
  DealLifecycleStatus,
  DealOperationalStatus,
  DealPriority,
  DealProductFamily,
  Prisma,
} from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { ENTERPRISE_DEAL_SOFT_DELETE_MODULE } from "@/constants/enterprise-deal-registry";
import type { EnterpriseDealSearchQuery } from "@/types/enterprise-deal";
import { allocateDealNumber } from "@server/services/enterprise-deal/deal-number.service";
import {
  DealConflictError,
  DealNotFoundError,
  DealValidationError,
} from "@server/services/enterprise-deal/deal-validation";

export type CreateEnterpriseDealInput = {
  organizationId: string;
  productFamily: DealProductFamily;
  grossStage: string;
  /** CO-ARCH-003 BI-2 — required */
  opportunityId: string;
  /** CO-ARCH-003 BI-3 — required */
  lenderId: string;
  lenderProgramId?: string | null;
  actorUserId?: string | null;
  legacyLoanFileId?: string | null;
  fileNumber?: string | null;
  productId?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
  transactionType?: string | null;
  lifecyclePhase?: string | null;
  subStage?: string | null;
  primaryContactId?: string | null;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  companyId?: string | null;
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
  primaryOwnerUserId?: string | null;
  priority?: DealPriority;
  requestedAmount?: Prisma.Decimal | number | null;
  currencyCode?: string;
  snapshot?: Prisma.InputJsonValue | null;
  lendingExtension?: Prisma.InputJsonValue | null;
  commercialTerms?: Prisma.InputJsonValue | null;
  primaryCounterpartyName?: string | null;
  invoicePartyType?: string | null;
  invoicePartySpecify?: string | null;
  invoicePartyContactId?: string | null;
  invoicePartyId?: string | null;
};

function buildWorkingSnapshot(input: CreateEnterpriseDealInput): Prisma.InputJsonValue {
  if (input.snapshot) return input.snapshot;
  return {
    primaryContact: {
      id: input.primaryContactId ?? null,
      name: input.primaryContactName ?? null,
      mobile: input.primaryContactMobile ?? null,
      email: input.primaryContactEmail ?? null,
    },
    product: {
      id: input.productId ?? null,
      code: input.productCode ?? null,
      label: input.productLabel ?? null,
      family: input.productFamily,
      transactionType: input.transactionType ?? null,
    },
    stage: {
      grossStage: input.grossStage,
      subStage: input.subStage ?? null,
      lifecyclePhase: input.lifecyclePhase ?? null,
    },
  };
}

export class EnterpriseDealRepository {
  async findById(organizationId: string, dealId: string, opts?: { includeDeleted?: boolean }) {
    return prisma.enterpriseDeal.findFirst({
      where: {
        id: dealId,
        organizationId,
        ...(opts?.includeDeleted ? {} : { isDeleted: false }),
      },
    });
  }

  async findByLegacyLoanFileId(organizationId: string, legacyLoanFileId: string) {
    // Prefer an active per-lender Deal; fall back to any non-deleted bridge row
    const withLender = await prisma.enterpriseDeal.findFirst({
      where: {
        organizationId,
        legacyLoanFileId,
        isDeleted: false,
        lenderId: { not: null },
      },
      orderBy: { createdAt: "asc" },
    });
    if (withLender) return withLender;
    return prisma.enterpriseDeal.findFirst({
      where: { organizationId, legacyLoanFileId, isDeleted: false },
      orderBy: { createdAt: "asc" },
    });
  }

  async findManyByLegacyLoanFileId(organizationId: string, legacyLoanFileId: string) {
    return prisma.enterpriseDeal.findMany({
      where: { organizationId, legacyLoanFileId, isDeleted: false },
      orderBy: { createdAt: "asc" },
    });
  }

  async findByOpportunityAndLender(
    organizationId: string,
    opportunityId: string,
    lenderId: string,
  ) {
    return prisma.enterpriseDeal.findFirst({
      where: {
        organizationId,
        opportunityId,
        lenderId,
        isDeleted: false,
      },
    });
  }

  /** CO-ARCH-007 — All lender Deals for an Opportunity (SSOT list). */
  async listByOpportunity(organizationId: string, opportunityId: string) {
    return prisma.enterpriseDeal.findMany({
      where: {
        organizationId,
        opportunityId,
        isDeleted: false,
        lenderId: { not: null },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "asc" }],
    });
  }

  async findByDealNumber(organizationId: string, dealNumber: string) {
    return prisma.enterpriseDeal.findFirst({
      where: { organizationId, dealNumber, isDeleted: false },
    });
  }

  /**
   * Creates a Deal with immutable Deal Number, working snapshot, historical snapshot v1,
   * and append-only timeline event `deal_created`. Health fields remain null (ARB A3).
   */
  async createDeal(input: CreateEnterpriseDealInput) {
    if (!input.opportunityId?.trim()) {
      throw new DealValidationError("opportunityId is required (BI-2)");
    }
    if (!input.lenderId?.trim()) {
      throw new DealValidationError("lenderId is required (BI-3)");
    }

    const opportunity = await prisma.enterpriseOpportunity.findFirst({
      where: {
        id: input.opportunityId,
        organizationId: input.organizationId,
        isDeleted: false,
      },
    });
    if (!opportunity) {
      throw new DealValidationError("opportunityId must reference a valid Opportunity");
    }

    const lender = await prisma.enterpriseLender.findFirst({
      where: {
        id: input.lenderId,
        organizationId: input.organizationId,
        isDeleted: false,
      },
    });
    if (!lender) {
      throw new DealValidationError("lenderId must reference a valid Lender");
    }

    if (input.lenderProgramId) {
      const program = await prisma.enterpriseLenderProgram.findFirst({
        where: {
          id: input.lenderProgramId,
          organizationId: input.organizationId,
          lenderId: input.lenderId,
          isDeleted: false,
        },
      });
      if (!program) {
        throw new DealValidationError("lenderProgramId must belong to the selected Lender");
      }
    }

    const existingPair = await this.findByOpportunityAndLender(
      input.organizationId,
      input.opportunityId,
      input.lenderId,
    );
    if (existingPair) return existingPair;

    const dealNumber = await allocateDealNumber(input.organizationId);
    const now = new Date();
    const snapshot = buildWorkingSnapshot(input);
    const actor = input.actorUserId ?? null;

    return prisma.$transaction(async (tx) => {
      const deal = await tx.enterpriseDeal.create({
        data: {
          organizationId: input.organizationId,
          dealNumber,
          opportunityId: input.opportunityId,
          lenderId: input.lenderId,
          lenderProgramId: input.lenderProgramId ?? null,
          legacyLoanFileId: input.legacyLoanFileId ?? null,
          fileNumber: input.fileNumber ?? null,
          productFamily: input.productFamily,
          productId: input.productId ?? opportunity.productId ?? null,
          productCode: input.productCode ?? opportunity.productCode ?? null,
          productLabel: input.productLabel ?? opportunity.productLabel ?? null,
          transactionType: input.transactionType ?? opportunity.transactionType ?? null,
          lifecyclePhase: input.lifecyclePhase ?? null,
          grossStage: input.grossStage,
          subStage: input.subStage ?? null,
          lifecycleStatus: "active" satisfies DealLifecycleStatus,
          operationalStatus: "on_track" satisfies DealOperationalStatus,
          stageEnteredAt: now,
          primaryContactId:
            input.primaryContactId ?? opportunity.primaryContactId ?? null,
          primaryContactName:
            input.primaryContactName ?? opportunity.primaryContactName ?? null,
          primaryContactMobile:
            input.primaryContactMobile ?? opportunity.primaryContactMobile ?? null,
          primaryContactEmail:
            input.primaryContactEmail ?? opportunity.primaryContactEmail ?? null,
          companyId: input.companyId ?? opportunity.companyId ?? null,
          relationshipManagerUserId:
            input.relationshipManagerUserId ??
            opportunity.relationshipManagerUserId ??
            null,
          relationshipManagerName:
            input.relationshipManagerName ??
            opportunity.relationshipManagerName ??
            null,
          primaryOwnerUserId: input.primaryOwnerUserId ?? null,
          priority: input.priority ?? "medium",
          requestedAmount: input.requestedAmount ?? opportunity.requestedAmount ?? null,
          currencyCode: input.currencyCode ?? opportunity.currencyCode ?? "INR",
          snapshot,
          lendingExtension: input.lendingExtension ?? undefined,
          commercialTerms: input.commercialTerms ?? undefined,
          primaryCounterpartyType: "lender",
          primaryCounterpartyId: input.lenderId,
          primaryCounterpartyName:
            input.primaryCounterpartyName ??
            lender.displayName ??
            lender.label ??
            lender.legalName,
          primaryCounterpartyProgramId: input.lenderProgramId ?? null,
          invoicePartyType: input.invoicePartyType ?? null,
          invoicePartySpecify: input.invoicePartySpecify ?? null,
          invoicePartyContactId: input.invoicePartyContactId ?? null,
          invoicePartyId: input.invoicePartyId ?? null,
          healthScore: null,
          healthBand: null,
          healthComputedAt: null,
          healthPayload: undefined,
          createdBy: actor,
          updatedBy: actor,
        },
      });

      await tx.enterpriseDealSnapshot.create({
        data: {
          organizationId: input.organizationId,
          dealId: deal.id,
          versionNumber: 1,
          reason: "deal_created",
          snapshot,
          createdBy: actor,
        },
      });

      await tx.enterpriseDealTimelineEvent.create({
        data: {
          organizationId: input.organizationId,
          dealId: deal.id,
          eventType: "deal_created",
          occurredAt: now,
          actorUserId: actor,
          summary: `Deal ${dealNumber} created for lender ${lender.code}`,
          payload: {
            dealNumber,
            productFamily: input.productFamily,
            grossStage: input.grossStage,
            opportunityId: input.opportunityId,
            lenderId: input.lenderId,
          },
        },
      });

      return deal;
    });
  }

  /** ARB A2 — append-only timeline (no update/delete API). */
  async appendTimelineEvent(input: {
    organizationId: string;
    dealId: string;
    eventType: string;
    summary: string;
    actorUserId?: string | null;
    occurredAt?: Date;
    payload?: Prisma.InputJsonValue;
  }) {
    return prisma.enterpriseDealTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        dealId: input.dealId,
        eventType: input.eventType,
        occurredAt: input.occurredAt ?? new Date(),
        actorUserId: input.actorUserId ?? null,
        summary: input.summary,
        payload: input.payload ?? undefined,
      },
    });
  }

  /** ARB A1 — append historical snapshot (never mutate prior versions). */
  async appendSnapshot(input: {
    organizationId: string;
    dealId: string;
    reason: string;
    snapshot: Prisma.InputJsonValue;
    actorUserId?: string | null;
  }) {
    const latest = await prisma.enterpriseDealSnapshot.findFirst({
      where: { dealId: input.dealId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const versionNumber = (latest?.versionNumber ?? 0) + 1;

    const [row] = await prisma.$transaction([
      prisma.enterpriseDealSnapshot.create({
        data: {
          organizationId: input.organizationId,
          dealId: input.dealId,
          versionNumber,
          reason: input.reason,
          snapshot: input.snapshot,
          createdBy: input.actorUserId ?? null,
        },
      }),
      prisma.enterpriseDeal.update({
        where: { id: input.dealId },
        data: {
          snapshot: input.snapshot,
          updatedBy: input.actorUserId ?? null,
          versionNumber: { increment: 1 },
          rowVersion: { increment: 1 },
        },
      }),
    ]);

    return row;
  }

  async softDeleteDeal(input: {
    organizationId: string;
    dealId: string;
    actorUserId: string;
    actorName?: string | null;
    reason?: string | null;
  }) {
    const deal = await this.findById(input.organizationId, input.dealId);
    if (!deal) return null;
    if (deal.isDeleted) return deal;

    const now = new Date();
    const label = `${deal.dealNumber}${deal.primaryContactName ? ` · ${deal.primaryContactName}` : ""}`;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.enterpriseDeal.update({
        where: { id: deal.id },
        data: {
          isDeleted: true,
          deletedAt: now,
          deletedBy: input.actorUserId,
          deletionReason: input.reason ?? null,
          updatedBy: input.actorUserId,
          rowVersion: { increment: 1 },
        },
      });

      await tx.enterpriseSoftDeleteRecord.upsert({
        where: {
          organizationId_module_entityId: {
            organizationId: input.organizationId,
            module: ENTERPRISE_DEAL_SOFT_DELETE_MODULE,
            entityId: deal.id,
          },
        },
        create: {
          organizationId: input.organizationId,
          module: ENTERPRISE_DEAL_SOFT_DELETE_MODULE,
          entityId: deal.id,
          entityLabel: label,
          ownerName: deal.relationshipManagerName,
          deletedBy: input.actorUserId,
          deletedByName: input.actorName ?? null,
          deletedAt: now,
          deletionReason: input.reason ?? null,
          status: "deleted",
        },
        update: {
          entityLabel: label,
          deletedBy: input.actorUserId,
          deletedByName: input.actorName ?? null,
          deletedAt: now,
          deletionReason: input.reason ?? null,
          status: "deleted",
          restoredAt: null,
          restoredBy: null,
        },
      });

      await tx.enterpriseSoftDeleteAudit.create({
        data: {
          organizationId: input.organizationId,
          module: ENTERPRISE_DEAL_SOFT_DELETE_MODULE,
          entityId: deal.id,
          entityLabel: label,
          action: "soft_deleted",
          actorUserId: input.actorUserId,
          actorName: input.actorName ?? null,
          reason: input.reason ?? null,
          at: now,
        },
      });

      await tx.enterpriseDealTimelineEvent.create({
        data: {
          organizationId: input.organizationId,
          dealId: deal.id,
          eventType: "soft_deleted",
          occurredAt: now,
          actorUserId: input.actorUserId,
          summary: `Deal ${deal.dealNumber} soft-deleted`,
          payload: { reason: input.reason ?? null },
        },
      });

      return updated;
    });
  }

  async listTimeline(organizationId: string, dealId: string, take = 50) {
    return prisma.enterpriseDealTimelineEvent.findMany({
      where: { organizationId, dealId },
      orderBy: { occurredAt: "desc" },
      take,
    });
  }

  async listSnapshots(organizationId: string, dealId: string, take = 50) {
    return prisma.enterpriseDealSnapshot.findMany({
      where: { organizationId, dealId },
      orderBy: { versionNumber: "desc" },
      take,
    });
  }

  async requireDeal(organizationId: string, dealId: string, opts?: { includeDeleted?: boolean }) {
    const deal = await this.findById(organizationId, dealId, opts);
    if (!deal) throw new DealNotFoundError();
    return deal;
  }

  async searchDeals(organizationId: string, query: EnterpriseDealSearchQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const where: Prisma.EnterpriseDealWhereInput = {
      organizationId,
      isDeleted: query.includeDeleted ? undefined : false,
    };

    if (query.archived !== undefined) where.archived = query.archived;
    if (query.legacyLoanFileId) where.legacyLoanFileId = query.legacyLoanFileId;
    if (query.productFamily) where.productFamily = query.productFamily;
    if (query.productId) where.productId = query.productId;
    if (query.grossStage) where.grossStage = query.grossStage;
    if (query.subStage) where.subStage = query.subStage;
    if (query.lifecycleStatus) where.lifecycleStatus = query.lifecycleStatus;
    if (query.operationalStatus) where.operationalStatus = query.operationalStatus;
    if (query.priority) where.priority = query.priority;
    if (query.assignedRmUserId) where.relationshipManagerUserId = query.assignedRmUserId;
    if (query.primaryContactId) where.primaryContactId = query.primaryContactId;
    if (query.dateCreatedFrom || query.dateCreatedTo) {
      where.createdAt = {
        ...(query.dateCreatedFrom ? { gte: new Date(query.dateCreatedFrom) } : {}),
        ...(query.dateCreatedTo ? { lte: new Date(query.dateCreatedTo) } : {}),
      };
    }
    if (query.updatedFrom || query.updatedTo) {
      where.updatedAt = {
        ...(query.updatedFrom ? { gte: new Date(query.updatedFrom) } : {}),
        ...(query.updatedTo ? { lte: new Date(query.updatedTo) } : {}),
      };
    }
    const andFilters: Prisma.EnterpriseDealWhereInput[] = [];
    if (query.q?.trim()) {
      const q = query.q.trim();
      andFilters.push({
        OR: [
          { dealNumber: { contains: q, mode: "insensitive" } },
          { fileNumber: { contains: q, mode: "insensitive" } },
          { primaryContactName: { contains: q, mode: "insensitive" } },
          { primaryContactMobile: { contains: q, mode: "insensitive" } },
          { productLabel: { contains: q, mode: "insensitive" } },
          { productCode: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (query.scope === "my" && query.scopeUserId) {
      andFilters.push({
        OR: [
          { relationshipManagerUserId: query.scopeUserId },
          { primaryOwnerUserId: query.scopeUserId },
        ],
      });
    }
    if (andFilters.length > 0) where.AND = andFilters
    if (query.counterpartyType || query.counterpartyId) {
      where.counterpartyAssignments = {
        some: {
          isDeleted: false,
          ...(query.counterpartyType ? { counterpartyType: query.counterpartyType } : {}),
          ...(query.counterpartyId
            ? { counterpartyRegistryId: query.counterpartyId }
            : {}),
        },
      };
    }

    let orderBy: Prisma.EnterpriseDealOrderByWithRelationInput = { updatedAt: "desc" };
    switch (query.sort) {
      case "updatedAt_asc":
        orderBy = { updatedAt: "asc" };
        break;
      case "createdAt_desc":
        orderBy = { createdAt: "desc" };
        break;
      case "dealNumber_asc":
        orderBy = { dealNumber: "asc" };
        break;
      default:
        orderBy = { updatedAt: "desc" };
    }

    const [total, items] = await Promise.all([
      prisma.enterpriseDeal.count({ where }),
      prisma.enterpriseDeal.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          opportunity: {
            select: { opportunityNumber: true },
          },
        },
      }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
  }

  async updateDealOptimistic(
    organizationId: string,
    dealId: string,
    rowVersion: number,
    data: Prisma.EnterpriseDealUncheckedUpdateManyInput,
  ) {
    const result = await prisma.enterpriseDeal.updateMany({
      where: { id: dealId, organizationId, rowVersion, isDeleted: false },
      data: {
        ...data,
        rowVersion: { increment: 1 },
      },
    });
    if (result.count === 0) {
      const exists = await this.findById(organizationId, dealId);
      if (!exists) throw new DealNotFoundError();
      throw new DealConflictError();
    }
    return this.requireDeal(organizationId, dealId);
  }

  async archiveDeal(input: {
    organizationId: string;
    dealId: string;
    actorUserId: string;
    reason?: string | null;
  }) {
    const deal = await this.requireDeal(input.organizationId, input.dealId);
    const now = new Date();
    const updated = await this.updateDealOptimistic(
      input.organizationId,
      input.dealId,
      deal.rowVersion,
      {
        archived: true,
        archivedAt: now,
        archivedBy: input.actorUserId,
        lifecycleStatus: "archived",
        updatedBy: input.actorUserId,
      },
    );
    await this.appendTimelineEvent({
      organizationId: input.organizationId,
      dealId: input.dealId,
      eventType: "archived",
      summary: `Deal ${deal.dealNumber} archived`,
      actorUserId: input.actorUserId,
      payload: { reason: input.reason ?? null },
    });
    return updated;
  }

  async restoreDeal(input: {
    organizationId: string;
    dealId: string;
    actorUserId: string;
    actorName?: string | null;
    reason?: string | null;
  }) {
    const deal = await this.requireDeal(input.organizationId, input.dealId, {
      includeDeleted: true,
    });
    const now = new Date();
    const wasDeleted = deal.isDeleted;
    const wasArchived = deal.archived;

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.enterpriseDeal.update({
        where: { id: deal.id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
          archived: false,
          archivedAt: null,
          archivedBy: null,
          lifecycleStatus: deal.lifecycleStatus === "archived" ? "active" : deal.lifecycleStatus,
          updatedBy: input.actorUserId,
          rowVersion: { increment: 1 },
        },
      });

      if (wasDeleted) {
        await tx.enterpriseSoftDeleteRecord.updateMany({
          where: {
            organizationId: input.organizationId,
            module: ENTERPRISE_DEAL_SOFT_DELETE_MODULE,
            entityId: deal.id,
            status: "deleted",
          },
          data: {
            status: "restored",
            restoredAt: now,
            restoredBy: input.actorUserId,
          },
        });
        await tx.enterpriseSoftDeleteAudit.create({
          data: {
            organizationId: input.organizationId,
            module: ENTERPRISE_DEAL_SOFT_DELETE_MODULE,
            entityId: deal.id,
            entityLabel: `${deal.dealNumber}`,
            action: "restored",
            actorUserId: input.actorUserId,
            actorName: input.actorName ?? null,
            reason: input.reason ?? null,
            at: now,
          },
        });
      }

      await tx.enterpriseDealTimelineEvent.create({
        data: {
          organizationId: input.organizationId,
          dealId: deal.id,
          eventType: "restored",
          occurredAt: now,
          actorUserId: input.actorUserId,
          summary: `Deal ${deal.dealNumber} restored`,
          payload: {
            reason: input.reason ?? null,
            wasDeleted,
            wasArchived,
          },
        },
      });

      return row;
    });

    return updated;
  }

  async transitionDeal(input: {
    organizationId: string;
    dealId: string;
    rowVersion: number;
    actorUserId: string;
    toGrossStage: string;
    toSubStage?: string | null;
    toLifecycleStatus?: DealLifecycleStatus;
    toOperationalStatus?: DealOperationalStatus;
    reason?: string | null;
  }) {
    const deal = await this.requireDeal(input.organizationId, input.dealId);
    if (deal.rowVersion !== input.rowVersion) throw new DealConflictError();

    const now = new Date();
    const stageChanged = deal.grossStage !== input.toGrossStage;
    const updated = await this.updateDealOptimistic(
      input.organizationId,
      input.dealId,
      input.rowVersion,
      {
        grossStage: input.toGrossStage,
        subStage: input.toSubStage === undefined ? deal.subStage : input.toSubStage,
        ...(input.toLifecycleStatus ? { lifecycleStatus: input.toLifecycleStatus } : {}),
        ...(input.toOperationalStatus ? { operationalStatus: input.toOperationalStatus } : {}),
        ...(stageChanged
          ? { stageEnteredAt: now, daysInStage: 0 }
          : {}),
        updatedBy: input.actorUserId,
      },
    );

    await this.appendTimelineEvent({
      organizationId: input.organizationId,
      dealId: input.dealId,
      eventType: "stage_transition",
      summary: `Stage ${deal.grossStage} → ${input.toGrossStage}`,
      actorUserId: input.actorUserId,
      payload: {
        fromGrossStage: deal.grossStage,
        toGrossStage: input.toGrossStage,
        fromSubStage: deal.subStage,
        toSubStage: input.toSubStage ?? null,
        fromLifecycleStatus: deal.lifecycleStatus,
        toLifecycleStatus: input.toLifecycleStatus ?? null,
        reason: input.reason ?? null,
      },
    });

    if (stageChanged) {
      await this.appendSnapshot({
        organizationId: input.organizationId,
        dealId: input.dealId,
        reason: "stage_transition",
        snapshot: (updated.snapshot as Prisma.InputJsonValue) ?? {},
        actorUserId: input.actorUserId,
      });
    }

    return this.requireDeal(input.organizationId, input.dealId);
  }

  // --- Counterparties ---

  async listCounterparties(organizationId: string, dealId: string) {
    return prisma.enterpriseDealCounterpartyAssignment.findMany({
      where: { organizationId, dealId, isDeleted: false },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
  }

  async createCounterparty(input: {
    organizationId: string;
    dealId: string;
    counterpartyType: DealCounterpartyType;
    counterpartyRegistryId: string;
    programId?: string | null;
    isPrimary?: boolean;
    pipelineStage?: string | null;
    pipelineSubStage?: string | null;
    applicationRef?: string | null;
    extension?: Prisma.InputJsonValue;
    actorUserId: string;
  }) {
    await this.requireDeal(input.organizationId, input.dealId);

    return prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.enterpriseDealCounterpartyAssignment.updateMany({
          where: { dealId: input.dealId, isDeleted: false, isPrimary: true },
          data: { isPrimary: false, updatedBy: input.actorUserId },
        });
      }

      const row = await tx.enterpriseDealCounterpartyAssignment.create({
        data: {
          organizationId: input.organizationId,
          dealId: input.dealId,
          counterpartyType: input.counterpartyType,
          counterpartyRegistryId: input.counterpartyRegistryId,
          programId: input.programId ?? null,
          isPrimary: input.isPrimary ?? false,
          pipelineStage: input.pipelineStage ?? null,
          pipelineSubStage: input.pipelineSubStage ?? null,
          applicationRef: input.applicationRef ?? null,
          extension: input.extension ?? undefined,
          createdBy: input.actorUserId,
          updatedBy: input.actorUserId,
        },
      });

      if (input.isPrimary) {
        await tx.enterpriseDeal.update({
          where: { id: input.dealId },
          data: {
            primaryCounterpartyType: input.counterpartyType,
            primaryCounterpartyId: input.counterpartyRegistryId,
            primaryCounterpartyProgramId: input.programId ?? null,
            updatedBy: input.actorUserId,
            rowVersion: { increment: 1 },
          },
        });
      }

      await tx.enterpriseDealTimelineEvent.create({
        data: {
          organizationId: input.organizationId,
          dealId: input.dealId,
          eventType: "counterparty_assigned",
          occurredAt: new Date(),
          actorUserId: input.actorUserId,
          summary: `Counterparty assigned (${input.counterpartyType})`,
          payload: {
            assignmentId: row.id,
            counterpartyType: input.counterpartyType,
            counterpartyRegistryId: input.counterpartyRegistryId,
            isPrimary: input.isPrimary ?? false,
          },
        },
      });

      return row;
    });
  }

  async updateCounterparty(input: {
    organizationId: string;
    dealId: string;
    assignmentId: string;
    programId?: string | null;
    isPrimary?: boolean;
    pipelineStage?: string | null;
    pipelineSubStage?: string | null;
    applicationRef?: string | null;
    decision?: string | null;
    decisionAt?: Date | null;
    extension?: Prisma.InputJsonValue;
    actorUserId: string;
  }) {
    await this.requireDeal(input.organizationId, input.dealId);
    const existing = await prisma.enterpriseDealCounterpartyAssignment.findFirst({
      where: {
        id: input.assignmentId,
        dealId: input.dealId,
        organizationId: input.organizationId,
        isDeleted: false,
      },
    });
    if (!existing) throw new DealNotFoundError("Counterparty assignment not found");

    return prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.enterpriseDealCounterpartyAssignment.updateMany({
          where: {
            dealId: input.dealId,
            isDeleted: false,
            isPrimary: true,
            NOT: { id: input.assignmentId },
          },
          data: { isPrimary: false, updatedBy: input.actorUserId },
        });
      }

      const row = await tx.enterpriseDealCounterpartyAssignment.update({
        where: { id: input.assignmentId },
        data: {
          ...(input.programId !== undefined ? { programId: input.programId } : {}),
          ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
          ...(input.pipelineStage !== undefined ? { pipelineStage: input.pipelineStage } : {}),
          ...(input.pipelineSubStage !== undefined
            ? { pipelineSubStage: input.pipelineSubStage }
            : {}),
          ...(input.applicationRef !== undefined ? { applicationRef: input.applicationRef } : {}),
          ...(input.decision !== undefined ? { decision: input.decision } : {}),
          ...(input.decisionAt !== undefined ? { decisionAt: input.decisionAt } : {}),
          ...(input.extension !== undefined ? { extension: input.extension } : {}),
          updatedBy: input.actorUserId,
        },
      });

      if (input.isPrimary) {
        await tx.enterpriseDeal.update({
          where: { id: input.dealId },
          data: {
            primaryCounterpartyType: row.counterpartyType,
            primaryCounterpartyId: row.counterpartyRegistryId,
            primaryCounterpartyProgramId: row.programId,
            updatedBy: input.actorUserId,
            rowVersion: { increment: 1 },
          },
        });
      }

      await tx.enterpriseDealTimelineEvent.create({
        data: {
          organizationId: input.organizationId,
          dealId: input.dealId,
          eventType: "counterparty_updated",
          occurredAt: new Date(),
          actorUserId: input.actorUserId,
          summary: `Counterparty assignment updated`,
          payload: { assignmentId: row.id },
        },
      });

      return row;
    });
  }

  async softDeleteCounterparty(input: {
    organizationId: string;
    dealId: string;
    assignmentId: string;
    actorUserId: string;
    reason?: string | null;
  }) {
    await this.requireDeal(input.organizationId, input.dealId);
    const existing = await prisma.enterpriseDealCounterpartyAssignment.findFirst({
      where: {
        id: input.assignmentId,
        dealId: input.dealId,
        organizationId: input.organizationId,
        isDeleted: false,
      },
    });
    if (!existing) throw new DealNotFoundError("Counterparty assignment not found");

    const now = new Date();
    const row = await prisma.enterpriseDealCounterpartyAssignment.update({
      where: { id: input.assignmentId },
      data: {
        isDeleted: true,
        deletedAt: now,
        deletedBy: input.actorUserId,
        deletionReason: input.reason ?? null,
        isPrimary: false,
        updatedBy: input.actorUserId,
      },
    });

    await this.appendTimelineEvent({
      organizationId: input.organizationId,
      dealId: input.dealId,
      eventType: "counterparty_removed",
      summary: `Counterparty assignment removed`,
      actorUserId: input.actorUserId,
      payload: { assignmentId: row.id, reason: input.reason ?? null },
    });

    return row;
  }

  async updateCounterpartyPipeline(input: {
    organizationId: string;
    dealId: string;
    assignmentId: string;
    pipelineStage: string;
    pipelineSubStage?: string | null;
    applicationRef?: string | null;
    decision?: string | null;
    decisionAt?: Date | null;
    actorUserId: string;
  }) {
    return this.updateCounterparty({
      organizationId: input.organizationId,
      dealId: input.dealId,
      assignmentId: input.assignmentId,
      pipelineStage: input.pipelineStage,
      pipelineSubStage: input.pipelineSubStage,
      applicationRef: input.applicationRef,
      decision: input.decision,
      decisionAt: input.decisionAt,
      actorUserId: input.actorUserId,
    });
  }

  // --- Documents ---

  async listDocuments(organizationId: string, dealId: string) {
    return prisma.enterpriseDealDocumentLink.findMany({
      where: { organizationId, dealId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDocumentLink(input: {
    organizationId: string;
    dealId: string;
    documentDefinitionId?: string | null;
    documentTypeId?: string | null;
    participantId?: string | null;
    status?: DealDocumentLinkStatus;
    storageKey?: string | null;
    extension?: Prisma.InputJsonValue;
    actorUserId: string;
  }) {
    await this.requireDeal(input.organizationId, input.dealId);
    const row = await prisma.enterpriseDealDocumentLink.create({
      data: {
        organizationId: input.organizationId,
        dealId: input.dealId,
        documentDefinitionId: input.documentDefinitionId ?? null,
        documentTypeId: input.documentTypeId ?? null,
        participantId: input.participantId ?? null,
        status: input.status ?? "required",
        storageKey: input.storageKey ?? null,
        extension: input.extension ?? undefined,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
      },
    });
    await this.appendTimelineEvent({
      organizationId: input.organizationId,
      dealId: input.dealId,
      eventType: "document_attached",
      summary: `Document link created (${row.status})`,
      actorUserId: input.actorUserId,
      payload: { documentLinkId: row.id, status: row.status },
    });
    return row;
  }

  async updateDocumentLink(input: {
    organizationId: string;
    dealId: string;
    linkId: string;
    status?: DealDocumentLinkStatus;
    storageKey?: string | null;
    uploadedAt?: Date | null;
    verifiedAt?: Date | null;
    extension?: Prisma.InputJsonValue;
    actorUserId: string;
  }) {
    await this.requireDeal(input.organizationId, input.dealId);
    const existing = await prisma.enterpriseDealDocumentLink.findFirst({
      where: {
        id: input.linkId,
        dealId: input.dealId,
        organizationId: input.organizationId,
        isDeleted: false,
      },
    });
    if (!existing) throw new DealNotFoundError("Document link not found");

    const row = await prisma.enterpriseDealDocumentLink.update({
      where: { id: input.linkId },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.storageKey !== undefined ? { storageKey: input.storageKey } : {}),
        ...(input.uploadedAt !== undefined ? { uploadedAt: input.uploadedAt } : {}),
        ...(input.verifiedAt !== undefined ? { verifiedAt: input.verifiedAt } : {}),
        ...(input.extension !== undefined ? { extension: input.extension } : {}),
        updatedBy: input.actorUserId,
      },
    });

    await this.appendTimelineEvent({
      organizationId: input.organizationId,
      dealId: input.dealId,
      eventType: "document_status_changed",
      summary: `Document link ${row.id} → ${row.status}`,
      actorUserId: input.actorUserId,
      payload: {
        documentLinkId: row.id,
        fromStatus: existing.status,
        toStatus: row.status,
      },
    });

    return row;
  }

  // --- Tasks ---

  async listTasks(organizationId: string, dealId: string) {
    return prisma.enterpriseDealTask.findMany({
      where: { organizationId, dealId, isDeleted: false },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });
  }

  async createTask(input: {
    organizationId: string;
    dealId: string;
    title: string;
    status?: string;
    priority?: string | null;
    dueAt?: Date | null;
    assigneeUserId?: string | null;
    slaPolicyId?: string | null;
    payload?: Prisma.InputJsonValue;
    actorUserId: string;
  }) {
    await this.requireDeal(input.organizationId, input.dealId);
    const row = await prisma.enterpriseDealTask.create({
      data: {
        organizationId: input.organizationId,
        dealId: input.dealId,
        title: input.title,
        status: input.status ?? "open",
        priority: input.priority ?? null,
        dueAt: input.dueAt ?? null,
        assigneeUserId: input.assigneeUserId ?? null,
        slaPolicyId: input.slaPolicyId ?? null,
        payload: input.payload ?? undefined,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
      },
    });
    await this.appendTimelineEvent({
      organizationId: input.organizationId,
      dealId: input.dealId,
      eventType: "task_created",
      summary: `Task created: ${row.title}`,
      actorUserId: input.actorUserId,
      payload: { taskId: row.id },
    });
    return row;
  }

  async updateTask(input: {
    organizationId: string;
    dealId: string;
    taskId: string;
    title?: string;
    status?: string;
    priority?: string | null;
    dueAt?: Date | null;
    assigneeUserId?: string | null;
    slaPolicyId?: string | null;
    completedAt?: Date | null;
    payload?: Prisma.InputJsonValue;
    actorUserId: string;
  }) {
    await this.requireDeal(input.organizationId, input.dealId);
    const existing = await prisma.enterpriseDealTask.findFirst({
      where: {
        id: input.taskId,
        dealId: input.dealId,
        organizationId: input.organizationId,
        isDeleted: false,
      },
    });
    if (!existing) throw new DealNotFoundError("Task not found");

    const row = await prisma.enterpriseDealTask.update({
      where: { id: input.taskId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
        ...(input.assigneeUserId !== undefined ? { assigneeUserId: input.assigneeUserId } : {}),
        ...(input.slaPolicyId !== undefined ? { slaPolicyId: input.slaPolicyId } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
        ...(input.payload !== undefined ? { payload: input.payload } : {}),
        updatedBy: input.actorUserId,
      },
    });

    await this.appendTimelineEvent({
      organizationId: input.organizationId,
      dealId: input.dealId,
      eventType: "task_updated",
      summary: `Task updated: ${row.title}`,
      actorUserId: input.actorUserId,
      payload: { taskId: row.id, status: row.status },
    });

    return row;
  }

  // --- Activities ---

  async listActivities(organizationId: string, dealId: string) {
    return prisma.enterpriseDealActivity.findMany({
      where: { organizationId, dealId, isDeleted: false },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });
  }

  async createActivity(input: {
    organizationId: string;
    dealId: string;
    title: string;
    status?: string;
    activityType?: string | null;
    dueAt?: Date | null;
    assigneeUserId?: string | null;
    payload?: Prisma.InputJsonValue;
    actorUserId: string;
  }) {
    await this.requireDeal(input.organizationId, input.dealId);
    const row = await prisma.enterpriseDealActivity.create({
      data: {
        organizationId: input.organizationId,
        dealId: input.dealId,
        title: input.title,
        status: input.status ?? "open",
        activityType: input.activityType ?? null,
        dueAt: input.dueAt ?? null,
        assigneeUserId: input.assigneeUserId ?? null,
        payload: input.payload ?? undefined,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
      },
    });
    await this.appendTimelineEvent({
      organizationId: input.organizationId,
      dealId: input.dealId,
      eventType: "activity_recorded",
      summary: `Activity recorded: ${row.title}`,
      actorUserId: input.actorUserId,
      payload: { activityId: row.id },
    });
    return row;
  }

  async updateActivity(input: {
    organizationId: string;
    dealId: string;
    activityId: string;
    title?: string;
    status?: string;
    activityType?: string | null;
    dueAt?: Date | null;
    assigneeUserId?: string | null;
    completedAt?: Date | null;
    payload?: Prisma.InputJsonValue;
    actorUserId: string;
  }) {
    await this.requireDeal(input.organizationId, input.dealId);
    const existing = await prisma.enterpriseDealActivity.findFirst({
      where: {
        id: input.activityId,
        dealId: input.dealId,
        organizationId: input.organizationId,
        isDeleted: false,
      },
    });
    if (!existing) throw new DealNotFoundError("Activity not found");

    const row = await prisma.enterpriseDealActivity.update({
      where: { id: input.activityId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.activityType !== undefined ? { activityType: input.activityType } : {}),
        ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
        ...(input.assigneeUserId !== undefined ? { assigneeUserId: input.assigneeUserId } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
        ...(input.payload !== undefined ? { payload: input.payload } : {}),
        updatedBy: input.actorUserId,
      },
    });

    await this.appendTimelineEvent({
      organizationId: input.organizationId,
      dealId: input.dealId,
      eventType: "activity_updated",
      summary: `Activity updated: ${row.title}`,
      actorUserId: input.actorUserId,
      payload: { activityId: row.id, status: row.status },
    });

    return row;
  }
}

export const enterpriseDealRepository = new EnterpriseDealRepository();
