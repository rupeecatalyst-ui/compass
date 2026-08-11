/**
 * CO-WP-ACCESS-001A — Partner Deal Gateway surface (Registry ownership + entitlements).
 */
import { partnerEntitlementsService } from "@server/services/partner-entitlements";
import {
  resolvePartnerBindingForUser,
  PartnerGatewayError,
} from "@server/services/partner-gateway/partner-binding.service";
import { partnerOwnershipService } from "@server/services/partner-gateway/partner-ownership.service";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import { enterpriseBusinessNotesService } from "@server/services/enterprise-business-notes/enterprise-business-notes.service";
import type { PartnerEntitlementAction } from "@/constants/enterprise-partner-entitlements";
import type { PartnerEffectiveEntitlements } from "@/types/enterprise-partner-entitlements";

export type PartnerDealSummaryDto = {
  dealId: string;
  dealNumber: string;
  opportunityId: string;
  opportunityNumber: string;
  lenderLabel: string;
  productLabel: string | null;
  stageLabel: string;
  lifecycleStatus: string;
  amountLabel: string | null;
  updatedAt: string;
};

export type PartnerDealDetailDto = PartnerDealSummaryDto & {
  productFamily: string;
  rowVersion: number;
  customerDisplayName: string | null;
  executionMode: string;
  entitlements: {
    executionMode: string;
    source: string;
    permissions: PartnerEffectiveEntitlements["permissions"];
    modules: PartnerEffectiveEntitlements["modules"];
  };
  activities: Array<{
    activityId: string;
    title: string;
    body: string;
    occurredAt: string;
    authorLabel: string;
  }>;
};

async function partnerCtx(userId: string) {
  const binding = await resolvePartnerBindingForUser(userId);
  return {
    userId: binding.user.id,
    userDisplayName:
      `${binding.user.firstName} ${binding.user.lastName}`.trim() || binding.user.email,
    partnerId: binding.partner.id,
    partnerDisplayName: binding.partner.displayName,
    organizationId: binding.partner.organizationId,
  };
}

async function assertAction(
  ctx: Awaited<ReturnType<typeof partnerCtx>>,
  action: PartnerEntitlementAction,
  entity?: { entityKind: "opportunity" | "deal"; entityId: string },
) {
  return partnerEntitlementsService.assertEntitlement({
    wealthPartnerId: ctx.partnerId,
    organizationId: ctx.organizationId,
    action,
    entityKind: entity?.entityKind ?? null,
    entityId: entity?.entityId ?? null,
  });
}

