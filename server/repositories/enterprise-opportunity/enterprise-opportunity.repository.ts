/**
 * CO-ARCH-003 Phase 2A — Opportunity Registry repository.
 * BI-1: Creating an Opportunity never creates a Deal.
 */
import {
  ACTIVE_PLANNING_LIFECYCLE_STATUSES,
} from "@/constants/opportunity-active-uniqueness";
import {
  businessSourceCodesForKpiBucket,
} from "@/constants/opportunity-business-source";
import {
  Prisma,
  type DealPriority,
  type DealProductFamily,
  type OpportunityFulfilmentMode,
  type OpportunityFulfilmentStatus,
  type OpportunityLifecycleStatus,
} from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import { allocateOpportunityNumber } from "@server/services/enterprise-opportunity/opportunity-number.service";
import {
  OpportunityConflictError,
  OpportunityNotFoundError,
} from "@server/services/enterprise-opportunity/opportunity-validation";

function sourceCodesForBucket(bucket: string): string[] {
  return businessSourceCodesForKpiBucket(bucket);
}
export type CreateEnterpriseOpportunityInput = {
  organizationId: string;
  productFamily: DealProductFamily;
  requirementStage: string;
  primaryBorrowerKind?: "individual" | "company";
  primaryContactId?: string | null;
  actorUserId?: string | null;
  legacyLoanFileId?: string | null;
  productId?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
  /** Normalized Contact+Product uniqueness key (null while Draft / no product). */
  productUniquenessKey?: string | null;
  /** ADR-018 — defaults to active for legacy create; use draft for identity-only. */
  lifecycleStatus?: OpportunityLifecycleStatus;
  transactionType?: string | null;
  requirementSubStage?: string | null;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  employmentTypeCode?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
  primaryOwnerUserId?: string | null;
  priority?: DealPriority;
  requestedAmount?: Prisma.Decimal | number | null;
  currencyCode?: string;
  fulfilmentMode?: OpportunityFulfilmentMode;
  snapshot?: Prisma.InputJsonValue | null;
  lendingExtension?: Prisma.InputJsonValue | null;
  sourceCode?: string | null;
  sourceContactId?: string | null;
  sourceContactName?: string | null;
  sourceWealthPartnerId?: string | null;
  participationRole?: string | null;
  commercialRevenueSharePercent?: number | null;
  sourceCampaignLabel?: string | null;
};

export type UpdateEnterpriseOpportunityInput = {
  productId?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
  productUniquenessKey?: string | null;
  productFamily?: DealProductFamily;
  transactionType?: string | null;
  requirementStage?: string;
  requirementSubStage?: string | null;
  lifecycleStatus?: OpportunityLifecycleStatus;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  companyId?: string | null;
  employmentTypeCode?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
  primaryOwnerUserId?: string | null;
  priority?: DealPriority;
  requestedAmount?: Prisma.Decimal | number | null;
  currencyCode?: string;
  snapshot?: Prisma.InputJsonValue | null;
  lendingExtension?: Prisma.InputJsonValue | null;
  sourceCode?: string | null;
  sourceContactId?: string | null;
  sourceContactName?: string | null;
  sourceWealthPartnerId?: string | null;
  participationRole?: string | null;
  commercialRevenueSharePercent?: number | null;
  sourceCampaignLabel?: string | null;
  updatedBy?: string | null;
  expectedRowVersion?: number | null;
};

export class EnterpriseOpportunityRepository {
  async findById(organizationId: string, opportunityId: string, opts?: { includeDeleted?: boolean }) {
    return prisma.enterpriseOpportunity.findFirst({
      where: {
        id: opportunityId,
        organizationId,
        ...(opts?.includeDeleted ? {} : { isDeleted: false }),
      },
    });
  }

  async requireOpportunity(organizationId: string, opportunityId: string) {
    const row = await this.findById(organizationId, opportunityId);
    if (!row) throw new OpportunityNotFoundError();
    return row;
  }

  async findByLegacyLoanFileId(organizationId: string, legacyLoanFileId: string) {
    return prisma.enterpriseOpportunity.findFirst({
      where: { organizationId, legacyLoanFileId, isDeleted: false },
    });
  }

