import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { wealthPartnerRegistryRepository } from "@server/repositories/wealth-partner-registry";
import {
  WEALTH_PARTNER_BUSINESS_SOURCING_DEFINITION,
  WEALTH_PARTNER_DOCUMENTS_NOTE,
  WEALTH_PARTNER_TYPE_OPTIONS,
} from "@/constants/enterprise-wealth-partner-registry";
import type {
  CreateWealthPartnerBankAccountInput,
  CreateWealthPartnerCommissionInput,
  CreateWealthPartnerInput,
  CreateWealthPartnerNetworkMemberInput,
  UpdateWealthPartnerInput,
  WealthPartnerBusinessSourcingKpis,
  WealthPartnerListQuery,
  WealthPartnerWorkspaceBundle,
} from "@/types/enterprise-wealth-partner-registry";

export class WealthPartnerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WealthPartnerValidationError";
  }
}

function assertIdentity(input: {
  identityKind: "contact" | "company";
  contactId?: string | null;
  companyId?: string | null;
}) {
  if (input.identityKind === "contact") {
    if (!input.contactId?.trim()) {
      throw new WealthPartnerValidationError(
        "Contact identity requires a Contact from the Enterprise Contact Registry.",
      );
    }
  } else if (input.identityKind === "company") {
    if (!input.companyId?.trim()) {
      throw new WealthPartnerValidationError(
        "Company identity requires a Company from the Enterprise Company Registry.",
      );
    }
  } else {
    throw new WealthPartnerValidationError("identityKind must be contact or company.");
  }
}

export class WealthPartnerRegistryService {
  private async orgId() {
    return resolvePilotOrganizationId();
  }

  async queryPartners(query: WealthPartnerListQuery) {
    return wealthPartnerRegistryRepository.queryPartners(await this.orgId(), query);
  }

  async getPartner(id: string) {
    return wealthPartnerRegistryRepository.getById(await this.orgId(), id);
  }

  async createPartner(input: CreateWealthPartnerInput) {
    assertIdentity(input);
    if (!input.partnerType?.trim()) {
      throw new WealthPartnerValidationError("Wealth Partner Type is required.");
    }
    const allowedTypes = new Set(
      WEALTH_PARTNER_TYPE_OPTIONS.map((o) => o.value as string),
    );
    if (!allowedTypes.has(input.partnerType)) {
      throw new WealthPartnerValidationError(
        `Wealth Partner Type is required. Unknown type: ${input.partnerType}.`,
      );
    }
    const organizationId = await this.orgId();

    const existing = await wealthPartnerRegistryRepository.findActiveByIdentity(
      organizationId,
      {
        contactId: input.identityKind === "contact" ? input.contactId : null,
        companyId: input.identityKind === "company" ? input.companyId : null,
      },
    );
    if (existing) {
      throw new WealthPartnerValidationError(
        input.identityKind === "contact"
          ? `Contact already converted into a Wealth Partner (${existing.code}).`
          : `Company already converted into a Wealth Partner (${existing.code}).`,
      );
    }

    if (input.identityKind === "contact" && input.contactId) {
      const contact = await prisma.ecmContact.findFirst({
        where: {
          id: input.contactId,
          organizationId,
          isDeleted: false,
        },
        select: { id: true, name: true, mobilePrimary: true, personalEmail: true, city: true, state: true, pan: true },
      });
      if (!contact) {
        throw new WealthPartnerValidationError("Contact not found in Enterprise Contact Registry.");
      }
      return wealthPartnerRegistryRepository.createPartner(organizationId, {
        ...input,
        displayName: input.displayName?.trim() || contact.name,
        identityLabel: input.identityLabel ?? contact.name,
        mobile: input.mobile ?? contact.mobilePrimary,
        email: input.email ?? contact.personalEmail,
        cityLabel: input.cityLabel ?? contact.city,
        stateLabel: input.stateLabel ?? contact.state,
        pan: input.pan ?? contact.pan,
      });
    }

    if (input.identityKind === "company" && input.companyId) {
      const company = await prisma.ecmCompany.findFirst({
        where: {
          id: input.companyId,
          organizationId,
          isDeleted: false,
        },
        select: {
          id: true,
          companyName: true,
          pan: true,
          gst: true,
          website: true,
        },
      });
      if (!company) {
        throw new WealthPartnerValidationError(
          "Company not found in Enterprise Company Registry.",
        );
      }
      return wealthPartnerRegistryRepository.createPartner(organizationId, {
        ...input,
        displayName: input.displayName?.trim() || company.companyName,
        identityLabel: input.identityLabel ?? company.companyName,
        pan: input.pan ?? company.pan,
        gstin: input.gstin ?? company.gst,
        website: input.website ?? company.website,
      });
    }

    throw new WealthPartnerValidationError("Invalid Wealth Partner identity.");
  }

