/**
 * CO-WP-ACCESS-001A — Partner ownership via Opportunity / Deal Registry.
 * Authorization path: Registry sourceWealthPartnerId → Partner identity (not placeholder store).
 */
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import { PartnerGatewayError } from "@server/services/partner-gateway/partner-binding.service";

export type OwnedOpportunityRow = {
  id: string;
  organizationId: string;
  opportunityNumber: string;
  sourceWealthPartnerId: string | null;
  productLabel: string | null;
  productCode: string | null;
  primaryContactId: string | null;
  primaryContactName: string | null;
  primaryContactMobile: string | null;
  companyName: string | null;
  requestedAmount: { toString(): string } | null;
  requirementStage: string;
  lifecycleStatus: string;
  participationRole: string | null;
  updatedAt: Date;
  createdAt: Date;
};

export type OwnedDealRow = {
  id: string;
  organizationId: string;
  opportunityId: string | null;
  dealNumber: string;
  lenderId: string | null;
  primaryCounterpartyName: string | null;
  productLabel: string | null;
  requestedAmount: { toString(): string } | null;
  grossStage: string;
  lifecycleStatus: string;
  productFamily: string;
  rowVersion: number;
  updatedAt: Date;
  createdAt: Date;
};

function assertDb() {
  if (!isDatabaseAvailable()) {
    throw new PartnerGatewayError(
      "Enterprise services are currently unavailable.",
      "ENTERPRISE_UNAVAILABLE",
      503,
    );
  }
}

const oppSelect = {
  id: true,
  organizationId: true,
  opportunityNumber: true,
  sourceWealthPartnerId: true,
  productLabel: true,
  productCode: true,
  primaryContactId: true,
  primaryContactName: true,
  primaryContactMobile: true,
  companyName: true,
  requestedAmount: true,
  requirementStage: true,
  lifecycleStatus: true,
  participationRole: true,
  updatedAt: true,
  createdAt: true,
} as const;

const dealSelect = {
  id: true,
  organizationId: true,
  opportunityId: true,
  dealNumber: true,
  lenderId: true,
  primaryCounterpartyName: true,
  productLabel: true,
  requestedAmount: true,
  grossStage: true,
  lifecycleStatus: true,
  productFamily: true,
  rowVersion: true,
  updatedAt: true,
  createdAt: true,
} as const;