  async findByNumber(organizationId: string, opportunityNumber: string) {
    return prisma.enterpriseOpportunity.findFirst({
      where: { organizationId, opportunityNumber, isDeleted: false },
    });
  }

  async listByContact(organizationId: string, primaryContactId: string) {
    return prisma.enterpriseOpportunity.findMany({
      where: { organizationId, primaryContactId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * Find planning-active Opportunity for Contact + Product uniqueness key.
   * ADR-018: includes requirement_captured + active + on_hold (not draft).
   */
  async findActiveForContactProduct(
    organizationId: string,
    primaryContactId: string,
    productUniquenessKey: string,
  ) {
    return prisma.enterpriseOpportunity.findFirst({
      where: {
        organizationId,
        primaryContactId,
        productUniquenessKey,
        isDeleted: false,
        archived: false,
        closedAt: null,
        lifecycleStatus: {
          in: [...ACTIVE_PLANNING_LIFECYCLE_STATUSES] as OpportunityLifecycleStatus[],
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * CO-OPP-002 — Open Dialogue for Contact (Start Loan Journey idempotency).
   * Also matches legacy `draft` rows so historical Drafts are reused as Dialogue
   * without migrating their stored status.
   */
  async findOpenDraftForContact(organizationId: string, primaryContactId: string) {
    return prisma.enterpriseOpportunity.findFirst({
      where: {
        organizationId,
        primaryContactId,
        isDeleted: false,
        archived: false,
        closedAt: null,
        lifecycleStatus: { in: ["dialogue", "draft"] },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * CO-DOM-001 — Find planning-active Opportunity for Company + Product uniqueness.
   */
  async findActiveForCompanyProduct(
    organizationId: string,
    companyId: string,
    productUniquenessKey: string,
  ) {
    return prisma.enterpriseOpportunity.findFirst({
      where: {
        organizationId,
        companyId,
        primaryBorrowerKind: "company",
        productUniquenessKey,
        isDeleted: false,
        archived: false,
        closedAt: null,
        lifecycleStatus: {
          in: [...ACTIVE_PLANNING_LIFECYCLE_STATUSES] as OpportunityLifecycleStatus[],
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * CO-OPP-002 — Open Dialogue for Company (Start Loan Journey idempotency).
   * Includes legacy `draft` without rewriting those rows.
   */
  async findOpenDraftForCompany(organizationId: string, companyId: string) {
    return prisma.enterpriseOpportunity.findFirst({
      where: {
        organizationId,
        companyId,
        primaryBorrowerKind: "company",
        isDeleted: false,
        archived: false,
        closedAt: null,
        lifecycleStatus: { in: ["dialogue", "draft"] },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async markConvertedToDeal(
    organizationId: string,
    opportunityId: string,
    actorUserId: string,
  ) {
    const existing = await this.requireOpportunity(organizationId, opportunityId);
    const current = (existing.lifecycleStatus || "").toLowerCase();
    // Do not regress Completed / Lost / Cancelled; do not rewrite historical terminal rows.
    if (["completed", "won", "lost", "cancelled", "archived"].includes(current)) {
      return existing;
    }
    return prisma.enterpriseOpportunity.update({
      where: { id: existing.id },
      data: {
        lifecycleStatus: "converted_to_deal",
        fulfilmentStatus: "partially_fulfilled",
        // Converted to Deal is not terminal — leave closedAt unset.
        closedAt: null,
        updatedBy: actorUserId,
      },
    });
  }

  async applyLifecycleStatus(
    organizationId: string,
    opportunityId: string,
    lifecycleStatus: OpportunityLifecycleStatus,
    actorUserId: string,
    extras?: { closedAt?: Date | null; fulfilmentStatus?: string },
  ) {
    const existing = await this.requireOpportunity(organizationId, opportunityId);
    return prisma.enterpriseOpportunity.update({
      where: { id: existing.id },
      data: {
        lifecycleStatus,
        fulfilmentStatus: (extras?.fulfilmentStatus as
          | "open"
          | "partially_fulfilled"
          | "fulfilled"
          | "abandoned"
          | undefined) ?? existing.fulfilmentStatus,
        closedAt:
          extras?.closedAt !== undefined ? extras.closedAt : existing.closedAt,
        updatedBy: actorUserId,
      },
    });
  }

  async search(organizationId: string, query: {
    q?: string;
    primaryContactId?: string;
    companyId?: string;
    requirementStage?: string;
    lifecycleStatus?: OpportunityLifecycleStatus;
    sourceCode?: string;
    /** CO-UX-006 — filter by Fresh Login KPI bucket */
    sourceBucket?: "direct" | "channel_partner" | "referral" | "other";
    /** Distinct Opportunity IDs (e.g. Fresh Login today) */
    opportunityIds?: string[];
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const offset = Math.max(query.offset ?? 0, 0);

    const where: Prisma.EnterpriseOpportunityWhereInput = {
      organizationId,
      isDeleted: false,
      ...(query.primaryContactId ? { primaryContactId: query.primaryContactId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.requirementStage ? { requirementStage: query.requirementStage } : {}),
      ...(query.lifecycleStatus ? { lifecycleStatus: query.lifecycleStatus } : {}),
      ...(query.sourceCode ? { sourceCode: query.sourceCode } : {}),
      ...(query.opportunityIds
        ? { id: { in: query.opportunityIds.length ? query.opportunityIds : ["__none__"] } }
        : {}),
      ...(query.sourceBucket && !query.sourceCode
        ? query.sourceBucket === "other"
          ? {
              OR: [
                { sourceCode: { in: sourceCodesForBucket("other") } },
                { sourceCode: null },
                { sourceCode: "" },
              ],
            }
          : { sourceCode: { in: sourceCodesForBucket(query.sourceBucket) } }
        : {}),
      ...(query.q
        ? {
            OR: [
              { opportunityNumber: { contains: query.q, mode: "insensitive" } },
              { primaryContactName: { contains: query.q, mode: "insensitive" } },
              { primaryContactMobile: { contains: query.q, mode: "insensitive" } },
              { companyName: { contains: query.q, mode: "insensitive" } },
              { productLabel: { contains: query.q, mode: "insensitive" } },
              { productCode: { contains: query.q, mode: "insensitive" } },
              { relationshipManagerName: { contains: query.q, mode: "insensitive" } },
              { sourceCode: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.enterpriseOpportunity.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.enterpriseOpportunity.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  /**
   * Creates Opportunity only. Never inserts into enterprise_deals (BI-1 / BI-3).
   */
  async createOpportunity(input: CreateEnterpriseOpportunityInput) {
    if (input.legacyLoanFileId) {
      const existing = await this.findByLegacyLoanFileId(
        input.organizationId,
        input.legacyLoanFileId,
      );
      if (existing) return existing;
    }

    const borrowerKind = input.primaryBorrowerKind ?? "individual";
    const isCompanyBorrower = borrowerKind === "company";

    if (isCompanyBorrower) {
      if (!input.companyId?.trim()) {
        throw new OpportunityConflictError("companyId is required when primary borrower is a Company");
      }
    } else if (!input.primaryContactId?.trim()) {
      throw new OpportunityConflictError("primaryContactId must reference a valid Contact");
    }

    let contactName: string | null = null;
    let contactMobile: string | null = null;
    let contactEmail: string | null = null;
    let companyName: string | null = input.companyName?.trim() || null;

    if (isCompanyBorrower) {
      const company = await prisma.ecmCompany.findFirst({
        where: {
          id: input.companyId!,
          organizationId: input.organizationId,
          isDeleted: false,
        },
      });
      if (!company) {
        throw new OpportunityConflictError("companyId must reference a valid Company");
      }
      companyName = companyName || company.companyName;
    } else {
      const contact = await prisma.ecmContact.findFirst({
        where: {
          id: input.primaryContactId!,
          organizationId: input.organizationId,
          isDeleted: false,
        },
      });
      if (!contact) {
        throw new OpportunityConflictError("primaryContactId must reference a valid Contact");
      }
      contactName = contact.name;
      contactMobile = contact.mobilePrimary;
      contactEmail = contact.personalEmail ?? contact.officialEmail;
    }

    if (input.productId) {
      const product = await prisma.enterpriseProduct.findFirst({
        where: {
          id: input.productId,
          organizationId: input.organizationId,
          isDeleted: false,
        },
      });
      if (!product) {
        throw new OpportunityConflictError("productId must reference a valid Product");
      }
    }

    const opportunityNumber = await allocateOpportunityNumber(input.organizationId);
    const now = new Date();
    const actor = input.actorUserId ?? null;

    return prisma.enterpriseOpportunity.create({
      data: {
        organizationId: input.organizationId,
        opportunityNumber,
        legacyLoanFileId: input.legacyLoanFileId ?? null,
        productFamily: input.productFamily,
        productId: input.productId ?? null,
        productCode: input.productCode ?? null,
        productLabel: input.productLabel ?? null,
        productUniquenessKey: input.productUniquenessKey ?? null,
        transactionType: input.transactionType ?? null,
        requirementStage: input.requirementStage,
        requirementSubStage: input.requirementSubStage ?? null,
        lifecycleStatus: input.lifecycleStatus ?? "active",
        stageEnteredAt: now,
        primaryBorrowerKind: borrowerKind,
        primaryContactId: isCompanyBorrower ? null : input.primaryContactId ?? null,
        primaryContactName: isCompanyBorrower
          ? companyName
          : input.primaryContactName ?? contactName,
        primaryContactMobile: isCompanyBorrower
          ? null
          : input.primaryContactMobile ?? contactMobile,
        primaryContactEmail: isCompanyBorrower
          ? null
          : input.primaryContactEmail ?? contactEmail,
        companyId: isCompanyBorrower ? input.companyId ?? null : input.companyId ?? null,
        companyName: isCompanyBorrower ? companyName : null,
        employmentTypeCode: input.employmentTypeCode ?? null,
        cityLabel: input.cityLabel ?? null,
        stateLabel: input.stateLabel ?? null,
        relationshipManagerUserId: input.relationshipManagerUserId ?? null,
        relationshipManagerName: input.relationshipManagerName ?? null,
        primaryOwnerUserId: input.primaryOwnerUserId ?? actor,
        priority: input.priority ?? "medium",
        requestedAmount: input.requestedAmount ?? null,
        currencyCode: input.currencyCode ?? "INR",
        fulfilmentMode: input.fulfilmentMode ?? "exclusive",
        fulfilmentStatus: "open" satisfies OpportunityFulfilmentStatus,
        snapshot: input.snapshot ?? undefined,
        lendingExtension: input.lendingExtension ?? undefined,
        sourceCode: input.sourceCode ?? null,
        sourceContactId: input.sourceContactId ?? null,
        sourceContactName: input.sourceContactName ?? null,
        sourceWealthPartnerId: input.sourceWealthPartnerId ?? null,
        participationRole: input.participationRole ?? null,
        commercialRevenueSharePercent: input.commercialRevenueSharePercent ?? null,
        sourceCampaignLabel: input.sourceCampaignLabel ?? null,
        createdBy: actor,
        updatedBy: actor,
      },
    });
  }

  /**
   * ADR-018 Wave 1 — update Opportunity Registry business / identity fields.
   * Never invents values; callers supply only fields to change.
   */
  async updateOpportunity(
    organizationId: string,
    opportunityId: string,
    input: UpdateEnterpriseOpportunityInput,
  ) {
    const existing = await this.requireOpportunity(organizationId, opportunityId);

    if (
      input.expectedRowVersion != null &&
      existing.rowVersion !== input.expectedRowVersion
    ) {
      throw new OpportunityConflictError(
        "Opportunity was modified by another session. Reload and retry.",
        "OPPORTUNITY_VERSION_CONFLICT",
      );
    }

    if (input.productId) {
      const product = await prisma.enterpriseProduct.findFirst({
        where: {
          id: input.productId,
          organizationId,
          isDeleted: false,
        },
      });
      if (!product) {
        throw new OpportunityConflictError("productId must reference a valid Product");
      }
    }

    const data: Prisma.EnterpriseOpportunityUncheckedUpdateInput = {
      updatedBy: input.updatedBy ?? undefined,
      rowVersion: { increment: 1 },
      versionNumber: { increment: 1 },
    };

    if (input.productId !== undefined) data.productId = input.productId;
    if (input.productCode !== undefined) data.productCode = input.productCode;
    if (input.productLabel !== undefined) data.productLabel = input.productLabel;
    if (input.productUniquenessKey !== undefined) {
      data.productUniquenessKey = input.productUniquenessKey;
    }
    if (input.productFamily !== undefined) data.productFamily = input.productFamily;
    if (input.transactionType !== undefined) data.transactionType = input.transactionType;
    if (input.requirementStage !== undefined) data.requirementStage = input.requirementStage;
    if (input.requirementSubStage !== undefined) {
      data.requirementSubStage = input.requirementSubStage;
    }
    if (input.lifecycleStatus !== undefined) {
      data.lifecycleStatus = input.lifecycleStatus;
      data.stageEnteredAt = new Date();
    }
    if (input.primaryContactName !== undefined) {
      data.primaryContactName = input.primaryContactName;
    }
    if (input.primaryContactMobile !== undefined) {
      data.primaryContactMobile = input.primaryContactMobile;
    }
    if (input.primaryContactEmail !== undefined) {
      data.primaryContactEmail = input.primaryContactEmail;
    }
    if (input.companyId !== undefined) data.companyId = input.companyId;
    if (input.employmentTypeCode !== undefined) {
      data.employmentTypeCode = input.employmentTypeCode;
    }
    if (input.cityLabel !== undefined) data.cityLabel = input.cityLabel;
    if (input.stateLabel !== undefined) data.stateLabel = input.stateLabel;
    if (input.relationshipManagerUserId !== undefined) {
      data.relationshipManagerUserId = input.relationshipManagerUserId;
    }
    if (input.relationshipManagerName !== undefined) {
      data.relationshipManagerName = input.relationshipManagerName;
    }
    if (input.primaryOwnerUserId !== undefined) {
      data.primaryOwnerUserId = input.primaryOwnerUserId;
    }
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.requestedAmount !== undefined) data.requestedAmount = input.requestedAmount;
    if (input.currencyCode !== undefined) data.currencyCode = input.currencyCode;
    if (input.snapshot !== undefined) data.snapshot = input.snapshot ?? Prisma.JsonNull;
    if (input.lendingExtension !== undefined) {
      data.lendingExtension = input.lendingExtension ?? Prisma.JsonNull;
    }
    if (input.sourceCode !== undefined) data.sourceCode = input.sourceCode;
    if (input.sourceContactId !== undefined) data.sourceContactId = input.sourceContactId;
    if (input.sourceContactName !== undefined) data.sourceContactName = input.sourceContactName;
    if (input.sourceWealthPartnerId !== undefined) {
      data.sourceWealthPartnerId = input.sourceWealthPartnerId;
    }
    if (input.participationRole !== undefined) {
      data.participationRole = input.participationRole;
    }
    if (input.commercialRevenueSharePercent !== undefined) {
      data.commercialRevenueSharePercent = input.commercialRevenueSharePercent;
    }
    if (input.sourceCampaignLabel !== undefined) {
      data.sourceCampaignLabel = input.sourceCampaignLabel;
    }

    return prisma.enterpriseOpportunity.update({
      where: { id: existing.id },
      data,
    });
  }

  async softDelete(organizationId: string, opportunityId: string, actorUserId: string, reason?: string) {
    const existing = await this.requireOpportunity(organizationId, opportunityId);
    const childDeals = await prisma.enterpriseDeal.count({
      where: { organizationId, opportunityId, isDeleted: false },
    });
    if (childDeals > 0) {
      throw new OpportunityConflictError(
        "Cannot delete Opportunity while active Deals exist. Soft-delete or close Deals first.",
      );
    }
    return prisma.enterpriseOpportunity.update({
      where: { id: existing.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: actorUserId,
        deletionReason: reason ?? null,
        updatedBy: actorUserId,
      },
    });
  }
}

export const enterpriseOpportunityRepository = new EnterpriseOpportunityRepository();