function amountLabel(value: { toString(): string } | null | undefined) {
  if (!value) return null;
  const n = Number(value.toString());
  if (!Number.isFinite(n)) return value.toString();
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export const partnerDealService = {
  async listDeals(userId: string): Promise<PartnerDealSummaryDto[]> {
    const ctx = await partnerCtx(userId);
    await assertAction(ctx, "view");
    const rows = await partnerOwnershipService.listOwnedDeals({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
    });
    return rows.map((d) => ({
      dealId: d.id,
      dealNumber: d.dealNumber,
      opportunityId: d.opportunityId ?? "",
      opportunityNumber: d.opportunityNumber,
      lenderLabel: d.primaryCounterpartyName || d.lenderId || "Lender",
      productLabel: d.productLabel,
      stageLabel: d.grossStage,
      lifecycleStatus: d.lifecycleStatus,
      amountLabel: amountLabel(d.requestedAmount),
      updatedAt: d.updatedAt.toISOString(),
    }));
  },

  async getDeal(userId: string, dealId: string): Promise<PartnerDealDetailDto> {
    const ctx = await partnerCtx(userId);
    const { deal, opportunity } = await partnerOwnershipService.requireOwnedDeal({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
      dealId,
    });
    const entitlements = await assertAction(ctx, "view", {
      entityKind: "deal",
      entityId: deal.id,
    });

    const notes = await listNotesFallback(deal.id, opportunity.id);

    return {
      dealId: deal.id,
      dealNumber: deal.dealNumber,
      opportunityId: opportunity.id,
      opportunityNumber: opportunity.opportunityNumber,
      lenderLabel: deal.primaryCounterpartyName || deal.lenderId || "Lender",
      productLabel: deal.productLabel,
      stageLabel: deal.grossStage,
      lifecycleStatus: deal.lifecycleStatus,
      amountLabel: amountLabel(deal.requestedAmount),
      updatedAt: deal.updatedAt.toISOString(),
      productFamily: deal.productFamily,
      rowVersion: deal.rowVersion,
      customerDisplayName:
        opportunity.primaryContactName || opportunity.companyName || null,
      executionMode: entitlements.executionMode,
      entitlements: {
        executionMode: entitlements.executionMode,
        source: entitlements.source,
        permissions: entitlements.permissions,
        modules: entitlements.modules,
      },
      activities: notes,
    };
  },

  async patchDeal(
    userId: string,
    dealId: string,
    input: {
      productLabel?: string;
      notes?: string;
      rowVersion: number;
    },
  ): Promise<PartnerDealDetailDto> {
    const ctx = await partnerCtx(userId);
    const { deal } = await partnerOwnershipService.requireOwnedDeal({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
      dealId,
    });
    await assertAction(ctx, "edit", { entityKind: "deal", entityId: deal.id });

    await enterpriseDealService.updateDeal(deal.id, {
      rowVersion: input.rowVersion,
      actorUserId: ctx.userId,
      productLabel: input.productLabel,
    });

    if (input.notes?.trim()) {
      await this.addActivity(userId, deal.id, {
        body: input.notes.trim(),
        title: "Deal note",
      });
    }

    return this.getDeal(userId, deal.id);
  },

  async changeStage(
    userId: string,
    dealId: string,
    input: { toGrossStage: string; rowVersion: number; reason?: string },
  ): Promise<PartnerDealDetailDto> {
    const ctx = await partnerCtx(userId);
    const { deal } = await partnerOwnershipService.requireOwnedDeal({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
      dealId,
    });
    await assertAction(ctx, "stage_change", { entityKind: "deal", entityId: deal.id });

    if (!input.toGrossStage?.trim()) {
      throw new PartnerGatewayError("toGrossStage is required", "VALIDATION", 400);
    }

    await enterpriseDealService.transitionDeal(deal.id, {
      rowVersion: input.rowVersion,
      actorUserId: ctx.userId,
      toGrossStage: input.toGrossStage.trim(),
      reason: input.reason ?? "Partner stage change",
    });

    return this.getDeal(userId, deal.id);
  },

  async addActivity(
    userId: string,
    dealId: string,
    input: { title?: string; body: string },
  ): Promise<PartnerDealDetailDto> {
    const ctx = await partnerCtx(userId);
    const { deal, opportunity } = await partnerOwnershipService.requireOwnedDeal({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
      dealId,
    });
    await assertAction(ctx, "activity_add", { entityKind: "deal", entityId: deal.id });

    const body = (input.body || "").trim();
    if (!body) {
      throw new PartnerGatewayError("Activity body is required", "VALIDATION", 400);
    }

    const note = await enterpriseBusinessNotesService.create(
      {
        body: `${body}\n— Partner ${ctx.partnerDisplayName} (${ctx.partnerId})`,
        category: "general",
        workspaceKind: "deal",
        entityKind: "deal",
        entityId: deal.id,
        opportunityId: opportunity.id,
        dealId: deal.id,
        contactId: opportunity.primaryContactId,
      },
      { userId: ctx.userId, displayName: ctx.userDisplayName },
    );

    // CO-WP-ACCESS-002: fail closed — never report success without Activity SSOT write.
    if (!note) {
      throw new PartnerGatewayError(
        enterpriseBusinessNotesService.isDurable()
          ? "Failed to persist activity to Enterprise Business Notes"
          : "Partner Activity requires ENTERPRISE_PERSISTENCE_MODE=prisma",
        "PERSISTENCE_FAILED",
        enterpriseBusinessNotesService.isDurable() ? 500 : 503,
      );
    }

    return this.getDeal(userId, deal.id);
  },

  async listActivities(userId: string, dealId: string) {
    const detail = await this.getDeal(userId, dealId);
    return detail.activities;
  },
};

async function listNotesFallback(dealId: string, opportunityId: string) {
  try {
    const { prisma, isDatabaseAvailable } = await import("@server/lib/prisma");
    if (!isDatabaseAvailable()) return [];
    const { isPartnerVisibleNote } = await import(
      "@server/services/partner-gateway/partner-ssot-projections"
    );
    const rows = await prisma.enterpriseBusinessNote.findMany({
      where: {
        isDeleted: false,
        OR: [
          { dealId },
          { entityKind: "deal", entityId: dealId },
          { opportunityId, entityKind: "opportunity" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        body: true,
        createdAt: true,
        createdByName: true,
        category: true,
      },
    });
    return rows
      .filter((r) => isPartnerVisibleNote(r.category))
      .map((r) => ({
        activityId: r.id,
        title: r.category || "Notepad",
        body: r.body,
        occurredAt: r.createdAt.toISOString(),
        authorLabel: r.createdByName || "Partner",
      }));
  } catch {
    return [];
  }
}