  async updatePartner(id: string, input: UpdateWealthPartnerInput) {
    const organizationId = await this.orgId();
    const updated = await wealthPartnerRegistryRepository.updatePartner(
      organizationId,
      id,
      input,
    );
    if (!updated) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }
    return updated;
  }

  async addNetworkMember(
    partnerId: string,
    input: CreateWealthPartnerNetworkMemberInput,
  ) {
    assertIdentity({
      identityKind: input.identityKind,
      contactId: input.childContactId,
      companyId: input.childCompanyId,
    });
    const organizationId = await this.orgId();
    const partner = await wealthPartnerRegistryRepository.getById(
      organizationId,
      partnerId,
    );
    if (!partner) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }
    return wealthPartnerRegistryRepository.addNetworkMember(
      organizationId,
      partnerId,
      input,
    );
  }

  async createCommission(
    partnerId: string,
    input: CreateWealthPartnerCommissionInput,
  ) {
    const organizationId = await this.orgId();
    const partner = await wealthPartnerRegistryRepository.getById(
      organizationId,
      partnerId,
    );
    if (!partner) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }
    if (!input.label?.trim()) {
      throw new WealthPartnerValidationError("Commission label is required.");
    }
    return wealthPartnerRegistryRepository.createCommission(
      organizationId,
      partnerId,
      partner.code,
      input,
    );
  }

  async createBankAccount(
    partnerId: string,
    input: CreateWealthPartnerBankAccountInput,
  ) {
    const organizationId = await this.orgId();
    const partner = await wealthPartnerRegistryRepository.getById(
      organizationId,
      partnerId,
    );
    if (!partner) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }
    if (!input.accountName?.trim() || !input.bankName?.trim() || !input.accountNumber?.trim() || !input.ifsc?.trim()) {
      throw new WealthPartnerValidationError(
        "Account name, bank name, account number, and IFSC are required.",
      );
    }
    return wealthPartnerRegistryRepository.createBankAccount(
      organizationId,
      partnerId,
      input,
    );
  }

  /**
   * Read-only Business Sourcing KPIs. Never mutates Opportunity or Deal rows.
   */
  async getBusinessSourcing(
    partnerId: string,
  ): Promise<WealthPartnerBusinessSourcingKpis> {
    const organizationId = await this.orgId();
    const partner = await wealthPartnerRegistryRepository.getById(
      organizationId,
      partnerId,
    );
    if (!partner) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }

    const opportunityWhere =
      partner.identityKind === "contact" && partner.contactId
        ? {
            organizationId,
            isDeleted: false,
            sourceContactId: partner.contactId,
          }
        : partner.identityKind === "company" && partner.companyId
          ? {
              organizationId,
              isDeleted: false,
              companyId: partner.companyId,
            }
          : null;

    if (!opportunityWhere) {
      return emptySourcing();
    }

    const opportunities = await prisma.enterpriseOpportunity.findMany({
      where: opportunityWhere,
      select: {
        id: true,
        lifecycleStatus: true,
        fulfilmentStatus: true,
        requestedAmount: true,
        createdAt: true,
      },
    });

    const opportunityIds = opportunities.map((o) => o.id);
    const dealWhere =
      partner.identityKind === "contact" && partner.contactId
        ? {
            organizationId,
            isDeleted: false,
            OR: [
              ...(opportunityIds.length
                ? [{ opportunityId: { in: opportunityIds } }]
                : []),
              { sourceContactId: partner.contactId },
            ],
          }
        : opportunityIds.length
          ? {
              organizationId,
              isDeleted: false,
              opportunityId: { in: opportunityIds },
            }
          : null;

    const deals =
      !dealWhere
        ? []
        : await prisma.enterpriseDeal.findMany({
            where: dealWhere,
            select: {
              id: true,
              grossStage: true,
              requestedAmount: true,
              fulfilledAmount: true,
              expectedRevenue: true,
              revenueReceived: true,
              createdAt: true,
            },
          });

    const wonStages = new Set([
      "disbursed",
      "partially_disbursed",
      "closed",
      "won",
    ]);
    const lostStages = new Set(["lost", "cancelled", "rejected"]);
    const activeStages = new Set([
      "identified",
      "logged_in",
      "login",
      "under_process",
      "soft_approved",
      "final_approved",
      "sanctioned",
      "closure_wip",
    ]);

    let totalDisbursement = 0;
    let revenueGenerated = 0;
    let wonCases = 0;
    let lostCases = 0;
    let activeCases = 0;
    for (const d of deals) {
      const stage = (d.grossStage ?? "").toLowerCase();
      const fulfilled =
        d.fulfilledAmount != null ? Number(d.fulfilledAmount) : 0;
      const revenue =
        d.revenueReceived != null ? Number(d.revenueReceived) : 0;
      if (Number.isFinite(fulfilled)) totalDisbursement += fulfilled;
      if (Number.isFinite(revenue)) revenueGenerated += revenue;
      if (wonStages.has(stage) || fulfilled > 0) wonCases += 1;
      else if (lostStages.has(stage)) lostCases += 1;
      else if (activeStages.has(stage) || stage) activeCases += 1;
    }

    const conversionRatio =
      opportunities.length > 0
        ? Math.round((wonCases / opportunities.length) * 1000) / 10
        : 0;

    const monthMap = new Map<
      string,
      { opportunities: number; deals: number; disbursement: number }
    >();
    for (const o of opportunities) {
      const key = `${o.createdAt.getUTCFullYear()}-${String(o.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(key) ?? {
        opportunities: 0,
        deals: 0,
        disbursement: 0,
      };
      cur.opportunities += 1;
      monthMap.set(key, cur);
    }
    for (const d of deals) {
      const key = `${d.createdAt.getUTCFullYear()}-${String(d.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(key) ?? {
        opportunities: 0,
        deals: 0,
        disbursement: 0,
      };
      cur.deals += 1;
      const fulfilled =
        d.fulfilledAmount != null ? Number(d.fulfilledAmount) : 0;
      if (Number.isFinite(fulfilled)) cur.disbursement += fulfilled;
      monthMap.set(key, cur);
    }

    const monthlyBusinessTrend = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, v]) => ({ month, ...v }));

    return {
      totalOpportunitiesGenerated: opportunities.length,
      totalDealsGenerated: deals.length,
      totalDisbursement,
      revenueGenerated,
      conversionRatio,
      activeCases,
      wonCases,
      lostCases,
      monthlyBusinessTrend,
      definition: WEALTH_PARTNER_BUSINESS_SOURCING_DEFINITION,
    };
  }

  async getWorkspace(partnerId: string): Promise<WealthPartnerWorkspaceBundle> {
    const organizationId = await this.orgId();
    const partner = await wealthPartnerRegistryRepository.getById(
      organizationId,
      partnerId,
    );
    if (!partner) {
      throw new WealthPartnerValidationError("Wealth Partner not found.");
    }

    const [network, commissions, bankAccounts, activities, businessSourcing, docs] =
      await Promise.all([
        wealthPartnerRegistryRepository.listNetwork(organizationId, partnerId),
        wealthPartnerRegistryRepository.listCommissions(organizationId, partnerId),
        wealthPartnerRegistryRepository.listBankAccounts(organizationId, partnerId),
        wealthPartnerRegistryRepository.listActivities(organizationId, partnerId),
        this.getBusinessSourcing(partnerId),
        prisma.enterpriseTransactionDocument.findMany({
          where: {
            organizationId,
            ...(partner.contactId
              ? { contactId: partner.contactId }
              : partner.companyId
                ? { customerId: partner.companyId }
                : { id: "__none__" }),
            status: { not: "deleted" },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            displayName: true,
            categoryLabel: true,
            typeRef: true,
            status: true,
            originalFilename: true,
            createdAt: true,
          },
        }).catch(() => []),
      ]);

    return {
      partner,
      network,
      commissions,
      bankAccounts,
      activities,
      businessSourcing,
      documents: {
        identityKind: partner.identityKind,
        contactId: partner.contactId,
        companyId: partner.companyId,
        note: WEALTH_PARTNER_DOCUMENTS_NOTE,
        items: docs.map((d) => ({
          id: d.id,
          displayName: d.displayName,
          categoryLabel: d.categoryLabel,
          typeRef: d.typeRef,
          status: d.status,
          originalFilename: d.originalFilename,
          createdAt: d.createdAt.toISOString(),
        })),
      },
    };
  }
}

function emptySourcing(): WealthPartnerBusinessSourcingKpis {
  return {
    totalOpportunitiesGenerated: 0,
    totalDealsGenerated: 0,
    totalDisbursement: 0,
    revenueGenerated: 0,
    conversionRatio: 0,
    activeCases: 0,
    wonCases: 0,
    lostCases: 0,
    monthlyBusinessTrend: [],
    definition: WEALTH_PARTNER_BUSINESS_SOURCING_DEFINITION,
  };
}

export const wealthPartnerRegistryService = new WealthPartnerRegistryService();
