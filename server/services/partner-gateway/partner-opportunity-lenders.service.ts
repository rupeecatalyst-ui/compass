/**
 * CO-WP-REC-002 — Partner lender selection via Enterprise Deal Registry.
 * No Wealth Partner-only lender table. One lender = one Deal (CO-ARCH-007).
 */
import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseAvailable } from "@server/lib/prisma";
import {
  PartnerGatewayError,
  resolvePartnerBindingForUser,
} from "@server/services/partner-gateway/partner-binding.service";
import { partnerEntitlementsService } from "@server/services/partner-entitlements";
import { partnerOwnershipService } from "@server/services/partner-gateway/partner-ownership.service";
import { partnerLenderMasterService } from "@server/services/partner-gateway/partner-lender-master.service";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import type {
  PartnerLenderProjectionDto,
  PartnerLenderSelectionSource,
  PartnerSelectedLenderDto,
} from "@/types/enterprise-partner-business";

const DTO_NOTICE =
  "Selected lenders persist as Enterprise Deals. Catalyst Connect does not own a lender master.";

type SnapshotSelection = {
  source: PartnerLenderSelectionSource | null;
  selectedAt: string | null;
  reason: string | null;
};

function parseAmount(value: { toString(): string } | null | undefined): number | null {
  if (!value) return null;
  const n = Number(value.toString());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readSelection(snapshot: unknown): SnapshotSelection {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { source: null, selectedAt: null, reason: null };
  }
  const raw = (snapshot as Record<string, unknown>).partnerLenderSelection;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { source: null, selectedAt: null, reason: null };
  }
  const row = raw as Record<string, unknown>;
  const sourceRaw = String(row.source ?? "").trim().toLowerCase();
  const source: PartnerLenderSelectionSource | null =
    sourceRaw === "saarthi" || sourceRaw === "manual" ? sourceRaw : null;
  const selectedAt = typeof row.selectedAt === "string" ? row.selectedAt : null;
  const reason = typeof row.reason === "string" && row.reason.trim() ? row.reason.trim() : null;
  return { source, selectedAt, reason };
}

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

export async function listProjectedLendersForOpportunity(
  organizationId: string,
  opportunityId: string,
): Promise<PartnerLenderProjectionDto[]> {
  const rows = await listSelectedRows(organizationId, opportunityId);
  return rows.map((row) => ({
    lenderId: row.lenderId,
    lenderLabel: row.displayName,
    statusLabel: row.stageLabel,
    offerLabel: null,
    dtoSource: "enterprise_deal_registry",
    dtoNotice: DTO_NOTICE,
    dealId: row.dealId,
    selectionSource: row.selectionSource,
    selectedAt: row.selectedAt,
    partnerReason: row.reason,
  }));
}

