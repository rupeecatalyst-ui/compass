import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";
import type {
  CreateWealthPartnerBankAccountInput,
  CreateWealthPartnerCommissionInput,
  CreateWealthPartnerInput,
  CreateWealthPartnerNetworkMemberInput,
  UpdateWealthPartnerInput,
  WealthPartnerListQuery,
} from "@/types/enterprise-wealth-partner-registry";
import { wealthPartnerBatExclusionWhere } from "@/constants/enterprise-wealth-partner-bat";
import {
  allocateNextCommissionCode,
  allocateUniqueWealthPartnerCode,
} from "./codes";
import {
  mapActivity,
  mapBankAccount,
  mapCommission,
  mapNetworkMember,
  mapWealthPartner,
} from "./mappers";

function pageBounds(query: WealthPartnerListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 50));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export const wealthPartnerRegistryRepository = {
  async queryPartners(organizationId: string, query: WealthPartnerListQuery) {
    const { page, pageSize, skip } = pageBounds(query);
    const where: Prisma.EnterpriseWealthPartnerWhereInput = {
      organizationId,
      isDeleted: query.includeDeleted ? undefined : false,
      ...(query.includeBatDemo ? {} : wealthPartnerBatExclusionWhere()),
    };
    if (query.partnerType && query.partnerType !== "all") {
      where.partnerType = query.partnerType;
    }
    if (query.identityKind && query.identityKind !== "all") {
      where.identityKind = query.identityKind;
    }
    if (query.status && query.status !== "all") {
      where.status = query.status as import("@prisma/client").RegistryStatus;
    }
    if (typeof query.enabled === "boolean") {
      where.enabled = query.enabled;
    }
    if (query.contactId?.trim()) {
      where.contactId = query.contactId.trim();
    }
    if (query.companyId?.trim()) {
      where.companyId = query.companyId.trim();
    }
    if (query.createdFrom || query.createdTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.createdFrom?.trim()) {
        const from = new Date(query.createdFrom.trim());
        if (!Number.isNaN(from.getTime())) createdAt.gte = from;
      }
      if (query.createdTo?.trim()) {
        const to = new Date(query.createdTo.trim());
        if (!Number.isNaN(to.getTime())) createdAt.lte = to;
      }
      if (Object.keys(createdAt).length) where.createdAt = createdAt;
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { displayName: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { identityLabel: { contains: q, mode: "insensitive" } },
        { mobile: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { partnerType: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.enterpriseWealthPartner.count({ where }),
      prisma.enterpriseWealthPartner.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map(mapWealthPartner),
      total,
      page,
      pageSize,
    };
  },

  async getById(organizationId: string, id: string) {
    const row = await prisma.enterpriseWealthPartner.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
    return row ? mapWealthPartner(row) : null;
  },

  async findActiveByIdentity(
    organizationId: string,
    identity: { contactId?: string | null; companyId?: string | null },
  ) {
    const where: Prisma.EnterpriseWealthPartnerWhereInput = {
      organizationId,
      isDeleted: false,
    };
    if (identity.contactId) where.contactId = identity.contactId;
    else if (identity.companyId) where.companyId = identity.companyId;
    else return null;
    const row = await prisma.enterpriseWealthPartner.findFirst({
      where,
      orderBy: { createdAt: "asc" },
    });
    return row ? mapWealthPartner(row) : null;
  },

  /** Soft-deleted WP for the same Contact/Company — candidate for safe restore. */
  async findSoftDeletedByIdentity(
    organizationId: string,
    identity: { contactId?: string | null; companyId?: string | null },
  ) {
    const where: Prisma.EnterpriseWealthPartnerWhereInput = {
      organizationId,
      isDeleted: true,
    };
    if (identity.contactId) where.contactId = identity.contactId;
    else if (identity.companyId) where.companyId = identity.companyId;
    else return null;
    const row = await prisma.enterpriseWealthPartner.findFirst({
      where,
      orderBy: { updatedAt: "desc" },
    });
    return row ? mapWealthPartner(row) : null;
  },

  async restoreSoftDeletedPartner(
    organizationId: string,
    partnerId: string,
    actorUserId: string,
  ) {
    const existing = await prisma.enterpriseWealthPartner.findFirst({
      where: { id: partnerId, organizationId, isDeleted: true },
    });
    if (!existing) return null;
    const row = await prisma.enterpriseWealthPartner.update({
      where: { id: partnerId },
      data: {
        isDeleted: false,
        modifiedBy: actorUserId,
        versionNumber: { increment: 1 },
      },
    });
    await prisma.enterpriseWealthPartnerActivity.create({
      data: {
        organizationId,
        wealthPartnerId: partnerId,
        activityType: "relationship_recovered",
        title: "Wealth Partner relationship recovered",
        detail: "Soft-deleted Wealth Partner restored during conversion.",
        actorUserId,
        payload: { reason: "soft_deleted_recovered" },
      },
    });
    return mapWealthPartner(row);
  },

  async recordPartnerActivity(
    organizationId: string,
    wealthPartnerId: string,
    input: {
      activityType: string;
      title: string;
      detail?: string | null;
      actorUserId?: string | null;
      payload?: Record<string, unknown> | null;
    },
  ) {
    await prisma.enterpriseWealthPartnerActivity.create({
      data: {
        organizationId,
        wealthPartnerId,
        activityType: input.activityType,
        title: input.title,
        detail: input.detail ?? null,
        actorUserId: input.actorUserId ?? null,
        payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  },

  /**
   * CO-WP-006 — allocate code with retry on unique (org, code) collision.
   * Never fail conversion solely because of code generation race.
   */
  async createPartner(organizationId: string, input: CreateWealthPartnerInput) {
    const displayNameBase =
      input.displayName?.trim() || input.identityLabel?.trim() || "";
    const maxAttempts = 8;
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const { code, collisionRetries } =
          await allocateUniqueWealthPartnerCode(organizationId);
        const displayName = displayNameBase || code;
        const row = await prisma.$transaction(async (tx) => {
          const created = await tx.enterpriseWealthPartner.create({
            data: {
              organizationId,
              code,
              displayName,
              partnerType: input.partnerType,
              identityKind: input.identityKind,
              contactId:
                input.identityKind === "contact" ? input.contactId ?? null : null,
              companyId:
                input.identityKind === "company" ? input.companyId ?? null : null,
              identityLabel: input.identityLabel ?? null,
              pan: input.pan ?? null,
              gstin: input.gstin ?? null,
              email: input.email ?? null,
              mobile: input.mobile ?? null,
              cityLabel: input.cityLabel ?? null,
              stateLabel: input.stateLabel ?? null,
              website: input.website ?? null,
              notes: input.notes ?? null,
              createdBy: input.createdBy,
              modifiedBy: input.createdBy,
            },
          });
          await tx.enterpriseWealthPartnerActivity.create({
            data: {
              organizationId,
              wealthPartnerId: created.id,
              activityType: "created",
              title: "Wealth Partner created",
              detail:
                collisionRetries > 0
                  ? `${created.code} · ${created.partnerType} · Wealth Partner code collision detected. A new code has been generated.`
                  : `${created.code} · ${created.partnerType}`,
              actorUserId: input.createdBy,
              payload:
                collisionRetries > 0
                  ? { collisionRetries, codeAllocated: created.code }
                  : undefined,
            },
          });
          return created;
        });
        return mapWealthPartner(row);
      } catch (err) {
        lastErr = err;
        const code =
          typeof err === "object" && err !== null && "code" in err
            ? String((err as { code?: string }).code ?? "")
            : "";
        const target = (() => {
          if (typeof err !== "object" || err === null || !("meta" in err)) return "";
          const meta = (err as { meta?: { target?: unknown } }).meta;
          if (Array.isArray(meta?.target)) return meta.target.join(",");
          return String(meta?.target ?? "");
        })();
        const isCodeCollision =
          code === "P2002" &&
          (/code/i.test(target) || target === "" || /organizationId/i.test(target));
        if (isCodeCollision && attempt < maxAttempts - 1) continue;
        throw err;
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error("Unable to generate a unique Wealth Partner code.");
  },

  async updatePartner(
    organizationId: string,
    id: string,
    input: UpdateWealthPartnerInput,
  ) {
    const existing = await prisma.enterpriseWealthPartner.findFirst({
      where: { id, organizationId, isDeleted: false },
    });
    if (!existing) return null;

    const data: Prisma.EnterpriseWealthPartnerUpdateInput = {
      modifiedBy: input.modifiedBy,
      versionNumber: { increment: 1 },
    };
    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.partnerType !== undefined) data.partnerType = input.partnerType;
    if (input.pan !== undefined) data.pan = input.pan;
    if (input.gstin !== undefined) data.gstin = input.gstin;
    if (input.email !== undefined) data.email = input.email;
    if (input.mobile !== undefined) data.mobile = input.mobile;
    if (input.cityLabel !== undefined) data.cityLabel = input.cityLabel;
    if (input.stateLabel !== undefined) data.stateLabel = input.stateLabel;
    if (input.website !== undefined) data.website = input.website;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.profileJson !== undefined) {
      data.profileJson = input.profileJson as Prisma.InputJsonValue;
    }
    if (input.complianceJson !== undefined) {
      data.complianceJson = input.complianceJson as Prisma.InputJsonValue;
    }
    if (input.commercialReferralSharePercent !== undefined) {
      data.commercialReferralSharePercent = input.commercialReferralSharePercent;
    }
    if (input.commercialSoleExecutorSharePercent !== undefined) {
      data.commercialSoleExecutorSharePercent =
        input.commercialSoleExecutorSharePercent;
    }
    if (input.commercialJointExecutorSharePercent !== undefined) {
      data.commercialJointExecutorSharePercent =
        input.commercialJointExecutorSharePercent;
    }
    if (input.commercialEffectiveFrom !== undefined) {
      data.commercialEffectiveFrom = input.commercialEffectiveFrom
        ? new Date(input.commercialEffectiveFrom)
        : null;
    }
    if (input.commercialStatus !== undefined) {
      data.commercialStatus = input.commercialStatus ?? "active";
    }
    if (input.lifecycleStatus !== undefined) {
      data.lifecycleStatus = input.lifecycleStatus;
    }
    if (input.operationalStatus !== undefined) {
      data.operationalStatus = input.operationalStatus;
    }
    if (input.status !== undefined) data.status = input.status;
    if (input.enabled !== undefined) data.enabled = input.enabled;

    const row = await prisma.enterpriseWealthPartner.update({
      where: { id },
      data,
    });
    await prisma.enterpriseWealthPartnerActivity.create({
      data: {
        organizationId,
        wealthPartnerId: id,
        activityType: "updated",
        title: "Wealth Partner updated",
        actorUserId: input.modifiedBy,
      },
    });
    return mapWealthPartner(row);
  },

  async listNetwork(organizationId: string, parentPartnerId: string) {
    const rows = await prisma.enterpriseWealthPartnerNetworkMember.findMany({
      where: { organizationId, parentPartnerId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapNetworkMember);
  },

  async addNetworkMember(
    organizationId: string,
    parentPartnerId: string,
    input: CreateWealthPartnerNetworkMemberInput,
  ) {
    const row = await prisma.enterpriseWealthPartnerNetworkMember.create({
      data: {
        organizationId,
        parentPartnerId,
        identityKind: input.identityKind,
        childContactId:
          input.identityKind === "contact" ? input.childContactId ?? null : null,
        childCompanyId:
          input.identityKind === "company" ? input.childCompanyId ?? null : null,
        childDisplayName: input.childDisplayName,
        relationshipType: input.relationshipType,
        memberPartnerType: input.memberPartnerType ?? null,
        effectiveDate: input.effectiveDate
          ? new Date(input.effectiveDate)
          : new Date(),
        notes: input.notes ?? null,
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      },
    });
    await prisma.enterpriseWealthPartnerActivity.create({
      data: {
        organizationId,
        wealthPartnerId: parentPartnerId,
        activityType: "network_member_added",
        title: "Network member added",
        detail: input.childDisplayName,
        actorUserId: input.createdBy,
      },
    });
    return mapNetworkMember(row);
  },

  async listCommissions(organizationId: string, wealthPartnerId: string) {
    const rows = await prisma.enterpriseWealthPartnerCommission.findMany({
      where: { organizationId, wealthPartnerId, isDeleted: false },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(mapCommission);
  },

  async createCommission(
    organizationId: string,
    wealthPartnerId: string,
    partnerCode: string,
    input: CreateWealthPartnerCommissionInput,
  ) {
    const code = await allocateNextCommissionCode(organizationId, partnerCode);
    const row = await prisma.enterpriseWealthPartnerCommission.create({
      data: {
        organizationId,
        wealthPartnerId,
        code,
        label: input.label,
        productCode: input.productCode ?? null,
        productLabel: input.productLabel ?? null,
        structureKind: input.structureKind ?? "product",
        slabsJson: (input.slabsJson ?? undefined) as Prisma.InputJsonValue | undefined,
        ratePercent: input.ratePercent ?? null,
        rateBps: input.rateBps ?? null,
        flatAmount: input.flatAmount ?? null,
        payoutFrequency: input.payoutFrequency ?? "on_disbursement",
        overrideRulesJson: (input.overrideRulesJson ??
          undefined) as Prisma.InputJsonValue | undefined,
        effectiveFrom: input.effectiveFrom
          ? new Date(input.effectiveFrom)
          : null,
        effectiveUntil: input.effectiveUntil
          ? new Date(input.effectiveUntil)
          : null,
        notes: input.notes ?? null,
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      },
    });
    await prisma.enterpriseWealthPartnerActivity.create({
      data: {
        organizationId,
        wealthPartnerId,
        activityType: "commission_created",
        title: "Commission structure added",
        detail: input.label,
        actorUserId: input.createdBy,
      },
    });
    return mapCommission(row);
  },

  async listBankAccounts(organizationId: string, wealthPartnerId: string) {
    const rows = await prisma.enterpriseWealthPartnerBankAccount.findMany({
      where: { organizationId, wealthPartnerId, isDeleted: false },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(mapBankAccount);
  },

  async createBankAccount(
    organizationId: string,
    wealthPartnerId: string,
    input: CreateWealthPartnerBankAccountInput,
  ) {
    if (input.isPrimary) {
      await prisma.enterpriseWealthPartnerBankAccount.updateMany({
        where: { organizationId, wealthPartnerId, isDeleted: false },
        data: { isPrimary: false },
      });
    }
    const row = await prisma.enterpriseWealthPartnerBankAccount.create({
      data: {
        organizationId,
        wealthPartnerId,
        accountName: input.accountName,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        ifsc: input.ifsc,
        accountType: input.accountType ?? null,
        isPrimary: Boolean(input.isPrimary),
        notes: input.notes ?? null,
        createdBy: input.createdBy,
        modifiedBy: input.createdBy,
      },
    });
    return mapBankAccount(row);
  },

  async listActivities(organizationId: string, wealthPartnerId: string) {
    const rows = await prisma.enterpriseWealthPartnerActivity.findMany({
      where: { organizationId, wealthPartnerId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map(mapActivity);
  },
};