export const partnerOwnershipService = {
  /**
   * Resolve Opportunity owned by this Wealth Partner (canonical SSOT).
   * Accepts Opportunity id or opportunityNumber.
   */
  async requireOwnedOpportunity(input: {
    organizationId: string;
    wealthPartnerId: string;
    opportunityRef: string;
  }): Promise<OwnedOpportunityRow> {
    assertDb();
    const ref = decodeURIComponent(input.opportunityRef || "").trim();
    if (!ref) {
      throw new PartnerGatewayError("Opportunity id is required", "VALIDATION", 400);
    }

    const row = await prisma.enterpriseOpportunity.findFirst({
      where: {
        organizationId: input.organizationId,
        isDeleted: false,
        sourceWealthPartnerId: input.wealthPartnerId,
        OR: [{ id: ref }, { opportunityNumber: ref }],
      },
      select: oppSelect,
    });

    if (!row || row.sourceWealthPartnerId !== input.wealthPartnerId) {
      throw new PartnerGatewayError(
        "Opportunity not found or access denied",
        "FORBIDDEN",
        403,
      );
    }
    return row;
  },

  async listOwnedOpportunities(input: {
    organizationId: string;
    wealthPartnerId: string;
    limit?: number;
  }): Promise<OwnedOpportunityRow[]> {
    assertDb();
    return prisma.enterpriseOpportunity.findMany({
      where: {
        organizationId: input.organizationId,
        isDeleted: false,
        sourceWealthPartnerId: input.wealthPartnerId,
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(input.limit ?? 100, 200),
      select: oppSelect,
    });
  },

  /**
   * Deal ownership = Deal → Opportunity.sourceWealthPartnerId === partner.
   */
  async requireOwnedDeal(input: {
    organizationId: string;
    wealthPartnerId: string;
    dealId: string;
  }): Promise<{ deal: OwnedDealRow; opportunity: OwnedOpportunityRow }> {
    assertDb();
    const dealId = decodeURIComponent(input.dealId || "").trim();
    if (!dealId) {
      throw new PartnerGatewayError("Deal id is required", "VALIDATION", 400);
    }

    const deal = await prisma.enterpriseDeal.findFirst({
      where: {
        id: dealId,
        organizationId: input.organizationId,
        isDeleted: false,
      },
      select: dealSelect,
    });

    if (!deal?.opportunityId) {
      throw new PartnerGatewayError("Deal not found or access denied", "FORBIDDEN", 403);
    }

    const opportunity = await this.requireOwnedOpportunity({
      organizationId: input.organizationId,
      wealthPartnerId: input.wealthPartnerId,
      opportunityRef: deal.opportunityId,
    });

    return { deal, opportunity };
  },

  async listOwnedDeals(input: {
    organizationId: string;
    wealthPartnerId: string;
    limit?: number;
  }): Promise<Array<OwnedDealRow & { opportunityNumber: string }>> {
    assertDb();
    const opps = await this.listOwnedOpportunities({
      organizationId: input.organizationId,
      wealthPartnerId: input.wealthPartnerId,
      limit: 200,
    });
    if (opps.length === 0) return [];
    const oppIds = opps.map((o) => o.id);
    const oppNumberById = new Map(opps.map((o) => [o.id, o.opportunityNumber]));

    const deals = await prisma.enterpriseDeal.findMany({
      where: {
        organizationId: input.organizationId,
        isDeleted: false,
        opportunityId: { in: oppIds },
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(input.limit ?? 100, 200),
      select: dealSelect,
    });

    return deals.map((d) => ({
      ...d,
      opportunityNumber: d.opportunityId
        ? (oppNumberById.get(d.opportunityId) ?? "")
        : "",
    }));
  },

  /**
   * CO-WP-INT-002 — Customer ownership = ECM contact linked as primaryContactId
   * on at least one Opportunity sourced by this Wealth Partner.
   */
  async requireOwnedCustomer(input: {
    organizationId: string;
    wealthPartnerId: string;
    customerId: string;
  }): Promise<{ customerId: string; opportunityIds: string[] }> {
    assertDb();
    const customerId = decodeURIComponent(input.customerId || "").trim();
    if (!customerId) {
      throw new PartnerGatewayError("Customer id is required", "VALIDATION", 400);
    }

    const rows = await prisma.enterpriseOpportunity.findMany({
      where: {
        organizationId: input.organizationId,
        isDeleted: false,
        sourceWealthPartnerId: input.wealthPartnerId,
        primaryContactId: customerId,
      },
      select: { id: true },
      take: 200,
    });

    if (rows.length === 0) {
      throw new PartnerGatewayError(
        "Customer not found or access denied",
        "FORBIDDEN",
        403,
      );
    }

    return { customerId, opportunityIds: rows.map((r) => r.id) };
  },

  async listOwnedCustomerIds(input: {
    organizationId: string;
    wealthPartnerId: string;
    limit?: number;
  }): Promise<
    Array<{
      customerId: string;
      displayName: string | null;
      mobile: string | null;
      city: string | null;
      opportunityCount: number;
      activeOpportunityCount: number;
      lastUpdatedAt: Date;
    }>
  > {
    assertDb();
    const opps = await prisma.enterpriseOpportunity.findMany({
      where: {
        organizationId: input.organizationId,
        isDeleted: false,
        sourceWealthPartnerId: input.wealthPartnerId,
        primaryContactId: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(input.limit ?? 300, 500),
      select: {
        primaryContactId: true,
        primaryContactName: true,
        primaryContactMobile: true,
        cityLabel: true,
        lifecycleStatus: true,
        updatedAt: true,
      },
    });

    const byId = new Map<
      string,
      {
        customerId: string;
        displayName: string | null;
        mobile: string | null;
        city: string | null;
        opportunityCount: number;
        activeOpportunityCount: number;
        lastUpdatedAt: Date;
      }
    >();

    for (const o of opps) {
      const id = o.primaryContactId;
      if (!id) continue;
      const closed = ["won", "lost", "disbursed", "closed", "cancelled"].includes(
        (o.lifecycleStatus || "").toLowerCase(),
      );
      const prev = byId.get(id);
      if (!prev) {
        byId.set(id, {
          customerId: id,
          displayName: o.primaryContactName,
          mobile: o.primaryContactMobile,
          city: o.cityLabel,
          opportunityCount: 1,
          activeOpportunityCount: closed ? 0 : 1,
          lastUpdatedAt: o.updatedAt,
        });
      } else {
        prev.opportunityCount += 1;
        if (!closed) prev.activeOpportunityCount += 1;
        if (o.updatedAt > prev.lastUpdatedAt) {
          prev.lastUpdatedAt = o.updatedAt;
          prev.displayName = o.primaryContactName || prev.displayName;
          prev.mobile = o.primaryContactMobile || prev.mobile;
          prev.city = o.cityLabel || prev.city;
        }
      }
    }

    return [...byId.values()].sort(
      (a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime(),
    );
  },
};