async function listSelectedRows(
  organizationId: string,
  opportunityId: string,
): Promise<PartnerSelectedLenderDto[]> {
  if (!isDatabaseAvailable()) return [];
  const deals = await prisma.enterpriseDeal.findMany({
    where: {
      organizationId,
      opportunityId,
      isDeleted: false,
      lenderId: { not: null },
    },
    orderBy: [{ createdAt: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      dealNumber: true,
      lenderId: true,
      primaryCounterpartyName: true,
      grossStage: true,
      snapshot: true,
      createdAt: true,
    },
  });

  const out: PartnerSelectedLenderDto[] = [];
  const seen = new Set<string>();
  for (const deal of deals) {
    const lenderId = (deal.lenderId || "").trim();
    if (!lenderId || seen.has(lenderId)) continue;
    seen.add(lenderId);
    const hit = await partnerLenderMasterService.getPartnerVisibleLenderById(lenderId);
    const displayName =
      hit?.displayName ||
      (deal.primaryCounterpartyName || "").trim() ||
      lenderId;
    const selection = readSelection(deal.snapshot);
    out.push({
      lenderId,
      displayName,
      dealId: deal.id,
      dealNumber: deal.dealNumber,
      stageLabel: deal.grossStage,
      selectionSource: selection.source,
      selectedAt: selection.selectedAt || deal.createdAt.toISOString(),
      reason: selection.reason,
      dtoSource: "enterprise_deal_registry",
    });
  }
  return out;
}

export const partnerOpportunityLendersService = {
  async listSelected(userId: string, opportunityId: string): Promise<{
    opportunityId: string;
    lenders: PartnerSelectedLenderDto[];
  }> {
    const ctx = await partnerCtx(userId);
    const owned = await partnerOwnershipService.requireOwnedOpportunity({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
      opportunityRef: opportunityId,
    });
    await partnerEntitlementsService.assertEntitlement({
      wealthPartnerId: ctx.partnerId,
      organizationId: ctx.organizationId,
      action: "view",
      entityKind: "opportunity",
      entityId: owned.id,
    });
    const lenders = await listSelectedRows(owned.organizationId, owned.id);
    return { opportunityId: owned.id, lenders };
  },

  async selectLender(
    userId: string,
    opportunityId: string,
    input: {
      lenderId?: string;
      source?: string;
      reason?: string;
    },
  ): Promise<{
    opportunityId: string;
    lender: PartnerSelectedLenderDto;
    lenders: PartnerSelectedLenderDto[];
  }> {
    const ctx = await partnerCtx(userId);
    const owned = await partnerOwnershipService.requireOwnedOpportunity({
      organizationId: ctx.organizationId,
      wealthPartnerId: ctx.partnerId,
      opportunityRef: opportunityId,
    });
    await partnerEntitlementsService.assertEntitlement({
      wealthPartnerId: ctx.partnerId,
      organizationId: ctx.organizationId,
      action: "create",
      entityKind: "opportunity",
      entityId: owned.id,
    });

    const lenderId = String(input.lenderId ?? "").trim();
    if (!lenderId) {
      throw new PartnerGatewayError(
        "lenderId is required. Select a lender from the Enterprise Lender Registry.",
        "VALIDATION",
        400,
      );
    }
    const sourceRaw = String(input.source ?? "").trim().toLowerCase();
    if (sourceRaw !== "saarthi" && sourceRaw !== "manual") {
      throw new PartnerGatewayError(
        "source must be saarthi or manual",
        "VALIDATION",
        400,
      );
    }
    const source: PartnerLenderSelectionSource = sourceRaw;
    const reason = String(input.reason ?? "").trim() || null;

    const hit = await partnerLenderMasterService.getPartnerVisibleLenderById(lenderId);
    if (!hit) {
      throw new PartnerGatewayError(
        "Lender is not available in the Enterprise Lender Registry for this partner.",
        "LENDER_NOT_AVAILABLE",
        400,
      );
    }

    const snapshot: Prisma.InputJsonValue = {
      primaryContact: {
        id: owned.primaryContactId ?? null,
        name: owned.primaryContactName ?? null,
        mobile: owned.primaryContactMobile ?? null,
        email: null,
      },
      company: { id: null, name: owned.companyName ?? null },
      primaryBorrowerKind: owned.companyName ? "company" : "individual",
      companyName: owned.companyName ?? null,
      product: {
        id: null,
        code: owned.productCode ?? null,
        label: owned.productLabel ?? null,
        family: "lending",
        transactionType: null,
      },
      stage: {
        grossStage: "identified",
        subStage: null,
        lifecyclePhase: null,
      },
      partnerLenderSelection: {
        source,
        selectedByUserId: ctx.userId,
        selectedByPartnerId: ctx.partnerId,
        selectedByName: ctx.userDisplayName,
        selectedAt: new Date().toISOString(),
        reason,
      },
    };

    const before = await listSelectedRows(owned.organizationId, owned.id);
    const already = before.find((row) => row.lenderId === lenderId);

    const deal = await enterpriseDealService.createDeal(
      {
        opportunityId: owned.id,
        lenderId: hit.id,
        productFamily: "lending",
        grossStage: "identified",
        productCode: owned.productCode,
        productLabel: owned.productLabel,
        primaryContactId: owned.primaryContactId,
        primaryContactName: owned.primaryContactName,
        primaryContactMobile: owned.primaryContactMobile,
        requestedAmount: parseAmount(owned.requestedAmount),
        primaryCounterpartyName: hit.displayName,
        snapshot,
      },
      ctx.userId,
    );

    const lenders = await listSelectedRows(owned.organizationId, owned.id);
    const lender =
      lenders.find((row) => row.lenderId === hit.id) ??
      already ?? {
        lenderId: hit.id,
        displayName: hit.displayName,
        dealId: deal.id,
        dealNumber: deal.dealNumber,
        stageLabel: deal.grossStage,
        selectionSource: source,
        selectedAt: new Date().toISOString(),
        reason,
        dtoSource: "enterprise_deal_registry" as const,
      };

    return {
      opportunityId: owned.id,
      lender: { ...lender, alreadySelected: Boolean(already) },
      lenders,
    };
  },
};
